import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { examAttempts, examineeAnswers, questions, categories, users, examinations } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// General Performance Summary Report Data (Admin & Faculty)
router.get('/general', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (_req: AuthRequest, res: Response) => {
  try {
    const attempts = await db.select({
      attemptId: examAttempts.id,
      examineeName: users.fullName,
      studentId: users.studentId,
      department: users.department,
      majorSubject: users.majorSubject,
      examTitle: examinations.title,
      score: examAttempts.score,
      totalPoints: examAttempts.totalPoints,
      percentage: examAttempts.percentage,
      passed: examAttempts.passed,
      status: examAttempts.status,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .innerJoin(users, eq(examAttempts.userId, users.id))
    .innerJoin(examinations, eq(examAttempts.examId, examinations.id))
    .orderBy(desc(examAttempts.submittedAt));

    const totalCount = attempts.length;
    const passedCount = attempts.filter(a => a.passed).length;
    const failedCount = totalCount - passedCount;
    const passRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(2) : '0';

    return res.json({
      schoolName: 'Southern Luzon Technological College Foundation Pio Duran Incorporated (SLTCFPDI)',
      systemTitle: 'Automated LET Mock Examination and Examinee Performance Monitoring System',
      generatedAt: new Date().toISOString(),
      summary: {
        totalAttempts: totalCount,
        passedCount,
        failedCount,
        passRate: `${passRate}%`,
      },
      records: attempts,
    });
  } catch (error: any) {
    console.error('General report error:', error);
    return res.status(500).json({ error: 'Failed to generate general summary report' });
  }
});

// Individual Examinee Comprehensive Report Data (Admin, Faculty, or Own Examinee)
router.get('/individual/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const requester = req.user;

    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    if (requester.role === 'EXAMINEE' && requester.id !== targetUserId) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own individual report' });
    }

    const [examinee] = await db.select().from(users).where(eq(users.id, targetUserId));
    if (!examinee) return res.status(404).json({ error: 'Examinee not found' });

    const attempts = await db.select({
      attemptId: examAttempts.id,
      examTitle: examinations.title,
      score: examAttempts.score,
      totalPoints: examAttempts.totalPoints,
      percentage: examAttempts.percentage,
      passed: examAttempts.passed,
      submittedAt: examAttempts.submittedAt,
      timeSpentSeconds: examAttempts.timeSpentSeconds,
    })
    .from(examAttempts)
    .innerJoin(examinations, eq(examAttempts.examId, examinations.id))
    .where(and(eq(examAttempts.userId, targetUserId), eq(examAttempts.status, 'SUBMITTED')))
    .orderBy(desc(examAttempts.submittedAt));

    const totalAttempts = attempts.length;
    const passedCount = attempts.filter(a => a.passed).length;
    const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(2) : '0';
    const avgScore = totalAttempts > 0
      ? (attempts.reduce((sum, a) => sum + parseFloat(a.percentage), 0) / totalAttempts).toFixed(2)
      : '0';

    // 1. Fetch all categories
    const allCategories = await db.select().from(categories);

    // 2. Fetch examinee answers for category performance breakdown
    const categoryStatsMap: Record<number, { total: number; correct: number; categoryName: string; categoryCode: string }> = {};

    for (const cat of allCategories) {
      categoryStatsMap[cat.id] = {
        total: 0,
        correct: 0,
        categoryName: cat.name,
        categoryCode: cat.code,
      };
    }

    if (totalAttempts > 0) {
      const userAnswers = await db.select({
        isCorrect: examineeAnswers.isCorrect,
        categoryId: questions.categoryId,
        catName: categories.name,
        catCode: categories.code,
      })
      .from(examineeAnswers)
      .innerJoin(examAttempts, eq(examineeAnswers.attemptId, examAttempts.id))
      .innerJoin(questions, eq(examineeAnswers.questionId, questions.id))
      .innerJoin(categories, eq(questions.categoryId, categories.id))
      .where(and(eq(examAttempts.userId, targetUserId), eq(examAttempts.status, 'SUBMITTED')));

      for (const ans of userAnswers) {
        if (!categoryStatsMap[ans.categoryId]) {
          categoryStatsMap[ans.categoryId] = {
            total: 0,
            correct: 0,
            categoryName: ans.catName,
            categoryCode: ans.catCode,
          };
        }
        categoryStatsMap[ans.categoryId].total += 1;
        if (ans.isCorrect) {
          categoryStatsMap[ans.categoryId].correct += 1;
        }
      }
    }

    // Format category breakdown
    const categoryBreakdown = Object.entries(categoryStatsMap).map(([catIdStr, stat]) => {
      const pct = stat.total > 0 ? ((stat.correct / stat.total) * 100).toFixed(2) : '0.00';
      const pctNum = parseFloat(pct);

      let performanceTag = 'NOT_TESTED';
      if (stat.total > 0) {
        if (pctNum >= 80) performanceTag = 'OUTSTANDING';
        else if (pctNum >= 70) performanceTag = 'SATISFACTORY';
        else performanceTag = 'NEEDS_IMPROVEMENT';
      }

      return {
        categoryId: parseInt(catIdStr, 10),
        categoryName: stat.categoryName,
        categoryCode: stat.categoryCode,
        totalQuestions: stat.total,
        correctAnswers: stat.correct,
        percentage: pct,
        performanceTag,
      };
    });

    // Determine Standout Area (Highest Accuracy) and Primary Focus Area (Lowest Accuracy)
    const testedCategories = categoryBreakdown.filter(c => c.totalQuestions > 0);
    let standoutCategory: typeof categoryBreakdown[0] | null = null;
    let weakestCategory: typeof categoryBreakdown[0] | null = null;

    if (testedCategories.length > 0) {
      const sortedByPct = [...testedCategories].sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
      standoutCategory = sortedByPct[0];
      weakestCategory = sortedByPct[sortedByPct.length - 1];
    }

    const defaultRemarks = totalAttempts > 0
      ? `Examinee ${examinee.fullName} has completed ${totalAttempts} mock examination session(s) with an overall score average of ${avgScore}%. ${
          standoutCategory ? `Demonstrates high competency in ${standoutCategory.categoryName} (${standoutCategory.percentage}% score).` : ''
        } ${
          weakestCategory && weakestCategory.categoryId !== standoutCategory?.categoryId
            ? `Recommended for targeted review and drills in ${weakestCategory.categoryName} (${weakestCategory.percentage}% score).`
            : ''
        }`
      : 'No examination records submitted yet. Faculty review will be conducted upon completion of mock tests.';

    const defaultRecommendation = totalAttempts === 0
      ? 'PENDING MOCK EXAMINATION'
      : parseFloat(avgScore) >= 75
      ? 'RECOMMENDED FOR OFFICIAL LET BOARD EXAMINATION'
      : 'RECOMMENDED FOR INTENSIVE REMEDIAL REVIEW';

    return res.json({
      schoolName: 'Southern Luzon Technological College Foundation Pio Duran Incorporated (SLTCFPDI)',
      generatedAt: new Date().toISOString(),
      examineeInfo: {
        id: examinee.id,
        fullName: examinee.fullName,
        email: examinee.email,
        studentId: examinee.studentId || 'N/A',
        department: examinee.department || 'College of Education',
        majorSubject: examinee.majorSubject || 'General Education',
        yearLevel: examinee.yearLevel || '4th Year',
        contactNumber: examinee.contactNumber || 'N/A',
        facultyRemarks: examinee.facultyRemarks || defaultRemarks,
        facultyRecommendation: examinee.facultyRecommendation || defaultRecommendation,
        evaluatorName: examinee.evaluatorName || 'SLTCFPDI College of Education Review Committee',
      },
      performanceSummary: {
        totalAttempts,
        passedCount,
        failedCount: totalAttempts - passedCount,
        passRate: `${passRate}%`,
        averagePercentage: `${avgScore}%`,
        readinessStatus: parseFloat(avgScore) >= 75 ? 'RECOMMENDED FOR LET BOARD EXAM' : 'NEEDS FURTHER REVIEW & PREPARATION',
        standoutCategoryName: standoutCategory ? standoutCategory.categoryName : (examinee.majorSubject || 'General Education'),
        standoutPercentage: standoutCategory ? `${standoutCategory.percentage}%` : `${avgScore}%`,
        weakestCategoryName: weakestCategory && weakestCategory.categoryId !== standoutCategory?.categoryId ? weakestCategory.categoryName : 'General Coverage',
        weakestPercentage: weakestCategory ? `${weakestCategory.percentage}%` : `${avgScore}%`,
      },
      categoryBreakdown,
      attemptHistory: attempts,
    });
  } catch (error: any) {
    console.error('Individual report error:', error);
    return res.status(500).json({ error: 'Failed to generate individual examinee report' });
  }
});

