import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import { ExamineeDashboardData, Examination, ExamAttempt } from '../types.ts';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Trophy, CheckCircle2, XCircle, TrendingUp, AlertTriangle, BookOpen, Clock, ArrowRight, RefreshCw, UserCheck
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
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, examsRes, historyRes] = await Promise.all([
        api.get('/analytics/examinee/dashboard'),
        api.get('/exams'),
        api.get('/exams/user/my-history'),
      ]);
      setData(dashRes.data);
      setAvailableExams(examsRes.data.slice(0, 3)); // Top 3
      setAttempts(historyRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 font-medium">Loading your examinee performance dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome back, {user?.fullName || 'Examinee'}!
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Examinee ID: <span className="font-mono font-semibold text-slate-800">{user?.studentId || '2024-LET-9831'}</span> • Major: <span className="font-semibold text-slate-800">{user?.majorSubject || 'General Education'}</span> • Year Level: <span className="font-semibold text-slate-800">{user?.yearLevel || '4th Year'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToExams}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-semibold text-white shadow-md shadow-blue-100 transition flex items-center space-x-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Take New Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Exams Completed</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{data?.totalAttempts || 0}</span>
            <span className="text-xs text-slate-500">attempts</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-none">Completed mock test sessions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{data?.averagePercentage || 0}%</span>
            <span className={`text-xs font-bold ${(data?.averagePercentage || 0) >= 75 ? 'text-green-500' : 'text-amber-500'}`}>
              {(data?.averagePercentage || 0) >= 75 ? 'Passing' : 'Needs Review'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(data?.averagePercentage || 0, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Passing Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{data?.passRate || 0}%</span>
            <span className="text-xs text-slate-500">({data?.passedCount || 0} passed)</span>
          </div>
          <div className="flex gap-1 mt-3">
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Board Readiness</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${(data?.averagePercentage || 0) >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
              {(data?.averagePercentage || 0) >= 75 ? 'LET Ready' : 'In Preparation'}
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">M</div>
            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">T</div>
            <div className="w-6 h-6 rounded-md bg-blue-700 flex items-center justify-center text-[10px] font-bold text-white">W</div>
            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">T</div>
            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">F</div>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses Identification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3>Identified Strengths</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            LET coverage subjects where you have demonstrated high accuracy (&ge; 75%):
          </p>
          <div className="flex flex-wrap gap-2">
            {data?.strengths && data.strengths.length > 0 ? (
              data.strengths.map((str, idx) => (
                <span key={idx} className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  ✓ {str}
                </span>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Complete mock exams to identify your strongest subjects.</p>
            )}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3>Weaknesses & Recommended Review</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            LET coverage subjects requiring further review (&lt; 75% accuracy):
          </p>
          <div className="flex flex-wrap gap-2">
            {data?.weaknesses && data.weaknesses.length > 0 ? (
              data.weaknesses.map((wk, idx) => (
                <span key={idx} className="bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                  ⚠ {wk}
                </span>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No critical subject weaknesses detected.</p>
            )}
          </div>
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
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Score']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.examTitle || label}
                  />
                  <Line type="monotone" dataKey="percentage" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4, fill: '#1d4ed8' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No exam history data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Subject Mastery Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Competency Breakdown</h3>
            <span className="text-xs font-semibold text-slate-400 font-mono">% Accuracy</span>
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
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Subject breakdown will appear after exam completion.
              </div>
            )}
          </div>
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
            <span>View All</span>
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
                <h4 className="font-bold text-slate-800 mt-2 text-base leading-snug">{exam.title}</h4>
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
                {exam.lastScore ? (
                  <span className="text-xs font-medium text-slate-500">
                    Last: <span className="font-bold text-slate-800">{exam.lastScore}</span>
                  </span>
                ) : (
                  <span className="text-xs text-emerald-600 font-bold">New Exam</span>
                )}
                <button
                  onClick={() => onTakeExam(exam.id)}
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-100 transition"
                >
                  Take Exam
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Exam History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Recent Mock Examination Attempts</h3>
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
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                    You have not taken any mock examinations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
