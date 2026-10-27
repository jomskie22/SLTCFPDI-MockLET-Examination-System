import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { examAttempts, examineeAnswers, questions, categories, users, examinations, auditLogs } from '../db/schema.ts';
import { eq, desc, inArray, sql } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Examinee Personal Performance Dashboard
router.get('/examinee/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const attempts = await db.select({
      id: examAttempts.id,
      examId: examAttempts.examId,
      examTitle: examinations.title,
      score: examAttempts.score,
      totalPoints: examAttempts.totalPoints,
      percentage: examAttempts.percentage,
      passed: examAttempts.passed,
      startedAt: examAttempts.startedAt,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .innerJoin(examinations, eq(examAttempts.examId, examinations.id))
    .where(and(eq(examAttempts.userId, userId), eq(examAttempts.status, 'SUBMITTED')))
    .orderBy(desc(examAttempts.submittedAt));

    const totalSubmitted = attempts.length;
    const passedCount = attempts.filter(a => a.passed).length;
    const passRate = totalSubmitted > 0 ? ((passedCount / totalSubmitted) * 100).toFixed(1) : '0';

    const avgPercentage = totalSubmitted > 0
      ? (attempts.reduce((sum, a) => sum + parseFloat(a.percentage || '0'), 0) / totalSubmitted).toFixed(1)
      : '0';

    // Progress Over Time Chart Data
    const progressHistory = attempts.slice().reverse().map((a, idx) => ({
      attemptNumber: idx + 1,
      date: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Exam ${idx + 1}`,
      examTitle: a.examTitle,
      percentage: parseFloat(a.percentage),
      passed: a.passed,
    }));

    // Category / Subject Mastery Breakdown (Strengths & Weaknesses)
    const categoryStatsMap: Record<string, { total: number; correct: number; categoryName: string }> = {};

    if (totalSubmitted > 0) {
      const attemptIds = attempts.map(a => a.id);
      const userAnswers = await db.select({
        isCorrect: examineeAnswers.isCorrect,
        categoryId: questions.categoryId,
        categoryName: categories.name,
      })
      .from(examineeAnswers)
      .innerJoin(questions, eq(examineeAnswers.questionId, questions.id))
      .innerJoin(categories, eq(questions.categoryId, categories.id))
      .where(inArray(examineeAnswers.attemptId, attemptIds));

      for (const ans of userAnswers) {
        const catName = ans.categoryName || 'General Coverage';
        if (!categoryStatsMap[catName]) {
          categoryStatsMap[catName] = { total: 0, correct: 0, categoryName: catName };
        }
        categoryStatsMap[catName].total += 1;
        if (ans.isCorrect) {
          categoryStatsMap[catName].correct += 1;
        }
      }
    }

    const categoryBreakdown = Object.values(categoryStatsMap).map(stat => {
      const acc = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      return {
        subject: stat.categoryName,
        accuracy: acc,
        totalQuestionsAnswered: stat.total,
        correctCount: stat.correct,
        status: acc >= 80 ? 'Mastered' : acc >= 70 ? 'Proficient' : 'Needs Focus',
      };
    });

    const strengths = categoryBreakdown.filter(c => c.accuracy >= 75).map(c => c.subject);
    const weaknesses = categoryBreakdown.filter(c => c.accuracy < 75).map(c => c.subject);

    return res.json({
      totalAttempts: totalSubmitted,
      passedCount,
      failedCount: totalSubmitted - passedCount,
      passRate: parseFloat(passRate),
      averagePercentage: parseFloat(avgPercentage),
      strengths: strengths.length > 0 ? strengths : ['Complete more mock exams to identify top strengths'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['None identified so far'],
      progressHistory,
      categoryBreakdown,
    });
  } catch (error: any) {
    console.error('Examinee dashboard analytics error:', error);
    return res.status(500).json({ error: 'Failed to generate examinee performance dashboard' });
  }
});

// Faculty & Admin System-wide Performance Dashboard
router.get('/faculty/dashboard', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (_req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select().from(users);
    const totalExaminees = allUsers.filter(u => u.role === 'EXAMINEE').length;
    const totalFaculty = allUsers.filter(u => u.role === 'FACULTY').length;

    const allQuestions = await db.select().from(questions);
    const allExams = await db.select().from(examinations);
    const allAttempts = await db.select({
      id: examAttempts.id,
      score: examAttempts.score,
      totalPoints: examAttempts.totalPoints,
      percentage: examAttempts.percentage,
      passed: examAttempts.passed,
      status: examAttempts.status,
      submittedAt: examAttempts.submittedAt,
      userId: examAttempts.userId,
      userName: users.fullName,
      examTitle: examinations.title,
      allowRetake: examAttempts.allowRetake,
    })
    .from(examAttempts)
    .innerJoin(users, eq(examAttempts.userId, users.id))
    .innerJoin(examinations, eq(examAttempts.examId, examinations.id))
    .where(eq(examAttempts.status, 'SUBMITTED'))
    .orderBy(desc(examAttempts.submittedAt));

    const totalAttemptsCount = allAttempts.length;
    const passedAttempts = allAttempts.filter(a => a.passed).length;
    const systemPassRate = totalAttemptsCount > 0 ? ((passedAttempts / totalAttemptsCount) * 100).toFixed(1) : '0';

    const systemAvgScore = totalAttemptsCount > 0
      ? (allAttempts.reduce((acc, a) => acc + parseFloat(a.percentage || '0'), 0) / totalAttemptsCount).toFixed(1)
      : '0';

    // Category Performance Comparison
    const allCategories = await db.select().from(categories);
    const categoryMetrics = await Promise.all(allCategories.map(async (cat) => {
      const catQuestions = allQuestions.filter(q => q.categoryId === cat.id);
      const qCount = catQuestions.length;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        code: cat.code,
        questionCount: qCount,
      };
    }));

    // Audit logs recent
    const recentLogs = await db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: users.fullName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

    return res.json({
      metrics: {
        totalExaminees,
        totalFaculty,
        totalQuestions: allQuestions.length,
        totalExams: allExams.length,
        totalAttemptsTaken: totalAttemptsCount,
        systemPassRate: parseFloat(systemPassRate),
        systemAvgScore: parseFloat(systemAvgScore),
      },
      categoryMetrics,
      recentAttempts: allAttempts.slice(0, 10),
      recentLogs,
    });
  } catch (error: any) {
    console.error('Faculty dashboard analytics error:', error);
    return res.status(500).json({ error: 'Failed to generate faculty performance analytics' });
  }
});

function and(...args: any[]) {
  return sql.join(args.filter(Boolean), sql` AND `);
}

export default router;
