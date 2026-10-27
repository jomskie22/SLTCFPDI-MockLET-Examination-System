import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import { ExamineeDashboardData, Examination, ExamAttempt, ExamineeClearanceStatus } from '../types.ts';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Trophy, CheckCircle2, XCircle, TrendingUp, AlertTriangle, BookOpen, Clock, ArrowRight, RefreshCw, UserCheck,
  ShieldCheck, ShieldAlert, Send, FileText, X, AlertCircle
} from 'lucide-react';

interface ExamineeDashboardProps {
  onTakeExam: (examId: number) => void;
  onReviewAttempt: (attemptId: number) => void;
  onNavigateToExams: () => void;
}

export const ExamineeDashboard: React.FC<ExamineeDashboardProps> = ({
  onTakeExam,
  onReviewAttempt,
  onNavigateToExams,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<ExamineeDashboardData | null>(null);
  const [availableExams, setAvailableExams] = useState<Examination[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [clearance, setClearance] = useState<ExamineeClearanceStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Clearance Request Modal
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [requestExamId, setRequestExamId] = useState<string>('');
  const [requestNotes, setRequestNotes] = useState<string>('Requesting official clearance to take the 2026 LET Mock Examination.');
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);
  const [requestMessage, setRequestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Blocked Exam Warning Modal
  const [blockedModalOpen, setBlockedModalOpen] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, examsRes, historyRes, clearanceRes] = await Promise.all([
        api.get('/analytics/examinee/dashboard'),
        api.get('/exams'),
        api.get('/exams/user/my-history'),
        api.get('/exam-requests/my-status'),
      ]);
      setData(dashRes.data);
      setAvailableExams(examsRes.data.slice(0, 3)); // Top 3
      setAttempts(historyRes.data);
      setClearance(clearanceRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleTakeExamAttempt = (examId: number) => {
    if (!clearance?.isApproved) {
      setBlockedModalOpen(true);
      return;
    }
    onTakeExam(examId);
  };

  const handleSubmitClearanceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    setRequestMessage(null);

    try {
      await api.post('/exam-requests', {
        examId: requestExamId ? parseInt(requestExamId, 10) : null,
        requestNotes,
      });
      setRequestMessage({
        type: 'success',
        text: 'Your examination clearance request has been successfully submitted to the Administrator!',
      });
      setTimeout(() => {
        setRequestModalOpen(false);
        setRequestMessage(null);
        fetchDashboardData();
      }, 1500);
    } catch (err: any) {
      setRequestMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to submit clearance request.',
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-blue-700 animate-spin mb-3" />
        <p className="text-slate-600 font-medium text-sm">Loading your examinee performance dashboard...</p>
      </div>
    );
  }

  const clearanceStatus = clearance?.status || 'NOT_REQUESTED';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Welcome & Student Identity Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                Official Examinee Profile
              </span>
              <span className="text-xs text-slate-500">• SLTCFPDI College of Education</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1.5">
              Welcome back, {user?.fullName || 'Examinee'}!
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Student ID: <span className="font-mono font-bold text-blue-700">{user?.studentId || 'Not assigned'}</span> • Course / Program: <span className="font-semibold text-slate-700">{user?.majorSubject || 'General Education'}</span> • Status: <span className="font-semibold text-slate-700">{user?.yearLevel || 'Graduating Batch'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (!clearance?.isApproved) {
                  setBlockedModalOpen(true);
                } else {
                  onNavigateToExams();
                }
              }}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg text-xs font-semibold text-white shadow-md shadow-blue-100 transition flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Mock Exams</span>
            </button>
          </div>
        </div>
      </div>

      {/* MockLET Clearance Status Card */}
      <div className={`p-5 rounded-xl border shadow-sm transition ${
        clearanceStatus === 'APPROVED'
          ? 'bg-emerald-50/60 border-emerald-200'
          : clearanceStatus === 'PENDING'
          ? 'bg-amber-50/60 border-amber-200'
          : clearanceStatus === 'DECLINED'
          ? 'bg-red-50/60 border-red-200'
          : 'bg-blue-50/50 border-blue-200'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-start space-x-3">
            <div className={`p-2.5 rounded-xl text-white shrink-0 mt-0.5 ${
              clearanceStatus === 'APPROVED'
                ? 'bg-emerald-600'
                : clearanceStatus === 'PENDING'
                ? 'bg-amber-600'
                : clearanceStatus === 'DECLINED'
                ? 'bg-red-600'
                : 'bg-blue-700'
            }`}>
              {clearanceStatus === 'APPROVED' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : clearanceStatus === 'PENDING' ? (
                <Clock className="w-6 h-6" />
              ) : clearanceStatus === 'DECLINED' ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <UserCheck className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-800 text-sm">
                  MockLET Examination Clearance Status:
                </h3>
                {clearanceStatus === 'APPROVED' && (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px] border border-emerald-200">
                    APPROVED & AUTHORIZED
                  </span>
                )}
                {clearanceStatus === 'PENDING' && (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[11px] border border-amber-200 animate-pulse">
                    PENDING ADMIN REVIEW
                  </span>
                )}
                {clearanceStatus === 'DECLINED' && (
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-bold rounded-full text-[11px] border border-red-200">
                    DECLINED
                  </span>
                )}
                {clearanceStatus === 'NOT_REQUESTED' && (
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full text-[11px] border border-blue-200">
                    CLEARANCE REQUIRED
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-1">
                {clearanceStatus === 'APPROVED' && (
                  <span>You have received official administrator clearance to take all published MockLET examinations. Good luck on your board exam preparation!</span>
                )}
                {clearanceStatus === 'PENDING' && (
                  <span>
                    Your request submitted on {clearance?.latestRequest?.requestedAt ? new Date(clearance.latestRequest.requestedAt).toLocaleDateString() : 'recently'} is currently awaiting review. You will be able to take examinations immediately once approved.
                  </span>
                )}
                {clearanceStatus === 'DECLINED' && (
                  <span>
                    Your clearance request was declined. <strong>Administrator Remark:</strong> "{clearance?.latestRequest?.reviewNotes || 'Requirements lacking'}". Please submit an updated clearance request or contact your department.
                  </span>
                )}
                {clearanceStatus === 'NOT_REQUESTED' && (
                  <span>
                    All examinees must submit an official clearance request to the Administrator before taking any MockLET examinations. Submit your request below for prompt approval.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            {clearanceStatus !== 'APPROVED' && (
              <button
                onClick={() => setRequestModalOpen(true)}
                disabled={clearanceStatus === 'PENDING'}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{clearanceStatus === 'DECLINED' ? 'Re-Submit Request' : clearanceStatus === 'PENDING' ? 'Request Pending' : 'Submit Clearance Request'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Exams Completed</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{data?.totalAttempts || 0}</span>
            <span className="text-xs text-slate-500">attempts</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Mock test sessions completed</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{data?.averagePercentage || 0}%</span>
            <span className={`text-xs font-bold ${(data?.averagePercentage || 0) >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
              {(data?.averagePercentage || 0) >= 75 ? 'Passing' : 'Needs Review'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(data?.averagePercentage || 0, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pass Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{data?.passRate || 0}%</span>
            <span className="text-xs text-slate-500">({data?.passedCount || 0} passed)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Passing threshold: 75%</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Board Readiness</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold ${(data?.averagePercentage || 0) >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
              {(data?.averagePercentage || 0) >= 75 ? 'LET Ready' : 'In Preparation'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Target Licensure 2026</p>
        </div>
      </div>

      {/* Available Examinations Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Available Mock Examinations</h3>
            <p className="text-xs text-slate-400">Official simulated examinations assigned by SLTCFPDI faculty</p>
          </div>
          <button
            onClick={onNavigateToExams}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center space-x-1"
          >
            <span>View All Exams</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableExams.map((exam) => (
            <div key={exam.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition flex flex-col justify-between bg-white shadow-sm">
              <div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {exam.categoryName || 'General Coverage'}
                </span>
                <h4 className="font-bold text-slate-800 mt-2 text-sm leading-snug">{exam.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{exam.description || 'Standard LET mock examination.'}</p>
                <div className="flex items-center space-x-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.durationMinutes} mins</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.totalQuestions} Questions</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Passing: <span className="font-bold text-slate-800">{exam.passPercentage}%</span>
                </span>
                <button
                  onClick={() => handleTakeExamAttempt(exam.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
                    clearance?.isApproved
                      ? 'bg-blue-700 hover:bg-blue-800 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                  }`}
                >
                  {clearance?.isApproved ? 'Take Exam' : 'Clearance Required'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Progression Line Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Score Progression</h3>
            <span className="text-xs font-semibold text-slate-400">Historical Trend</span>
          </div>
          <div className="h-64 w-full">
            {data?.progressHistory && data.progressHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.progressHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Score']} />
                  <Line type="monotone" dataKey="percentage" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4, fill: '#1d4ed8' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                No mock exam attempts recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Competency Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Competency Breakdown</h3>
            <span className="text-xs font-semibold text-slate-400">% Accuracy</span>
          </div>
          <div className="h-64 w-full">
            {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} interval={0} tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + '...' : val} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Accuracy']} />
                  <Bar dataKey="accuracy" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                Competency breakdown will display after exam completion.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Past Exam History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Past Mock Examination Attempts</h3>
          <span className="text-xs font-semibold text-slate-400">Total Attempts: {attempts.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/50 sticky top-0">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3">Exam Title</th>
                <th className="px-6 py-3">Date Taken</th>
                <th className="px-6 py-3">Raw Score</th>
                <th className="px-6 py-3">Percentage</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 divide-y divide-slate-100">
              {attempts.map((att) => (
                <tr key={att.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-semibold text-slate-800">{att.examTitle}</td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">
                    {att.score} / {att.totalPoints}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-blue-700">{att.percentage}%</td>
                  <td className="px-6 py-3.5">
                    {att.passed ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                        PASSED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                        FAILED
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => onReviewAttempt(att.id)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs italic">
                    You have not taken any mock examinations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REQUEST CLEARANCE MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Send className="w-5 h-5 text-blue-700" />
                <span>Submit MockLET Examination Request</span>
              </h3>
              <button
                onClick={() => setRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Your request will be submitted to the College of Education Administrator for verification against the official student database.
            </p>

            {requestMessage && (
              <div className={`p-3 rounded-xl text-xs mb-4 flex items-start space-x-2 ${
                requestMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {requestMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{requestMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitClearanceRequest} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div><strong>Student ID:</strong> <span className="font-mono text-blue-700">{user?.studentId}</span></div>
                <div><strong>Examinee Name:</strong> {user?.fullName}</div>
                <div><strong>Course / Track:</strong> {user?.majorSubject || 'General Education'}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Examination Set</label>
                <select
                  value={requestExamId}
                  onChange={(e) => setRequestExamId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">General Pre-Board MockLET Clearance (All Available Exams)</option>
                  {availableExams.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Request Notes / Purpose *</label>
                <textarea
                  rows={3}
                  required
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g., Requesting official clearance to take the 2026 LET Mock Examination."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5"
                >
                  {submittingRequest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Clearance Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCKED ACCESS WARNING MODAL */}
      {blockedModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">MockLET Clearance Required</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {clearanceStatus === 'PENDING' ? (
                <>Your examination clearance request is currently <span className="font-bold text-amber-700">PENDING Administrator Review</span>. You cannot launch mock exams until your request is approved.</>
              ) : clearanceStatus === 'DECLINED' ? (
                <>Your previous clearance request was <span className="font-bold text-red-600">DECLINED</span>. Reason: "{clearance?.latestRequest?.reviewNotes || 'Not cleared'}". Please submit a new clearance request.</>
              ) : (
                <>You must first submit an official <span className="font-bold text-blue-700">Request to Take the MockLET Examination</span> and receive Administrator approval before accessing mock tests.</>
              )}
            </p>

            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setBlockedModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Close
              </button>
              {clearanceStatus !== 'PENDING' && (
                <button
                  onClick={() => {
                    setBlockedModalOpen(false);
                    setRequestModalOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm"
                >
                  Submit Clearance Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
