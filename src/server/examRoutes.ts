import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { examinations, examQuestions, questions, questionChoices, examAttempts, examineeAnswers, categories, users, auditLogs } from '../db/schema.ts';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// 1. Get Exams List (Admin/Faculty sees all, Examinees see published)
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'FACULTY';

    const allExams = await db.select({
      id: examinations.id,
      title: examinations.title,
      description: examinations.description,
      categoryId: examinations.categoryId,
      durationMinutes: examinations.durationMinutes,
      passPercentage: examinations.passPercentage,
      totalQuestions: examinations.totalQuestions,
      randomizeQuestions: examinations.randomizeQuestions,
      randomizeChoices: examinations.randomizeChoices,
      isPublished: examinations.isPublished,
      createdAt: examinations.createdAt,
      categoryName: categories.name,
      creatorName: users.fullName,
    })
    .from(examinations)
    .leftJoin(categories, eq(examinations.categoryId, categories.id))
    .leftJoin(users, eq(examinations.createdById, users.id))
    .orderBy(desc(examinations.createdAt));

    const filtered = isStaff ? allExams : allExams.filter(e => e.isPublished);

    // If examinee, attach their previous attempt status
    if (!isStaff && req.user?.id) {
      const userAttempts = await db.select()
        .from(examAttempts)
        .where(eq(examAttempts.userId, req.user.id));

      const enriched = filtered.map(exam => {
        const attemptsForExam = userAttempts.filter(a => a.examId === exam.id);
        const submittedAttempts = attemptsForExam.filter(a => a.status === 'SUBMITTED' || a.status === 'EXPIRED');
        const latestAttempt = submittedAttempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
        
        const retakeGranted = latestAttempt ? !!latestAttempt.allowRetake : false;
        const hasTaken = !!latestAttempt;

        return {
          ...exam,
          attemptCount: attemptsForExam.length,
          hasTaken: hasTaken,
          canRetake: !hasTaken || retakeGranted,
          retakeGranted: retakeGranted,
          lastStatus: latestAttempt ? latestAttempt.status : null,
        };
      });
      return res.json(enriched);
    }

    return res.json(filtered);
  } catch (error: any) {
    console.error('Fetch exams error:', error);
    return res.status(500).json({ error: 'Failed to fetch examinations' });
  }
});

// 2. Get Single Exam Details (with Question count & metadata)
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const examId = parseInt(req.params.id, 10);
    const [exam] = await db.select().from(examinations).where(eq(examinations.id, examId));
    if (!exam) return res.status(404).json({ error: 'Examination not found' });

    const mappings = await db.select().from(examQuestions).where(eq(examQuestions.examId, examId));

    return res.json({
      ...exam,
      questionCount: mappings.length,
    });
  } catch (error: any) {
    console.error('Fetch exam details error:', error);
    return res.status(500).json({ error: 'Failed to fetch exam details' });
  }
});

// 3. Create Mock Examination (Admin & Faculty)
router.post('/', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, categoryId, durationMinutes, passPercentage, totalQuestions, randomizeQuestions, randomizeChoices, isPublished, questionIds } = req.body;

    if (!title) return res.status(400).json({ error: 'Examination title is required' });

    const [newExam] = await db.insert(examinations).values({
      title: title.trim(),
      description: description || '',
      categoryId: categoryId ? parseInt(categoryId, 10) : null,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 120,
      passPercentage: passPercentage ? parseInt(passPercentage, 10) : 75,
      totalQuestions: totalQuestions ? parseInt(totalQuestions, 10) : (questionIds?.length || 50),
      randomizeQuestions: randomizeQuestions !== undefined ? !!randomizeQuestions : true,
      randomizeChoices: randomizeChoices !== undefined ? !!randomizeChoices : true,
      isPublished: !!isPublished,
      createdById: req.user?.id,
    }).returning();

    // Map selected question IDs or auto-pull from category question bank
    let targetQuestionIds: number[] = [];
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      targetQuestionIds = questionIds.map((id: any) => parseInt(id, 10));
    } else {
      // Auto-pull questions from category or all categories
      let availableQ = await db.select().from(questions);
      if (categoryId) {
        availableQ = availableQ.filter(q => q.categoryId === parseInt(categoryId, 10));
      }
      targetQuestionIds = availableQ.map(q => q.id);
      if (newExam.totalQuestions && targetQuestionIds.length > newExam.totalQuestions) {
        targetQuestionIds = targetQuestionIds.sort(() => 0.5 - Math.random()).slice(0, newExam.totalQuestions);
      }
    }

    if (targetQuestionIds.length > 0) {
      const mappings = targetQuestionIds.map((qId, idx) => ({
        examId: newExam.id,
        questionId: qId,
        orderIndex: idx + 1,
      }));
      await db.insert(examQuestions).values(mappings);
    }

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'CREATE_EXAM',
      details: `Created Mock Exam: "${newExam.title}" (${targetQuestionIds.length} questions, ${newExam.durationMinutes} mins)`,
    });

    return res.status(201).json(newExam);
  } catch (error: any) {
    console.error('Create exam error:', error);
    return res.status(500).json({ error: 'Failed to create examination' });
  }
});

