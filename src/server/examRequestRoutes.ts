import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { examRequests, users, examinations, studentMasterlist, auditLogs } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// 1. Get All Requests (Admin & Faculty)
router.get('/', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const allRequests = await db
      .select({
        id: examRequests.id,
        userId: examRequests.userId,
        studentId: examRequests.studentId,
        examId: examRequests.examId,
        status: examRequests.status,
        requestNotes: examRequests.requestNotes,
        reviewNotes: examRequests.reviewNotes,
        requestedAt: examRequests.requestedAt,
        reviewedAt: examRequests.reviewedAt,
        reviewedById: examRequests.reviewedById,
        reviewerName: users.fullName,
        userName: users.fullName,
        userEmail: users.email,
        examTitle: examinations.title,
      })
      .from(examRequests)
      .leftJoin(users, eq(examRequests.userId, users.id))
      .leftJoin(examinations, eq(examRequests.examId, examinations.id))
      .orderBy(desc(examRequests.requestedAt));

    // Fetch user map to accurately resolve reviewer name and student details
    const allUsers = await db.select().from(users);
    const userMap = new Map<number, any>(allUsers.map(u => [u.id, u]));

    // Also enrich with studentMasterlist course & year graduated
    const masterlistRecords = await db.select().from(studentMasterlist);
    const masterMap = new Map<string, any>(masterlistRecords.map(m => [m.studentId.trim().toUpperCase(), m]));

    const enriched = allRequests.map(r => {
      const match: any = masterMap.get(r.studentId.trim().toUpperCase());
      const reviewer = r.reviewedById ? userMap.get(r.reviewedById) : null;
      return {
        ...r,
        reviewerName: reviewer ? reviewer.fullName : null,
        course: match?.course || 'General Education',
        yearGraduated: match?.yearGraduated || '2026',
        fullName: match ? `${match.firstName} ${match.middleName ? match.middleName + ' ' : ''}${match.lastName}` : r.userName,
      };
    });

    let filtered = enriched;
    if (status && typeof status === 'string' && status !== 'ALL') {
      filtered = filtered.filter(r => r.status.toUpperCase() === status.toUpperCase());
    }

    return res.json({
      total: filtered.length,
      pendingCount: enriched.filter(r => r.status === 'PENDING').length,
      approvedCount: enriched.filter(r => r.status === 'APPROVED').length,
      declinedCount: enriched.filter(r => r.status === 'DECLINED').length,
      requests: filtered,
    });
  } catch (error: any) {
    console.error('Fetch exam requests error:', error);
    return res.status(500).json({ error: 'Failed to retrieve examinee clearance requests' });
  }
});

// 2. Examinee Get My Clearance Status
router.get('/my-status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userRequests = await db
      .select({
        id: examRequests.id,
        examId: examRequests.examId,
        status: examRequests.status,
        requestNotes: examRequests.requestNotes,
        reviewNotes: examRequests.reviewNotes,
        requestedAt: examRequests.requestedAt,
        reviewedAt: examRequests.reviewedAt,
        examTitle: examinations.title,
      })
      .from(examRequests)
      .leftJoin(examinations, eq(examRequests.examId, examinations.id))
      .where(eq(examRequests.userId, userId))
      .orderBy(desc(examRequests.requestedAt));

    const latest = userRequests[0] || null;
    const isApproved = userRequests.some(r => r.status === 'APPROVED');
    const isPending = latest?.status === 'PENDING';
    const isDeclined = latest?.status === 'DECLINED' && !isApproved;

    // Get verified student info
    let verifiedStudent = null;
    if (req.user?.studentId) {
      const [s] = await db
        .select()
        .from(studentMasterlist)
        .where(eq(studentMasterlist.studentId, req.user.studentId.trim()));
      if (s) {
        verifiedStudent = {
          studentId: s.studentId,
          fullName: `${s.firstName} ${s.middleName ? s.middleName + ' ' : ''}${s.lastName}`,
          course: s.course,
          yearGraduated: s.yearGraduated,
        };
      }
    }

    return res.json({
      hasRequest: userRequests.length > 0,
      isApproved,
      isPending,
      isDeclined,
      status: isApproved ? 'APPROVED' : latest ? latest.status : 'NOT_REQUESTED',
      latestRequest: latest,
      allRequests: userRequests,
      verifiedStudent,
    });
  } catch (error: any) {
    console.error('Fetch my clearance status error:', error);
    return res.status(500).json({ error: 'Failed to retrieve examinee clearance status' });
  }
});

// 3. Examinee Submit Clearance Request
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { examId, requestNotes } = req.body;

    const studentId = req.user?.studentId;
    if (!studentId) {
      return res.status(400).json({
        error: 'Your examinee profile is missing a Student ID Number. Please contact administrator.',
      });
    }

    // Check if an existing request is already pending
    const existingRequests = await db
      .select()
      .from(examRequests)
      .where(eq(examRequests.userId, userId));

    const pending = existingRequests.find(r => r.status === 'PENDING');
    if (pending) {
      return res.status(400).json({
        error: 'You already have an active MockLET examination clearance request pending Administrator review.',
      });
    }

    const [newRequest] = await db
      .insert(examRequests)
      .values({
        userId,
        studentId: studentId.trim(),
        examId: examId ? parseInt(examId, 10) : null,
        status: 'PENDING',
        requestNotes: requestNotes ? requestNotes.trim() : 'Official request to take SLTCFPDI MockLET Examination.',
        requestedAt: new Date(),
      })
      .returning();

    await db.insert(auditLogs).values({
      userId,
      action: 'EXAM_REQUEST_SUBMITTED',
      details: `Examinee ${req.user!.fullName} (${studentId}) submitted a request to take MockLET examination.`,
    });

    return res.status(201).json({
      success: true,
      message: 'Your MockLET examination clearance request has been submitted for Admin approval.',
      request: newRequest,
    });
  } catch (error: any) {
    console.error('Submit exam request error:', error);
    return res.status(500).json({ error: 'Failed to submit examination clearance request' });
  }
});

// 4. Admin Review Request (Approve or Decline)
router.put('/:id/review', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { status, reviewNotes } = req.body;

    if (!status || !['APPROVED', 'DECLINED'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be either APPROVED or DECLINED.' });
    }

    const [existing] = await db
      .select()
      .from(examRequests)
      .where(eq(examRequests.id, requestId));

    if (!existing) {
      return res.status(404).json({ error: 'Examination request not found.' });
    }

    const newStatus = status.toUpperCase();

    const [updated] = await db
      .update(examRequests)
      .set({
        status: newStatus,
        reviewNotes: reviewNotes ? reviewNotes.trim() : (newStatus === 'APPROVED' ? 'Approved for MockLET examination.' : 'Request declined.'),
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
      })
      .where(eq(examRequests.id, requestId))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: `EXAM_REQUEST_${newStatus}`,
      details: `Admin ${req.user!.fullName} ${newStatus.toLowerCase()} examinee exam clearance request #${requestId} (Student ID: ${existing.studentId}). Reason/Notes: ${updated.reviewNotes}`,
    });

    return res.json({
      success: true,
      message: `Examination request successfully marked as ${newStatus}.`,
      request: updated,
    });
  } catch (error: any) {
    console.error('Review exam request error:', error);
    return res.status(500).json({ error: 'Failed to review examination request' });
  }
});

export default router;
