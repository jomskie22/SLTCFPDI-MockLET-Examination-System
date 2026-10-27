import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { questions, questionChoices, categories, topics, auditLogs, users } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// 1. Get Categories & Topics (Public / Authenticated)
router.get('/categories', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const cats = await db.select().from(categories);
    const tops = await db.select().from(topics);

    const categoriesWithTopics = cats.map(cat => ({
      ...cat,
      topics: tops.filter(t => t.categoryId === cat.id),
    }));

    return res.json(categoriesWithTopics);
  } catch (error: any) {
    console.error('Fetch categories error:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create Category (Admin/Faculty)
router.post('/categories', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });

    const [cat] = await db.insert(categories).values({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || '',
    }).returning();

    return res.status(201).json(cat);
  } catch (error: any) {
    console.error('Create category error:', error);
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

// 2. Get Questions List (Faculty & Admin)
router.get('/', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, topicId, search } = req.query;

    let query = db.select({
      id: questions.id,
      questionText: questions.questionText,
      explanation: questions.explanation,
      pointValue: questions.pointValue,
      sourceReference: questions.sourceReference,
      difficulty: questions.difficulty,
      categoryId: questions.categoryId,
      topicId: questions.topicId,
      createdAt: questions.createdAt,
      categoryName: categories.name,
      categoryCode: categories.code,
      topicName: topics.name,
      creatorName: users.fullName,
    })
    .from(questions)
    .leftJoin(categories, eq(questions.categoryId, categories.id))
    .leftJoin(topics, eq(questions.topicId, topics.id))
    .leftJoin(users, eq(questions.createdById, users.id))
    .orderBy(desc(questions.createdAt));

    const rawQuestions = await query;
    const allChoices = await db.select().from(questionChoices);

    const filtered = rawQuestions.filter(q => {
      if (categoryId && q.categoryId !== parseInt(categoryId as string, 10)) return false;
      if (topicId && q.topicId !== parseInt(topicId as string, 10)) return false;
      if (search) {
        const term = (search as string).toLowerCase();
        return q.questionText.toLowerCase().includes(term) || q.sourceReference.toLowerCase().includes(term);
      }
      return true;
    });

    const result = filtered.map(q => ({
      ...q,
      choices: allChoices.filter(c => c.questionId === q.id),
    }));

    return res.json(result);
  } catch (error: any) {
    console.error('Fetch questions error:', error);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// 3. Create Question (Faculty & Admin)
router.post('/', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, topicId, questionText, explanation, pointValue, sourceReference, difficulty, choices } = req.body;

    if (!categoryId || !questionText || !sourceReference) {
      return res.status(400).json({ error: 'Category, question text, and source reference are required' });
    }

    if (!choices || !Array.isArray(choices) || choices.length < 2) {
      return res.status(400).json({ error: 'At least 2 choices are required' });
    }

    const hasCorrectChoice = choices.some((c: any) => c.isCorrect === true);
    if (!hasCorrectChoice) {
      return res.status(400).json({ error: 'Please mark at least one correct choice' });
    }

    const [newQuestion] = await db.insert(questions).values({
      categoryId: parseInt(categoryId, 10),
      topicId: topicId ? parseInt(topicId, 10) : null,
      questionText: questionText.trim(),
      explanation: explanation || '',
      pointValue: pointValue ? parseInt(pointValue, 10) : 1,
      sourceReference: sourceReference.trim(),
      difficulty: difficulty || 'Medium',
      createdById: req.user?.id,
    }).returning();

    // Insert choices
    const choicesToInsert = choices.map((c: any, index: number) => ({
      questionId: newQuestion.id,
      choiceLabel: c.choiceLabel || String.fromCharCode(65 + index), // A, B, C, D
      choiceText: c.choiceText.trim(),
      isCorrect: !!c.isCorrect,
    }));

    await db.insert(questionChoices).values(choicesToInsert);

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'CREATE_QUESTION',
      details: `Created question ID ${newQuestion.id}: "${newQuestion.questionText.substring(0, 50)}..." (Source: ${sourceReference})`,
    });

    return res.status(201).json(newQuestion);
  } catch (error: any) {
    console.error('Create question error:', error);
    return res.status(500).json({ error: 'Failed to create question' });
  }
});

// 4. Update Question (Faculty & Admin)
router.put('/:id', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const questionId = parseInt(req.params.id, 10);
    const { categoryId, topicId, questionText, explanation, pointValue, sourceReference, difficulty, choices } = req.body;

    const [existing] = await db.select().from(questions).where(eq(questions.id, questionId));
    if (!existing) return res.status(404).json({ error: 'Question not found' });

    const updates: any = {
      updatedAt: new Date(),
    };
    if (categoryId) updates.categoryId = parseInt(categoryId, 10);
    if (topicId !== undefined) updates.topicId = topicId ? parseInt(topicId, 10) : null;
    if (questionText) updates.questionText = questionText.trim();
    if (explanation !== undefined) updates.explanation = explanation;
    if (pointValue) updates.pointValue = parseInt(pointValue, 10);
    if (sourceReference) updates.sourceReference = sourceReference.trim();
    if (difficulty) updates.difficulty = difficulty;

    const [updated] = await db.update(questions)
      .set(updates)
      .where(eq(questions.id, questionId))
      .returning();

    // Update choices if provided
    if (choices && Array.isArray(choices) && choices.length >= 2) {
      await db.delete(questionChoices).where(eq(questionChoices.questionId, questionId));
      const choicesToInsert = choices.map((c: any, index: number) => ({
        questionId: questionId,
        choiceLabel: c.choiceLabel || String.fromCharCode(65 + index),
        choiceText: c.choiceText.trim(),
        isCorrect: !!c.isCorrect,
      }));
      await db.insert(questionChoices).values(choicesToInsert);
    }

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'UPDATE_QUESTION',
      details: `Updated question ID ${questionId}`,
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Update question error:', error);
    return res.status(500).json({ error: 'Failed to update question' });
  }
});

// 5. Delete Question (Faculty & Admin)
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const questionId = parseInt(req.params.id, 10);
    await db.delete(questions).where(eq(questions.id, questionId));

    await db.insert(auditLogs).values({
      userId: req.user?.id,
      action: 'DELETE_QUESTION',
      details: `Deleted question ID ${questionId}`,
    });

    return res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    console.error('Delete question error:', error);
    return res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