// 4. Toggle Publish Exam (Admin & Faculty)
router.post('/:id/publish', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const examId = parseInt(req.params.id, 10);
    const { isPublished } = req.body;

    const [updated] = await db.update(examinations)
      .set({ isPublished: !!isPublished })
      .where(eq(examinations.id, examId))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'PUBLISH_EXAM',
      details: `Updated exam publication status for ID ${examId}: isPublished=${isPublished}`,
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Publish exam error:', error);
    return res.status(500).json({ error: 'Failed to update exam publication status' });
  }
});

// 5. Delete Exam (Admin & Faculty)
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const examId = parseInt(req.params.id, 10);
    await db.delete(examinations).where(eq(examinations.id, examId));

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'DELETE_EXAM',
      details: `Deleted mock exam ID ${examId}`,
    });

    return res.json({ message: 'Exam deleted successfully' });
  } catch (error: any) {
    console.error('Delete exam error:', error);
    return res.status(500).json({ error: 'Failed to delete examination' });
  }
});

// ==========================================
// EXAMINEE EXAM TAKING & ATTEMPT ENDPOINTS
// ==========================================

// Start Exam Attempt
router.post('/:id/start', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const examId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [exam] = await db.select().from(examinations).where(eq(examinations.id, examId));
    if (!exam) return res.status(404).json({ error: 'Examination not found' });
    if (!exam.isPublished && req.user?.role === 'EXAMINEE') {
      return res.status(403).json({ error: 'This examination is currently not available or published' });
    }

    // Check if examinee has already taken this exam and if retake is permitted
    if (req.user?.role === 'EXAMINEE') {
      const priorAttempts = await db.select()
        .from(examAttempts)
        .where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId)));

      const submittedAttempts = priorAttempts.filter(a => a.status === 'SUBMITTED' || a.status === 'EXPIRED');
      const latestAttempt = submittedAttempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

      if (latestAttempt && !latestAttempt.allowRetake) {
        return res.status(403).json({
          error: 'You have already completed this examination. Mock examinations are one-time tests unless permission to retake is granted by your Faculty instructor.'
        });
      }
    }

    // Get assigned questions for this exam
    const mappings = await db.select().from(examQuestions).where(eq(examQuestions.examId, examId));
    if (mappings.length === 0) {
      return res.status(400).json({ error: 'This examination has no questions configured.' });
    }

    const questionIds = mappings.map(m => m.questionId);
    let questionList = await db.select().from(questions).where(inArray(questions.id, questionIds));
    const choicesList = await db.select().from(questionChoices).where(inArray(questionChoices.questionId, questionIds));

    // Calculate total points
    const totalPoints = questionList.reduce((acc, q) => acc + (q.pointValue || 1), 0);

    // Create new exam attempt
    const [attempt] = await db.insert(examAttempts).values({
      examId,
      userId,
      totalPoints,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    }).returning();

    // Randomize questions if configured
    if (exam.randomizeQuestions) {
      questionList = questionList.sort(() => 0.5 - Math.random());
    }

    // Prepare questions with choices (and sanitize choices so correct answer is HIDDEN until submission)
    const sanitizedQuestions = questionList.map(q => {
      let qChoices = choicesList.filter(c => c.questionId === q.id);
      if (exam.randomizeChoices) {
        qChoices = qChoices.sort(() => 0.5 - Math.random());
      }

      return {
        id: q.id,
        categoryId: q.categoryId,
        questionText: q.questionText,
        pointValue: q.pointValue,
        choices: qChoices.map((c, idx) => ({
          id: c.id,
          choiceLabel: String.fromCharCode(65 + idx),
          choiceText: c.choiceText,
          // DO NOT include isCorrect here! Security requirement.
        })),
      };
    });

    await db.insert(auditLogs).values({
      userId,
      action: 'START_EXAM_ATTEMPT',
      details: `Started attempt ID ${attempt.id} for exam "${exam.title}"`,
    });

    return res.status(201).json({
      attemptId: attempt.id,
      examTitle: exam.title,
      durationMinutes: exam.durationMinutes,
      passPercentage: exam.passPercentage,
      startedAt: attempt.startedAt,
      totalQuestions: sanitizedQuestions.length,
      questions: sanitizedQuestions,
    });
  } catch (error: any) {
    console.error('Start exam attempt error:', error);
    return res.status(500).json({ error: 'Failed to start examination attempt' });
  }
});

