import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ExamineeDashboard } from './components/ExamineeDashboard.tsx';
import { FacultyAdminDashboard } from './components/FacultyAdminDashboard.tsx';
import { ExamTakingView } from './components/ExamTakingView.tsx';
import { ExamResultView } from './components/ExamResultView.tsx';
import { QuestionBankManager } from './components/QuestionBankManager.tsx';
import { ExamManager } from './components/ExamManager.tsx';
import { UserManager } from './components/UserManager.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { StudentMasterlistManager } from './components/StudentMasterlistManager.tsx';
import { ExamRequestManager } from './components/ExamRequestManager.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { GraduationCap, BookOpen, ShieldCheck, RefreshCw } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Guard for examinees: examinee can view dashboard, exams list & taking interface
  React.useEffect(() => {
    if (user?.role === 'EXAMINEE') {
      if (activeTab !== 'exams' && activeTab !== 'taking-exam' && activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      }
    }
  }, [user, activeTab]);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleTakeExam = (examId: number) => {
    if (!user) {
      handleOpenAuth('login');
      return;
    }
    setActiveExamId(examId);
    setActiveTab('taking-exam');
  };

  const handleReviewAttempt = (attemptId: number) => {
    if (user?.role === 'EXAMINEE') return; // Examinees do not view pass/fail review
    setActiveAttemptId(attemptId);
    setActiveTab('review-attempt');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-800">
        <RefreshCw className="w-10 h-10 text-blue-700 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">SLTCFPDI LET Mock Examination System</h2>
        <p className="text-sm text-slate-500 mt-1">Authenticating session & loading resources...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuth}
      />

      <main className="flex-1 pb-16">
        {!user && activeTab !== 'taking-exam' ? (
          /* Public Hero Section when not logged in */
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-slate-900 shadow-sm border border-slate-200 text-center max-w-4xl mx-auto space-y-6">
              <div className="inline-flex p-4 bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200">
                <GraduationCap className="w-10 h-10" />
              </div>
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Southern Luzon Technological College Foundation Pio Duran Inc.
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight leading-tight">
                Online Automated LET Mock Examination & Performance Monitoring System
              </h1>
              <p className="text-slate-500 text-base max-w-2xl mx-auto leading-relaxed">
                Take realistic, time-constrained LET mock examinations, get automated instant scoring, receive question rationalizations with source references, and track board exam readiness.
              </p>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-md shadow-blue-100 transition text-sm"
                >
                  Log In to Portal
                </button>
                <button
                  onClick={() => handleOpenAuth('register')}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-sm transition text-sm"
                >
                  Student Registration
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Logged In Dynamic Views */
          <>
            {activeTab === 'dashboard' && (
              user?.role === 'EXAMINEE' ? (
                <ExamineeDashboard
                  onTakeExam={handleTakeExam}
                  onReviewAttempt={handleReviewAttempt}
                  onNavigateToExams={() => setActiveTab('exams')}
                />
              ) : (
                <FacultyAdminDashboard
                  onNavigateToQuestions={() => setActiveTab('questions')}
                  onNavigateToExams={() => setActiveTab('exams')}
                  onNavigateToUsers={() => setActiveTab('users')}
                  onNavigateToReports={() => setActiveTab('reports')}
                  onNavigateToStudents={() => setActiveTab('students')}
                  onNavigateToClearance={() => setActiveTab('clearance')}
                />
              )
            )}

            {activeTab === 'students' && (user?.role === 'ADMIN' || user?.role === 'FACULTY') && (
              <StudentMasterlistManager />
            )}

            {activeTab === 'clearance' && (user?.role === 'ADMIN' || user?.role === 'FACULTY') && (
              <ExamRequestManager />
            )}

            {activeTab === 'exams' && (
              <ExamManager onTakeExam={handleTakeExam} />
            )}

            {activeTab === 'taking-exam' && activeExamId && (
              <ExamTakingView
                examId={activeExamId}
                onSubmitted={(attId) => {
                  if (user?.role === 'EXAMINEE') {
                    setActiveTab('exams');
                  } else {
                    handleReviewAttempt(attId);
                  }
                }}
                onCancel={() => setActiveTab('exams')}
              />
            )}

            {activeTab === 'review-attempt' && activeAttemptId && user?.role !== 'EXAMINEE' && (
              <ExamResultView
                attemptId={activeAttemptId}
                onBack={() => setActiveTab('dashboard')}
              />
            )}

            {activeTab === 'questions' && (user?.role === 'ADMIN' || user?.role === 'FACULTY') && (
              <QuestionBankManager />
            )}

            {activeTab === 'users' && user?.role === 'ADMIN' && (
              <UserManager />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="font-semibold text-slate-300">
            Southern Luzon Technological College Foundation Pio Duran Incorporated (SLTCFPDI)
          </p>
          <p>© 2026 Online Web-Based LET Mock Examination and Examinee Performance Monitoring System. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
