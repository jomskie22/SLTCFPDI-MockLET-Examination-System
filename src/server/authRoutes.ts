import { Router, Request, Response } from 'express';
import { db } from '../db/index.ts';
import { users, auditLogs } from '../db/schema.ts';
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

// Student Registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, studentId, department, majorSubject, yearLevel, contactNumber } = req.body;

    if (!email || !password || !fullName || !studentId) {
      return res.status(400).json({ error: 'Email, password, full name, and student ID are required' });
    }

    const existing = await db.select().from(users).where(
      or(eq(users.email, email.trim().toLowerCase()), eq(users.studentId, studentId.trim()))
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email or Student ID already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `sltc_student_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const [newUser] = await db.insert(users).values({
      uid,
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName.trim(),
      role: 'EXAMINEE',
      studentId: studentId.trim(),
      department: department || 'College of Education',
      majorSubject: majorSubject || 'General Education',
      yearLevel: yearLevel || '4th Year',
      contactNumber: contactNumber || '',
    }).returning();

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
      details: `New Examinee registered: ${newUser.fullName} (${newUser.studentId})`,
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
