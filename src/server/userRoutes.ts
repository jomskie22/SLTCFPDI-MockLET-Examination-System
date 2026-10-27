import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { users, auditLogs } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import bcrypt from 'bcryptjs';

const router = Router();

// Get all users (Admin only)
router.get('/', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      uid: users.uid,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      studentId: users.studentId,
      department: users.department,
      majorSubject: users.majorSubject,
      yearLevel: users.yearLevel,
      contactNumber: users.contactNumber,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));

    return res.json(allUsers);
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

// Create User (Admin only)
router.post('/', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, fullName, role, studentId, department, majorSubject, yearLevel, contactNumber } = req.body;

    if (!email || !fullName || !role) {
      return res.status(400).json({ error: 'Email, full name, and role are required' });
    }

    const defaultPassword = password || 'sltc12345';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const uid = `sltc_usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const [newUser] = await db.insert(users).values({
      uid,
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName.trim(),
      role,
      studentId: studentId || null,
      department: department || 'College of Education',
      majorSubject: majorSubject || 'General Education',
      yearLevel: yearLevel || '4th Year',
      contactNumber: contactNumber || '',
    }).returning();

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'ADMIN_CREATE_USER',
      details: `Created new ${role} user: ${newUser.fullName} (${newUser.email})`,
    });

    return res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// Toggle User Status / Edit User Role (Admin only)
router.put('/:id', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { isActive, role, fullName, department, majorSubject, yearLevel } = req.body;

    const updates: any = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (role) updates.role = role;
    if (fullName) updates.fullName = fullName;
    if (department) updates.department = department;
    if (majorSubject) updates.majorSubject = majorSubject;
    if (yearLevel) updates.yearLevel = yearLevel;

    const [updated] = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'ADMIN_UPDATE_USER',
      details: `Updated user ID ${userId}: status=${isActive}, role=${role}`,
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
