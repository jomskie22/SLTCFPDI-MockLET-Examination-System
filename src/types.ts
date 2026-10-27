export type Role = 'ADMIN' | 'FACULTY' | 'EXAMINEE';

export interface User {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: Role;
  studentId?: string | null;
  department?: string | null;
  majorSubject?: string | null;
  yearLevel?: string | null;
  contactNumber?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  topics?: Topic[];
}

export interface Topic {
  id: number;
  categoryId: number;
  name: string;
  description?: string | null;
}

export interface Choice {
  id?: number;
  questionId?: number;
  choiceLabel: string;
  choiceText: string;
  isCorrect?: boolean;
}

export interface Question {
  id: number;
  categoryId: number;
  topicId?: number | null;
  questionText: string;
  explanation?: string | null;
  pointValue: number;
  sourceReference: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  categoryName?: string;
  categoryCode?: string;
  topicName?: string;
  creatorName?: string;
  choices: Choice[];
  createdAt?: string;
}

export interface Examination {
  id: number;
  title: string;
  description?: string | null;
  categoryId?: number | null;
  durationMinutes: number;
  passPercentage: number;
  totalQuestions: number;
  randomizeQuestions: boolean;
  randomizeChoices: boolean;
  isPublished: boolean;
  categoryName?: string;
  creatorName?: string;
  questionCount?: number;
  attemptCount?: number;
  hasTaken?: boolean;
  canRetake?: boolean;
  retakeGranted?: boolean;
  lastScore?: string | null;
  lastStatus?: string | null;
  passed?: boolean;
  createdAt?: string;
}

export interface ExamAttempt {
  id: number;
  examId: number;
  examTitle?: string;
  userId: number;
  score: number;
  totalPoints: number;
  percentage: string;
  passed: boolean;
  startedAt: string;
  submittedAt?: string | null;
  timeSpentSeconds: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  allowRetake?: boolean;
}

export interface ExamineeDashboardData {
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  averagePercentage: number;
  strengths: string[];
  weaknesses: string[];
  progressHistory: {
    attemptNumber: number;
    date: string;
    examTitle: string;
    percentage: number;
    passed: boolean;
  }[];
  categoryBreakdown: {
    subject: string;
    accuracy: number;
    totalQuestionsAnswered: number;
    correctCount: number;
    status: 'Mastered' | 'Proficient' | 'Needs Focus';
  }[];
}

export interface FacultyDashboardData {
  metrics: {
    totalExaminees: number;
    totalFaculty: number;
    totalQuestions: number;
    totalExams: number;
    totalAttemptsTaken: number;
    systemPassRate: number;
    systemAvgScore: number;
  };
  categoryMetrics: {
    categoryId: number;
    categoryName: string;
    code: string;
    questionCount: number;
  }[];
  recentAttempts: any[];
  recentLogs: any[];
}

export interface StudentMasterlistRecord {
  id: number;
  studentId: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  course: string;
  yearGraduated: string;
  createdAt: string;
  updatedAt?: string;
  uploadedById?: number | null;
  uploadedByName?: string | null;
  uploadedByRole?: string | null;
}

export interface ExamRequestRecord {
  id: number;
  userId: number;
  studentId: string;
  examId?: number | null;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  requestNotes?: string | null;
  reviewNotes?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedById?: number | null;
  reviewerName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  examTitle?: string | null;
  fullName?: string | null;
  course?: string | null;
  yearGraduated?: string | null;
}

export interface ExamineeClearanceStatus {
  hasRequest: boolean;
  isApproved: boolean;
  isPending: boolean;
  isDeclined: boolean;
  status: 'APPROVED' | 'PENDING' | 'DECLINED' | 'NOT_REQUESTED';
  latestRequest?: ExamRequestRecord | null;
  allRequests: ExamRequestRecord[];
  verifiedStudent?: {
    studentId: string;
    fullName: string;
    course: string;
    yearGraduated: string;
  } | null;
}

export interface ExamineeLoginResult {
  approved: boolean;
  status: 'APPROVED' | 'PENDING' | 'DECLINED';
  token?: string;
  user?: User;
  student: {
    studentId: string;
    fullName: string;
    course: string;
    yearGraduated: string;
  };
  message: string;
  reviewNotes?: string | null;
  requestedAt?: string;
}

