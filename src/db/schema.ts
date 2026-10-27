import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or internal unique ID
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('EXAMINEE'), // 'ADMIN', 'FACULTY', 'EXAMINEE'
  studentId: text('student_id').unique(),
  department: text('department').default('College of Education'),
  majorSubject: text('major_subject').default('General Education'), // e.g., 'English', 'Mathematics', 'General Education'
  yearLevel: text('year_level').default('4th Year'),
  contactNumber: text('contact_number'),
  avatarUrl: text('avatar_url'),
  facultyRemarks: text('faculty_remarks'),
  facultyRecommendation: text('faculty_recommendation'),
  evaluatorName: text('evaluator_name'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Categories Table (LET Coverage)
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // General Education, Professional Education, Major - English, Major - Mathematics
  code: text('code').notNull().unique(), // GENED, PROFED, MAJOR_ENG, MAJOR_MATH
  description: text('description'),
});

// 3. Topics Table
export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
});

// 4. Questions Table
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  topicId: integer('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  questionText: text('question_text').notNull(),
  explanation: text('explanation'),
  pointValue: integer('point_value').default(1).notNull(),
  sourceReference: text('source_reference').notNull(), // Source / Reference mandatory
  difficulty: text('difficulty').default('Medium').notNull(), // 'Easy', 'Medium', 'Hard'
  createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Question Choices Table
export const questionChoices = pgTable('question_choices', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  choiceLabel: text('choice_label').notNull(), // 'A', 'B', 'C', 'D'
  choiceText: text('choice_text').notNull(),
  isCorrect: boolean('is_correct').default(false).notNull(),
});

// 6. Examinations Table
export const examinations = pgTable('examinations', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  durationMinutes: integer('duration_minutes').default(120).notNull(),
  passPercentage: integer('pass_percentage').default(75).notNull(),
  totalQuestions: integer('total_questions').default(50).notNull(),
  randomizeQuestions: boolean('randomize_questions').default(true).notNull(),
  randomizeChoices: boolean('randomize_choices').default(true).notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Exam Questions Mapping
export const examQuestions = pgTable('exam_questions', {
  id: serial('id').primaryKey(),
  examId: integer('exam_id').references(() => examinations.id, { onDelete: 'cascade' }).notNull(),
  questionId: integer('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
});

// 8. Exam Attempts Table
export const examAttempts = pgTable('exam_attempts', {
  id: serial('id').primaryKey(),
  examId: integer('exam_id').references(() => examinations.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  score: integer('score').default(0).notNull(),
  totalPoints: integer('total_points').default(0).notNull(),
  percentage: text('percentage').default('0').notNull(),
  passed: boolean('passed').default(false).notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
  timeSpentSeconds: integer('time_spent_seconds').default(0).notNull(),
  status: text('status').default('IN_PROGRESS').notNull(), // 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED'
  allowRetake: boolean('allow_retake').default(false).notNull(),
});

// 9. Examinee Answers Table
export const examineeAnswers = pgTable('examinee_answers', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').references(() => examAttempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: integer('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  selectedChoiceId: integer('selected_choice_id').references(() => questionChoices.id, { onDelete: 'set null' }),
  isCorrect: boolean('is_correct').default(false).notNull(),
  pointsEarned: integer('points_earned').default(0).notNull(),
  isFlagged: boolean('is_flagged').default(false).notNull(),
});

// 10. Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Student Masterlist (Official Excel Upload)
export const studentMasterlist = pgTable('student_masterlist', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull().unique(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  course: text('course').notNull(),
  yearGraduated: text('year_graduated').notNull(),
  uploadedById: integer('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. Exam Requests (MockLET Clearance Approvals)
export const examRequests = pgTable('exam_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  studentId: text('student_id').notNull(),
  examId: integer('exam_id').references(() => examinations.id, { onDelete: 'set null' }),
  status: text('status').default('PENDING').notNull(), // 'PENDING', 'APPROVED', 'DECLINED'
  requestNotes: text('request_notes'),
  reviewNotes: text('review_notes'),
  reviewedById: integer('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

// RELATIONS
export const usersRelations = relations(users, ({ many }) => ({
  attempts: many(examAttempts),
  createdQuestions: many(questions),
  createdExams: many(examinations),
  logs: many(auditLogs),
  uploadedStudents: many(studentMasterlist),
  examRequests: many(examRequests),
}));

export const studentMasterlistRelations = relations(studentMasterlist, ({ one }) => ({
  uploadedBy: one(users, { fields: [studentMasterlist.uploadedById], references: [users.id] }),
}));

export const examRequestsRelations = relations(examRequests, ({ one }) => ({
  user: one(users, { fields: [examRequests.userId], references: [users.id] }),
  exam: one(examinations, { fields: [examRequests.examId], references: [examinations.id] }),
  reviewedBy: one(users, { fields: [examRequests.reviewedById], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  topics: many(topics),
  questions: many(questions),
  exams: many(examinations),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  category: one(categories, { fields: [topics.categoryId], references: [categories.id] }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  category: one(categories, { fields: [questions.categoryId], references: [categories.id] }),
  topic: one(topics, { fields: [questions.topicId], references: [topics.id] }),
  createdBy: one(users, { fields: [questions.createdById], references: [users.id] }),
  choices: many(questionChoices),
  examMappings: many(examQuestions),
  answers: many(examineeAnswers),
}));

export const questionChoicesRelations = relations(questionChoices, ({ one }) => ({
  question: one(questions, { fields: [questionChoices.questionId], references: [questions.id] }),
}));

export const examinationsRelations = relations(examinations, ({ one, many }) => ({
  category: one(categories, { fields: [examinations.categoryId], references: [categories.id] }),
  createdBy: one(users, { fields: [examinations.createdById], references: [users.id] }),
  questions: many(examQuestions),
  attempts: many(examAttempts),
}));

export const examQuestionsRelations = relations(examQuestions, ({ one }) => ({
  exam: one(examinations, { fields: [examQuestions.examId], references: [examinations.id] }),
  question: one(questions, { fields: [examQuestions.questionId], references: [questions.id] }),
}));

export const examAttemptsRelations = relations(examAttempts, ({ one, many }) => ({
  exam: one(examinations, { fields: [examAttempts.examId], references: [examinations.id] }),
  user: one(users, { fields: [examAttempts.userId], references: [users.id] }),
  answers: many(examineeAnswers),
}));

export const examineeAnswersRelations = relations(examineeAnswers, ({ one }) => ({
  attempt: one(examAttempts, { fields: [examineeAnswers.attemptId], references: [examAttempts.id] }),
  question: one(questions, { fields: [examineeAnswers.questionId], references: [questions.id] }),
  selectedChoice: one(questionChoices, { fields: [examineeAnswers.selectedChoiceId], references: [questionChoices.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
