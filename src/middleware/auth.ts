import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sltcfpdi-let-mock-exam-secret-key-2026';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    uid: string;
    email: string;
    fullName: string;
    role: string;
    studentId?: string | null;
    majorSubject?: string | null;
  };
}

export const generateCustomToken = (payload: { id: number; uid: string; email: string; role: string; fullName: string }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // 1. Try verify internal JWT first (for username/email login)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.id) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, decoded.id));
        if (dbUser && dbUser.isActive) {
          req.user = {
            id: dbUser.id,
            uid: dbUser.uid,
            email: dbUser.email,
            fullName: dbUser.fullName,
            role: dbUser.role,
            studentId: dbUser.studentId,
            majorSubject: dbUser.majorSubject,
          };
          return next();
        }
      }
    } catch {
      // Ignore JWT verification failure and try Firebase ID Token
    }

    // 2. Try Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const [dbUser] = await db.select().from(users).where(eq(users.uid, decodedToken.uid));

    if (dbUser) {
      if (!dbUser.isActive) {
        return res.status(403).json({ error: 'Forbidden: Account is deactivated' });
      }
      req.user = {
        id: dbUser.id,
        uid: dbUser.uid,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        studentId: dbUser.studentId,
        majorSubject: dbUser.majorSubject,
      };
      return next();
    } else {
      // Auto-provision user in Cloud SQL DB if firebase user doesn't exist yet
      const [newUser] = await db.insert(users).values({
        uid: decodedToken.uid,
        email: decodedToken.email || `user_${Date.now()}@sltcfpdi.edu.ph`,
        fullName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Examinee User',
        role: 'EXAMINEE',
      }).returning();

      req.user = {
        id: newUser.id,
        uid: newUser.uid,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        studentId: newUser.studentId,
        majorSubject: newUser.majorSubject,
      };
      return next();
    }
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges for this operation' });
    }
    next();
  };
};