// Save Answer Choice in Progress
router.post('/attempts/:attemptId/answer', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = parseInt(req.params.attemptId, 10);
    const { questionId, selectedChoiceId, isFlagged } = req.body;

    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId));
    if (!attempt || attempt.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Invalid attempt session' });
    }
    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Attempt has already been submitted or expired' });
    }

    const existingAns = await db.select().from(examineeAnswers).where(
      and(eq(examineeAnswers.attemptId, attemptId), eq(examineeAnswers.questionId, parseInt(questionId, 10)))
    );

    if (existingAns.length > 0) {
      await db.update(examineeAnswers)
        .set({
          selectedChoiceId: selectedChoiceId ? parseInt(selectedChoiceId, 10) : null,
          isFlagged: !!isFlagged,
        })
        .where(eq(examineeAnswers.id, existingAns[0].id));
    } else {
      await db.insert(examineeAnswers).values({
        attemptId,
        questionId: parseInt(questionId, 10),
        selectedChoiceId: selectedChoiceId ? parseInt(selectedChoiceId, 10) : null,
        isFlagged: !!isFlagged,
      });
    }

    return res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Save answer error:', error);
    return res.status(500).json({ error: 'Failed to save answer' });
  }
});

// Submit Exam Attempt & Automatic Checking
router.post('/attempts/:attemptId/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = parseInt(req.params.attemptId, 10);
    const { timeSpentSeconds, answers } = req.body;

    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId));
    if (!attempt || attempt.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Invalid attempt session' });
    }

    const [exam] = await db.select().from(examinations).where(eq(examinations.id, attempt.examId));

    // Save final answers list
    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        if (!ans.questionId) continue;
        const qId = parseInt(ans.questionId, 10);
        const selChoiceId = ans.selectedChoiceId ? parseInt(ans.selectedChoiceId, 10) : null;

        const existingAns = await db.select().from(examineeAnswers).where(
          and(eq(examineeAnswers.attemptId, attemptId), eq(examineeAnswers.questionId, qId))
        );

        if (existingAns.length > 0) {
          await db.update(examineeAnswers)
            .set({
              selectedChoiceId: selChoiceId,
              isFlagged: !!ans.isFlagged,
            })
            .where(eq(examineeAnswers.id, existingAns[0].id));
        } else {
          await db.insert(examineeAnswers).values({
            attemptId,
            questionId: qId,
            selectedChoiceId: selChoiceId,
            isFlagged: !!ans.isFlagged,
          });
        }
      }
    }

    // AUTOMATIC CHECKING
    const mappings = await db.select().from(examQuestions).where(eq(examQuestions.examId, exam.id));
    const qIds = mappings.map(m => m.questionId);

    const questionList = await db.select().from(questions).where(inArray(questions.id, qIds));
    const choiceList = await db.select().from(questionChoices).where(inArray(questionChoices.questionId, qIds));
    const userAnswers = await db.select().from(examineeAnswers).where(eq(examineeAnswers.attemptId, attemptId));

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const q of questionList) {
      const qWeight = q.pointValue || 1;
      totalPoints += qWeight;

      const userAns = userAnswers.find(a => a.questionId === q.id);
      if (userAns && userAns.selectedChoiceId) {
        const correctChoice = choiceList.find(c => c.questionId === q.id && c.isCorrect);
        const isRight = correctChoice && correctChoice.id === userAns.selectedChoiceId;

        if (isRight) {
          earnedPoints += qWeight;
          await db.update(examineeAnswers)
            .set({ isCorrect: true, pointsEarned: qWeight })
            .where(eq(examineeAnswers.id, userAns.id));
        } else {
          await db.update(examineeAnswers)
            .set({ isCorrect: false, pointsEarned: 0 })
            .where(eq(examineeAnswers.id, userAns.id));
        }
      }
    }

    const percentageVal = totalPoints > 0 ? ((earnedPoints / totalPoints) * 100).toFixed(2) : '0';
    const passThreshold = exam.passPercentage || 75;
    const isPassed = parseFloat(percentageVal) >= passThreshold;

    const [updatedAttempt] = await db.update(examAttempts)
      .set({
        score: earnedPoints,
        totalPoints,
        percentage: percentageVal,
        passed: isPassed,
        submittedAt: new Date(),
        timeSpentSeconds: timeSpentSeconds || 0,
        status: 'SUBMITTED',
      })
      .where(eq(examAttempts.id, attemptId))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'SUBMIT_EXAM',
      details: `Submitted exam attempt ID ${attemptId}: Score ${earnedPoints}/${totalPoints} (${percentageVal}%), Passed: ${isPassed}`,
    });

    return res.json({
      attemptId: updatedAttempt.id,
      score: earnedPoints,
      totalPoints,
      percentage: percentageVal,
      passed: isPassed,
      timeSpentSeconds: updatedAttempt.timeSpentSeconds,
      submittedAt: updatedAttempt.submittedAt,
    });
  } catch (error: any) {
    console.error('Submit exam error:', error);
    return res.status(500).json({ error: 'Failed to submit examination' });
  }
});

