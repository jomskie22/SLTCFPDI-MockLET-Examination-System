import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import { ExamRequestRecord } from '../types.ts';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Search, Filter, RefreshCw, AlertTriangle,
  UserCheck, Check, X, FileText, Send, UserX
} from 'lucide-react';

export const ExamRequestManager: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [requests, setRequests] = useState<ExamRequestRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [declinedCount, setDeclinedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DECLINED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Action State for Review Modals
  const [selectedRequest, setSelectedRequest] = useState<ExamRequestRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'DECLINED' | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exam-requests', {
        params: { status: activeFilter === 'ALL' ? undefined : activeFilter },
      });
      setRequests(res.data.requests || []);
      setTotalCount(res.data.total || 0);
      setPendingCount(res.data.pendingCount || 0);
      setApprovedCount(res.data.approvedCount || 0);
      setDeclinedCount(res.data.declinedCount || 0);
    } catch (err) {
      console.error('Failed to fetch exam requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeFilter]);

  const handleOpenReview = (req: ExamRequestRecord, action: 'APPROVED' | 'DECLINED') => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewNotes(action === 'APPROVED' ? 'Verified student identity and graduation masterlist. Approved for MockLET exam.' : 'Incomplete graduation records or requirements.');
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !reviewAction) return;

    setSubmittingReview(true);
    try {
      await api.put(`/exam-requests/${selectedRequest.id}/review`, {
        status: reviewAction,
        reviewNotes,
      });
      setSelectedRequest(null);
      setReviewAction(null);
      setReviewNotes('');
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit clearance review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filtered = requests.filter(r => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.studentId.toLowerCase().includes(q) ||
      (r.fullName && r.fullName.toLowerCase().includes(q)) ||
      (r.course && r.course.toLowerCase().includes(q)) ||
      (r.examTitle && r.examTitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                Examination Approvals
              </span>
              <span className="text-xs text-slate-500">• MockLET Gatekeeper</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1.5 flex items-center space-x-2">
              <ShieldCheck className="w-7 h-7 text-blue-700" />
              <span>Examinee MockLET Clearance Approvals</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Review and manage examinee requests to take the MockLET examination. Only approved students can access examination sets.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm transition flex items-center space-x-1.5"
          >
            <RefreshCw className="w-4 h-4 text-blue-700" />
            <span>Refresh Requests</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveFilter('ALL')}
          className={`p-5 rounded-xl border transition cursor-pointer shadow-sm ${
            activeFilter === 'ALL' ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Requests</p>
          <span className="text-3xl font-bold text-slate-800">{totalCount}</span>
          <p className="text-[11px] text-slate-500 mt-2">All submitted clearances</p>
        </div>

        <div
          onClick={() => setActiveFilter('PENDING')}
          className={`p-5 rounded-xl border transition cursor-pointer shadow-sm ${
            activeFilter === 'PENDING' ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Review</p>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <span className="text-3xl font-bold text-amber-700">{pendingCount}</span>
          <p className="text-[11px] text-slate-500 mt-2">Awaiting Admin action</p>
        </div>

        <div
          onClick={() => setActiveFilter('APPROVED')}
          className={`p-5 rounded-xl border transition cursor-pointer shadow-sm ${
            activeFilter === 'APPROVED' ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Approved Examinees</p>
          <span className="text-3xl font-bold text-emerald-700">{approvedCount}</span>
          <p className="text-[11px] text-slate-500 mt-2">Authorized to take MockLET</p>
        </div>

        <div
          onClick={() => setActiveFilter('DECLINED')}
          className={`p-5 rounded-xl border transition cursor-pointer shadow-sm ${
            activeFilter === 'DECLINED' ? 'bg-red-50/60 border-red-300 ring-2 ring-red-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Declined Requests</p>
          <span className="text-3xl font-bold text-red-700">{declinedCount}</span>
          <p className="text-[11px] text-slate-500 mt-2">Blocked / requirements lacking</p>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-slate-50/40">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'PENDING', 'APPROVED', 'DECLINED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeFilter === tab
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab === 'ALL' ? 'All Clearances' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Student ID, name, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/70 sticky top-0">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3">Student ID</th>
                <th className="px-5 py-3">Examinee Details</th>
                <th className="px-5 py-3">Target Exam / Clearance</th>
                <th className="px-5 py-3">Request Date & Notes</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Review Details</th>
                <th className="px-5 py-3 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <RefreshCw className="w-6 h-6 text-blue-700 animate-spin mx-auto mb-2" />
                    <span className="text-xs text-slate-400">Loading examinee clearance requests...</span>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-blue-700 text-xs">
                      {r.studentId}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-800 text-xs">{r.fullName || r.userName}</div>
                      <div className="text-[11px] text-slate-500">{r.course} • Class {r.yearGraduated}</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-700 font-medium">
                      {r.examTitle ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                          {r.examTitle}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          General MockLET Clearance
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <div className="text-slate-400">{new Date(r.requestedAt).toLocaleString()}</div>
                      {r.requestNotes && (
                        <div className="text-slate-600 italic text-[11px] mt-0.5 line-clamp-1" title={r.requestNotes}>
                          "{r.requestNotes}"
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {r.status === 'APPROVED' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>APPROVED</span>
                        </span>
                      )}
                      {r.status === 'PENDING' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>PENDING</span>
                        </span>
                      )}
                      {r.status === 'DECLINED' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3 h-3 text-red-600" />
                          <span>DECLINED</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {r.reviewedAt ? (
                        <div>
                          <div className="text-slate-700 font-semibold">{r.reviewerName || 'Admin'}</div>
                          <div className="text-slate-400 text-[10px]">{new Date(r.reviewedAt).toLocaleDateString()}</div>
                          {r.reviewNotes && (
                            <div className="text-slate-500 text-[11px] italic mt-0.5" title={r.reviewNotes}>
                              {r.reviewNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Pending Review</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenReview(r, 'APPROVED')}
                          disabled={r.status === 'APPROVED'}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white rounded-md text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
                          title="Approve Examinee Clearance"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleOpenReview(r, 'DECLINED')}
                          disabled={r.status === 'DECLINED'}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white rounded-md text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
                          title="Decline Clearance with reason"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs italic">
                    No examinee clearance requests match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal (Approve or Decline) */}
      {selectedRequest && reviewAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                {reviewAction === 'APPROVED' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Approve MockLET Examination Clearance</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Decline MockLET Examination Clearance</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => { setSelectedRequest(null); setReviewAction(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              {reviewAction === 'APPROVED'
                ? 'Examinee will be granted full access to take authorized MockLET examinations.'
                : 'Examinee access to mock examinations will be blocked until re-cleared.'}
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 mb-4">
              <div><strong>Student ID:</strong> <span className="font-mono text-blue-700">{selectedRequest.studentId}</span></div>
              <div><strong>Examinee:</strong> {selectedRequest.fullName || selectedRequest.userName}</div>
              <div><strong>Course:</strong> {selectedRequest.course} ({selectedRequest.yearGraduated})</div>
              {selectedRequest.requestNotes && (
                <div><strong>Student Note:</strong> <span className="italic">{selectedRequest.requestNotes}</span></div>
              )}
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {reviewAction === 'APPROVED' ? 'Approval Remarks (Optional)' : 'Decline Reason / Administrative Feedback *'}
                </label>
                <textarea
                  rows={3}
                  required={reviewAction === 'DECLINED'}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVED'
                      ? 'e.g., Verified in graduation masterlist. Approved for LET pre-board examination.'
                      : 'e.g., Incomplete graduation clearance documents. Please verify with registrar.'
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setSelectedRequest(null); setReviewAction(null); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm transition ${
                    reviewAction === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submittingReview
                    ? 'Processing...'
                    : reviewAction === 'APPROVED'
                    ? 'Confirm Approval'
                    : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
