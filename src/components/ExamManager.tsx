import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import { Examination, Category } from '../types.ts';
import {
  Plus, BookOpen, Clock, CheckCircle2, XCircle, Trash2, Globe, Shield, RefreshCw, X, ShieldCheck
} from 'lucide-react';

interface ExamManagerProps {
  onTakeExam: (examId: number) => void;
}

export const ExamManager: React.FC<ExamManagerProps> = ({ onTakeExam }) => {
  const { user } = useAuth();
  const isExaminee = user?.role === 'EXAMINEE';

  const [exams, setExams] = useState<Examination[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [passPercentage, setPassPercentage] = useState<number>(75);
  const [totalQuestions, setTotalQuestions] = useState<number>(50);
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(true);
  const [randomizeChoices, setRandomizeChoices] = useState<boolean>(true);
  const [isPublished, setIsPublished] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchExams = async () => {
    setLoading(true);
    try {
      const [eRes, cRes] = await Promise.all([
        api.get('/exams'),
        api.get('/questions/categories'),
      ]);
      setExams(eRes.data);
      setCategories(cRes.data);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleOpenCreateModal = () => {
    setTitle('');
    setDescription('');
    setCategoryId('');
    setDurationMinutes(120);
    setPassPercentage(75);
    setTotalQuestions(50);
    setRandomizeQuestions(true);
    setRandomizeChoices(true);
    setIsPublished(false);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Examination title is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await api.post('/exams', {
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        durationMinutes,
        passPercentage,
        totalQuestions,
        randomizeQuestions,
        randomizeChoices,
        isPublished,
      });

      setIsModalOpen(false);
      fetchExams();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to create mock examination');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (examId: number, currentStatus: boolean) => {
    try {
      await api.post(`/exams/${examId}/publish`, { isPublished: !currentStatus });
      fetchExams();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update publication status');
    }
  };

  const handleDeleteExam = async (examId: number) => {
    if (!confirm('Are you sure you want to delete this mock examination?')) return;
    try {
      await api.delete(`/exams/${examId}`);
      fetchExams();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete examination');
    }
  };

  const displayedExams = isExaminee ? exams.filter(e => e.isPublished) : exams;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {isExaminee ? 'SLTCFPDI LET Mock Examinations' : 'LET Mock Examination Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isExaminee
              ? 'Official Licensure Examination for Teachers mock tests created by SLTCFPDI Faculty. Select an examination to begin.'
              : 'Configure time constraints, question counts, randomization settings, and publish mock examinations for examinees.'}
          </p>
        </div>

        {!isExaminee && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-100 transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Mock Exam</span>
          </button>
        )}
      </div>

      {/* Examinee Notice Banner */}
      {isExaminee && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-blue-900 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-950 text-sm">Examinee Portal Guidance</p>
            <p className="mt-0.5 leading-relaxed text-blue-800">
              Select an available mock examination below to launch your session. Once completed, your answers will be automatically submitted and recorded directly into your Faculty and System Administrator control center. Pass/fail determinations are managed by your faculty.
            </p>
          </div>
        </div>
      )}

      {/* Examinations Grid */}
      {displayedExams.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Mock Examinations Available</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isExaminee
              ? 'There are currently no published mock examinations. Please check back later or contact your Faculty instructor.'
              : 'Create and publish a mock examination set to make it available for examinees.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {exam.categoryName || 'All Coverage'}
                  </span>

                  {!isExaminee && (
                    <button
                      onClick={() => handleTogglePublish(exam.id, exam.isPublished)}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition flex items-center space-x-1 ${
                        exam.isPublished
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>{exam.isPublished ? 'Published' : 'Draft'}</span>
                    </button>
                  )}
                </div>

                <h2 className="font-bold text-slate-800 text-base leading-snug">{exam.title}</h2>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{exam.description || 'Simulated LET Mock Examination.'}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Time Limit:</span>
                    <span className="font-bold text-slate-800">{exam.durationMinutes} Minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <span className="font-bold text-slate-800">{exam.questionCount || exam.totalQuestions} Questions</span>
                  </div>
                  {!isExaminee && (
                    <div className="flex justify-between">
                      <span>Pass Threshold:</span>
                      <span className="font-bold text-emerald-700">{exam.passPercentage}% Score</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Question Format:</span>
                    <span className="font-semibold text-slate-800">Multiple Choice (A, B, C, D)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                {isExaminee ? (
                  exam.hasTaken && !exam.canRetake ? (
                    <div className="w-full space-y-2">
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>One-time exam taken. Retake requires Faculty permission.</span>
                      </div>
                      <button
                        disabled
                        className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold border border-slate-200 cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                        <span>Already Submitted</span>
                      </button>
                    </div>
                  ) : exam.hasTaken && exam.canRetake ? (
                    <div className="w-full space-y-2">
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Faculty Granted Permission for Retake</span>
                      </div>
                      <button
                        onClick={() => onTakeExam(exam.id)}
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-100 transition flex items-center justify-center space-x-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Retake Examination</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onTakeExam(exam.id)}
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-100 transition flex items-center justify-center space-x-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Take Examination</span>
                    </button>
                  )
                ) : (
                  <>
                    <button
                      onClick={() => onTakeExam(exam.id)}
                      className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-100"
                    >
                      Preview Test
                    </button>

                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition"
                      title="Delete Exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Configure Mock Examination</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Examination Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., SLTCFPDI Pre-Board LET Mock Examination 2026"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  LET Coverage Focus (Optional)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
                >
                  <option value="">Comprehensive / All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Official examinee instructions..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 120)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Pass Percentage (%)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(parseInt(e.target.value, 10) || 75)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  />
                </div>
              </div>

              {/* Randomization toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="w-4 h-4 text-blue-700 rounded"
                  />
                  <span>Randomize Question Order (Prevents Memorization)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={randomizeChoices}
                    onChange={(e) => setRandomizeChoices(e.target.checked)}
                    className="w-4 h-4 text-blue-700 rounded"
                  />
                  <span>Randomize Choice Options (A, B, C, D)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 pt-2">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Publish Immediately for Examinees</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs shadow-md shadow-blue-100"
                >
                  {saving ? 'Creating...' : 'Create Examination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