// View Completed Attempt Details & Explanation Breakdown
router.get('/attempts/:attemptId/review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = parseInt(req.params.attemptId, 10);
    const userId = req.user?.id;

    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId));
    if (!attempt) return res.status(404).json({ error: 'Attempt record not found' });

    // Ensure examinees cannot view score breakdown or pass/fail results
    if (req.user?.role === 'EXAMINEE') {
      return res.status(403).json({ error: 'Examinees are not permitted to view pass/fail results or score breakdowns. Results are recorded for Faculty and Admin review.' });
    }

    const [exam] = await db.select().from(examinations).where(eq(examinations.id, attempt.examId));
    const examinee = await db.select().from(users).where(eq(users.id, attempt.userId));

    const userAnswersList = await db.select().from(examineeAnswers).where(eq(examineeAnswers.attemptId, attemptId));
    const mappings = await db.select().from(examQuestions).where(eq(examQuestions.examId, attempt.examId));
    const qIds = mappings.map(m => m.questionId);

    const questionList = await db.select({
      id: questions.id,
      questionText: questions.questionText,
      explanation: questions.explanation,
      pointValue: questions.pointValue,
      sourceReference: questions.sourceReference,
      categoryId: questions.categoryId,
      categoryName: categories.name,
    })
    .from(questions)
    .leftJoin(categories, eq(questions.categoryId, categories.id))
    .where(inArray(questions.id, qIds));

    const choicesList = await db.select().from(questionChoices).where(inArray(questionChoices.questionId, qIds));

    const detailedBreakdown = questionList.map(q => {
      const qChoices = choicesList.filter(c => c.questionId === q.id);
      const userAns = userAnswersList.find(a => a.questionId === q.id);
      const correctChoice = qChoices.find(c => c.isCorrect);

      return {
        id: q.id,
        questionText: q.questionText,
        explanation: q.explanation,
        pointValue: q.pointValue,
        sourceReference: q.sourceReference,
        categoryName: q.categoryName,
        selectedChoiceId: userAns?.selectedChoiceId || null,
        correctChoiceId: correctChoice?.id || null,
        isCorrect: userAns?.isCorrect || false,
        pointsEarned: userAns?.pointsEarned || 0,
        choices: qChoices.map(c => ({
          id: c.id,
          choiceLabel: c.choiceLabel,
          choiceText: c.choiceText,
          isCorrect: c.isCorrect,
        })),
      };
    });

    return res.json({
      attemptId: attempt.id,
      examTitle: exam?.title,
      examineeName: examinee[0]?.fullName,
      studentId: examinee[0]?.studentId,
      score: attempt.score,
      totalPoints: attempt.totalPoints,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timeSpentSeconds: attempt.timeSpentSeconds,
      submittedAt: attempt.submittedAt,
      questions: detailedBreakdown,
    });
  } catch (error: any) {
    console.error('Review attempt error:', error);
    return res.status(500).json({ error: 'Failed to load examination review details' });
  }
});

// Get My Exam History (Examinee)
router.get('/user/my-history', requireAuth, async (req: AuthRequest, res: Response) => {
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
      timeSpentSeconds: examAttempts.timeSpentSeconds,
      status: examAttempts.status,
    })
    .from(examAttempts)
    .innerJoin(examinations, eq(examAttempts.examId, examinations.id))
    .where(eq(examAttempts.userId, userId))
    .orderBy(desc(examAttempts.startedAt));

    return res.json(attempts);
  } catch (error: any) {
    console.error('Fetch history error:', error);
    return res.status(500).json({ error: 'Failed to fetch examination history' });
  }
});

// Grant / Toggle Retake Permission for an Attempt (Admin & Faculty)
router.post('/attempts/:attemptId/allow-retake', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = parseInt(req.params.attemptId, 10);
    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId));
    if (!attempt) return res.status(404).json({ error: 'Exam attempt record not found' });

    const newAllowState = req.body.allowRetake !== undefined ? !!req.body.allowRetake : true;

    await db.update(examAttempts)
      .set({ allowRetake: newAllowState })
      .where(eq(examAttempts.id, attemptId));

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'GRANT_EXAM_RETAKE',
      details: `${newAllowState ? 'Granted' : 'Revoked'} retake permission for attempt ID ${attemptId} (Exam ID ${attempt.examId}, User ID ${attempt.userId})`,
    });

    return res.json({ message: `Retake permission ${newAllowState ? 'granted' : 'revoked'} successfully`, allowRetake: newAllowState });
  } catch (error: any) {
    console.error('Allow retake error:', error);
    return res.status(500).json({ error: 'Failed to update retake permission' });
  }
});

export default router;
