import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import { FacultyDashboardData } from '../types.ts';
import {
  Users, BookOpen, FileSpreadsheet, CheckCircle2, Trophy, Clock, AlertCircle, PlusCircle, RefreshCw, BarChart2
} from 'lucide-react';

interface FacultyAdminDashboardProps {
  onNavigateToQuestions: () => void;
  onNavigateToExams: () => void;
  onNavigateToUsers: () => void;
  onNavigateToReports: () => void;
}

export const FacultyAdminDashboard: React.FC<FacultyAdminDashboardProps> = ({
  onNavigateToQuestions,
  onNavigateToExams,
  onNavigateToUsers,
  onNavigateToReports,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<FacultyDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFacultyDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/faculty/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load faculty analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRetake = async (attemptId: number, currentAllow: boolean) => {
    try {
      await api.post(`/exams/attempts/${attemptId}/allow-retake`, {
        allowRetake: !currentAllow,
      });
      fetchFacultyDashboard();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update retake permission');
    }
  };

  useEffect(() => {
    fetchFacultyDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 font-medium">Loading system analytics dashboard...</p>
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Control Center Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              {user?.role === 'ADMIN' ? 'System Administrator Portal' : 'Faculty Management Portal'}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-2">
              SLTCFPDI LET Exam Control Center
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Monitor examinee performance, manage question banks aligned with LET coverage, and generate reports.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onNavigateToQuestions}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-100 transition flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Question</span>
            </button>
            <button
              onClick={onNavigateToExams}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Create Mock Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Examinees</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{metrics?.totalExaminees || 0}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-none">Active students registered</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Question Bank Items</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{metrics?.totalQuestions || 0}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-none">Across GenEd, ProfEd & Majors</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mock Exams</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{metrics?.totalExams || 0}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-none">Published & Draft sets</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Exam Submissions</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{metrics?.totalAttemptsTaken || 0}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-none">Completed student attempts</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Overall Pass Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{metrics?.systemPassRate || 0}%</span>
            <span className="text-xs font-bold text-green-500">Avg {metrics?.systemAvgScore || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(metrics?.systemPassRate || 0, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* LET Category Items & Distribution */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-1">LET Coverage Question Bank Breakdown</h3>
        <p className="text-xs text-slate-400 mb-4">Distribution of items recorded in the central question bank</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.categoryMetrics.map(cat => (
            <div key={cat.categoryId} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">{cat.code}</span>
                <span className="text-xs font-bold text-slate-500">{cat.questionCount} Items</span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm mt-1">{cat.categoryName}</h4>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Submissions Monitoring */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Recent Examinee Submissions</h3>
            <p className="text-xs text-slate-400">Live monitoring of completed examinee mock examination attempts</p>
          </div>
          <button
            onClick={onNavigateToReports}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            View Full Reports
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/50 sticky top-0">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3">Examinee Name</th>
                <th className="px-6 py-3">Exam Title</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Percentage</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Submitted At</th>
                <th className="px-6 py-3 text-right">Faculty Retake Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 divide-y divide-slate-100">
              {data?.recentAttempts && data.recentAttempts.length > 0 ? (
                data.recentAttempts.map((att: any) => (
                  <tr key={att.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{att.userName}</td>
                    <td className="px-6 py-3.5 text-slate-600">{att.examTitle}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-800">{att.score} / {att.totalPoints}</td>
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
                    <td className="px-6 py-3.5 text-slate-400 text-xs">
                      {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {att.allowRetake ? (
                        <button
                          onClick={() => handleToggleRetake(att.id, true)}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg transition inline-flex items-center space-x-1"
                          title="Click to revoke retake permission"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Retake Granted</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleRetake(att.id, false)}
                          className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold rounded-lg shadow-sm transition inline-flex items-center space-x-1"
                          title="Grant student permission to retake this exam"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Allow Retake</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    No examinee attempts submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Section */}
      {user?.role === 'ADMIN' && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-1">System Audit Logs</h3>
          <p className="text-xs text-slate-400 mb-4">Security and administrative activity trail</p>

          <div className="space-y-2">
            {data?.recentLogs && data.recentLogs.map((log: any) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between items-center border border-slate-200/80">
                <div>
                  <span className="font-bold text-blue-700 mr-2">[{log.action}]</span>
                  <span className="text-slate-700">{log.details}</span>
                  <span className="text-slate-400 ml-2">by {log.userName || 'System'}</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap ml-4">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