// Update Individual Report Remarks, Recommendation, and Student Details (Admin & Faculty)
router.put('/individual/:userId/remarks', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const { facultyRemarks, facultyRecommendation, evaluatorName, studentId, majorSubject, department, yearLevel } = req.body;

    const [examinee] = await db.select().from(users).where(eq(users.id, targetUserId));
    if (!examinee) return res.status(404).json({ error: 'Examinee not found' });

    const updateFields: any = {};
    if (facultyRemarks !== undefined) updateFields.facultyRemarks = facultyRemarks;
    if (facultyRecommendation !== undefined) updateFields.facultyRecommendation = facultyRecommendation;
    if (evaluatorName !== undefined) updateFields.evaluatorName = evaluatorName;
    if (studentId !== undefined) updateFields.studentId = studentId;
    if (majorSubject !== undefined) updateFields.majorSubject = majorSubject;
    if (department !== undefined) updateFields.department = department;
    if (yearLevel !== undefined) updateFields.yearLevel = yearLevel;

    await db.update(users).set(updateFields).where(eq(users.id, targetUserId));

    return res.json({ message: 'Report remarks and details updated successfully' });
  } catch (error: any) {
    console.error('Update report remarks error:', error);
    return res.status(500).json({ error: 'Failed to update report remarks' });
  }
});

export default router;
