import { Router, Request, Response } from 'express';
import { db } from '../db/index.ts';
import { users, auditLogs, studentMasterlist, examRequests } from '../db/schema.ts';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateCustomToken, requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [user] = await db.select().from(users).where(
      or(eq(users.email, email.trim().toLowerCase()), eq(users.studentId, email.trim()))
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/student ID or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact administrator.' });
    }

    // Verify password if passwordHash exists
    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    const token = generateCustomToken({
      id: user.id,
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    // Record audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'USER_LOGIN',
      details: `User ${user.fullName} (${user.role}) logged in successfully.`,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        majorSubject: user.majorSubject,
        yearLevel: user.yearLevel,
        contactNumber: user.contactNumber,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to process login request' });
  }
});

// Examinee Passwordless Login via Student ID
router.post('/examinee-login', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;

    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      return res.status(400).json({ error: 'Student ID Number is required.' });
    }

    const cleanStudentId = studentId.trim().toUpperCase();

    // Enforce official format: SLPD-YYYY-COL-NNNN
    const formatValid = /^SLPD-\d{4}-COL-\d{4}$/.test(cleanStudentId);
    if (!formatValid) {
      return res.status(400).json({
        error: `Student ID "${cleanStudentId}" is invalid. It must follow the official format: SLPD-YYYY-COL-NNNN (e.g., SLPD-2024-COL-0190).`,
      });
    }

    // 1. Verify against official student masterlist
    const allMaster = await db.select().from(studentMasterlist);
    const verifiedStudent = allMaster.find(m => m.studentId.trim().toUpperCase() === cleanStudentId);

    if (!verifiedStudent) {
      return res.status(404).json({
        error: `Student ID "${cleanStudentId}" was not found in the official SLTCFPDI student masterlist. Access is restricted to graduating examinees uploaded by Faculty or Admin.`,
      });
    }

    const resolvedFullName = `${verifiedStudent.firstName} ${verifiedStudent.middleName ? verifiedStudent.middleName + ' ' : ''}${verifiedStudent.lastName}`;

    // 2. Find or auto-provision examinee account
    const allUsers = await db.select().from(users);
    let user = allUsers.find(u => u.studentId && u.studentId.trim().toUpperCase() === cleanStudentId);

    if (!user) {
      // Auto-provision examinee account based on verified masterlist record
      const uid = `sltc_student_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const safeIdNum = cleanStudentId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const studentEmail = `${safeIdNum}@student.sltcfpdi.edu.ph`;

      try {
        const [newUser] = await db.insert(users).values({
          uid,
          email: studentEmail,
          passwordHash: null,
          fullName: resolvedFullName,
          role: 'EXAMINEE',
          studentId: cleanStudentId,
          department: 'College of Education',
          majorSubject: verifiedStudent.course || 'General Education',
          yearLevel: verifiedStudent.yearGraduated ? `Batch ${verifiedStudent.yearGraduated}` : '4th Year',
          contactNumber: '',
        }).returning();
        user = newUser;
      } catch (insertErr: any) {
        // Handle concurrent insert safely
        const [refound] = await db.select().from(users).where(eq(users.studentId, cleanStudentId));
        user = refound;
      }
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to initialize examinee account record.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'This examinee account has been deactivated. Please contact the administrator.' });
    }

    // 3. Check MockLET Examination Clearance Request
    const userRequests = await db.select().from(examRequests).where(eq(examRequests.userId, user.id)).orderBy(desc(examRequests.requestedAt));
    let latestRequest = userRequests[0];

    // If no request exists yet, auto-create initial clearance request in PENDING state
    if (!latestRequest) {
      const [newReq] = await db.insert(examRequests).values({
        userId: user.id,
        studentId: cleanStudentId,
        status: 'PENDING',
        requestNotes: 'Official request to take SLTCFPDI MockLET Examination.',
      }).returning();
      latestRequest = newReq;
    }

    const isApproved = userRequests.some(r => r.status === 'APPROVED') || latestRequest.status === 'APPROVED';

    // 4A. If Approved: Issue token and authenticate examinee session immediately
    if (isApproved) {
      const token = generateCustomToken({
        id: user.id,
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });

      await db.insert(auditLogs).values({
        userId: user.id,
        action: 'EXAMINEE_LOGIN_APPROVED',
        details: `Examinee ${user.fullName} (${cleanStudentId}) accessed examination portal. Approval confirmed.`,
      });

      return res.json({
        approved: true,
        status: 'APPROVED',
        token,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          studentId: user.studentId,
          department: user.department,
          majorSubject: user.majorSubject,
          yearLevel: user.yearLevel,
          contactNumber: user.contactNumber,
        },
        student: {
          studentId: cleanStudentId,
          fullName: resolvedFullName,
          course: verifiedStudent.course,
          yearGraduated: verifiedStudent.yearGraduated,
        },
        message: 'Approval confirmed. Directing you to your exam portal...',
      });
    }

    // 4B. If Declined: Return declined status and Admin's review notes
    if (latestRequest.status === 'DECLINED') {
      return res.json({
        approved: false,
        status: 'DECLINED',
        student: {
          studentId: cleanStudentId,
          fullName: resolvedFullName,
          course: verifiedStudent.course,
          yearGraduated: verifiedStudent.yearGraduated,
        },
        reviewNotes: latestRequest.reviewNotes || 'Clearance was declined by Administrator. Please contact your department head.',
        reviewedAt: latestRequest.reviewedAt,
        message: 'Your MockLET examination clearance request was declined by the Administrator.',
      });
    }

    // 4C. If Pending: Return pending status with informative wait message
    return res.json({
      approved: false,
      status: 'PENDING',
      student: {
        studentId: cleanStudentId,
        fullName: resolvedFullName,
        course: verifiedStudent.course,
        yearGraduated: verifiedStudent.yearGraduated,
      },
      requestedAt: latestRequest.requestedAt,
      message: 'Your examination clearance request is currently under review by the Administrator. Please wait for the approval of the Admin before you are directed to the exam page or your account.',
    });
  } catch (error: any) {
    console.error('Examinee login error:', error);
    return res.status(500).json({ error: 'Failed to process examinee login request' });
  }
});

// Examinee Re-submit Clearance Request
router.post('/examinee-re-request', async (req: Request, res: Response) => {
  try {
    const { studentId, requestNotes } = req.body;
    if (!studentId) return res.status(400).json({ error: 'Student ID is required' });

    const cleanId = studentId.trim().toUpperCase();
    const [user] = await db.select().from(users).where(eq(users.studentId, cleanId));

    if (!user) {
      return res.status(404).json({ error: 'Examinee account not found for this Student ID' });
    }

    const [newReq] = await db.insert(examRequests).values({
      userId: user.id,
      studentId: cleanId,
      status: 'PENDING',
      requestNotes: requestNotes || 'Re-submitted request to take MockLET examination.',
    }).returning();

    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'EXAMINEE_CLEARANCE_RE_REQUESTED',
      details: `Examinee ${user.fullName} (${cleanId}) re-submitted clearance request for Admin review.`,
    });

    return res.json({
      success: true,
      status: 'PENDING',
      requestedAt: newReq.requestedAt,
      message: 'Your clearance request has been re-submitted. Please wait for Admin approval.',
    });
  } catch (error: any) {
    console.error('Re-request error:', error);
    return res.status(500).json({ error: 'Failed to re-submit clearance request' });
  }
});

// Student Registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, studentId, department, majorSubject, yearLevel, contactNumber } = req.body;

    if (!email || !password || !studentId) {
      return res.status(400).json({ error: 'Email, password, and student ID are required' });
    }

    const cleanStudentId = studentId.trim().toUpperCase();

    // Enforce official format: SLPD-YYYY-COL-NNNN
    const formatValid = /^SLPD-\d{4}-COL-\d{4}$/.test(cleanStudentId);
    if (!formatValid) {
      return res.status(400).json({
        error: `Student ID "${cleanStudentId}" is invalid. It must follow the official format: SLPD-YYYY-COL-NNNN (e.g., SLPD-2024-COL-0190).`,
      });
    }

    // Verify against official student masterlist
    const allMaster = await db.select().from(studentMasterlist);
    const verifiedStudent = allMaster.find(m => m.studentId.trim().toUpperCase() === cleanStudentId);

    if (!verifiedStudent) {
      return res.status(403).json({
        error: `Student ID "${cleanStudentId}" was not found in the official SLTCFPDI student masterlist. You must be on the official graduating examinee list uploaded by Faculty or Admin to register.`,
      });
    }

    const existing = await db.select().from(users).where(
      or(eq(users.email, email.trim().toLowerCase()), eq(users.studentId, cleanStudentId))
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: `An examinee account with Student ID (${cleanStudentId}) or email (${email.trim().toLowerCase()}) already exists. Please log in directly.`,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `sltc_student_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const resolvedFullName = fullName?.trim() || `${verifiedStudent.firstName} ${verifiedStudent.middleName ? verifiedStudent.middleName + ' ' : ''}${verifiedStudent.lastName}`;
    const resolvedMajor = majorSubject || verifiedStudent.course || 'General Education';
    const resolvedYear = yearLevel || verifiedStudent.yearGraduated || '4th Year';

    let newUser;
    try {
      [newUser] = await db.insert(users).values({
        uid,
        email: email.trim().toLowerCase(),
        passwordHash,
        fullName: resolvedFullName,
        role: 'EXAMINEE',
        studentId: cleanStudentId,
        department: department || 'College of Education',
        majorSubject: resolvedMajor,
        yearLevel: resolvedYear,
        contactNumber: contactNumber || '',
      }).returning();
    } catch (insertError: any) {
      if (
        insertError.code === '23505' ||
        insertError.message?.toLowerCase().includes('unique') ||
        insertError.message?.toLowerCase().includes('duplicate')
      ) {
        return res.status(400).json({
          error: `An examinee account with Student ID "${cleanStudentId}" or this email address already exists. Concurrent duplicate registrations are blocked. Please log in directly.`,
        });
      }
      throw insertError;
    }

    // Automatically create initial MockLET examination clearance request in PENDING state
    try {
      const existingReq = await db.select().from(examRequests).where(eq(examRequests.userId, newUser.id));
      if (existingReq.length === 0) {
        await db.insert(examRequests).values({
          userId: newUser.id,
          studentId: cleanStudentId,
          status: 'PENDING',
          requestNotes: 'Official request to take SLTCFPDI MockLET Examination.',
        });
      }
    } catch (reqErr) {
      console.warn('Initial clearance request creation warning:', reqErr);
    }

    const token = generateCustomToken({
      id: newUser.id,
      uid: newUser.uid,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
    });

    await db.insert(auditLogs).values({
      userId: newUser.id,
      action: 'USER_REGISTER',
      details: `New Examinee registered: ${newUser.fullName} (${newUser.studentId}) with pending MockLET clearance request.`,
    });

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        uid: newUser.uid,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        studentId: newUser.studentId,
        department: newUser.department,
        majorSubject: newUser.majorSubject,
        yearLevel: newUser.yearLevel,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register account' });
  }
});

// Get Profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'User profile not found' });

    return res.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      studentId: user.studentId,
      department: user.department,
      majorSubject: user.majorSubject,
      yearLevel: user.yearLevel,
      contactNumber: user.contactNumber,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update Profile
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { fullName, contactNumber, majorSubject, yearLevel, department, password } = req.body;

    const updates: any = {};
    if (fullName) updates.fullName = fullName;
    if (contactNumber !== undefined) updates.contactNumber = contactNumber;
    if (majorSubject) updates.majorSubject = majorSubject;
    if (yearLevel) updates.yearLevel = yearLevel;
    if (department) updates.department = department;

    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    const [updatedUser] = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    return res.json({
      id: updatedUser.id,
      uid: updatedUser.uid,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      studentId: updatedUser.studentId,
      department: updatedUser.department,
      majorSubject: updatedUser.majorSubject,
      yearLevel: updatedUser.yearLevel,
      contactNumber: updatedUser.contactNumber,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;
