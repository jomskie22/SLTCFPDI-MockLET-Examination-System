import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import {
  Trophy, CheckCircle2, XCircle, Clock, BookOpen, ArrowLeft, RefreshCw, FileText, ShieldAlert
} from 'lucide-react';

interface ExamResultViewProps {
  attemptId: number;
  onBack: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({ attemptId, onBack }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  if (user?.role === 'EXAMINEE') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Results Viewing Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Individual scores and pass/fail evaluations are managed directly by Faculty and System Administrators. Examinee accounts are restricted from viewing examination results.
          </p>
          <button
            onClick={onBack}
            className="px-5 py-2 bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-md hover:bg-blue-800 transition"
          >
            Back to Mock Examinations
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/exams/attempts/${attemptId}/review`);
        setData(res.data);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to load exam result review');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 font-medium">Calculating score breakdown and loading explanations...</p>
      </div>
    );
  }

  if (!data) return null;

  const passed = data.passed;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header Back */}
      <button
        onClick={onBack}
        className="text-slate-600 hover:text-slate-900 font-semibold text-xs flex items-center space-x-1.5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Result Status Banner */}
      <div className={`p-8 rounded-xl text-white shadow-lg border ${
        passed
          ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-emerald-700/50'
          : 'bg-gradient-to-r from-red-950 via-rose-950 to-slate-900 border-red-800/50'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider mb-2">
              {passed ? (
                <span className="bg-emerald-500/30 text-emerald-300 px-3 py-0.5 rounded-full border border-emerald-400/40 flex items-center space-x-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PASSED LET MOCK EXAMINATION</span>
                </span>
              ) : (
                <span className="bg-red-500/30 text-red-300 px-3 py-0.5 rounded-full border border-red-400/40 flex items-center space-x-1 text-[11px]">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>FAILED (NEEDS REVIEW)</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{data.examTitle}</h1>
            <p className="text-slate-300 text-xs mt-1">
              Examinee: <span className="font-semibold text-white">{data.examineeName}</span> ({data.studentId || 'N/A'})
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 text-center min-w-[180px]">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Calculated Score</span>
            <div className="text-3xl font-black text-white mt-1">
              {data.score} / {data.totalPoints}
            </div>
            <div className={`text-lg font-bold mt-1 ${passed ? 'text-emerald-300' : 'text-red-300'}`}>
              {data.percentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Question by Question Detailed Review */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Detailed Answer Key & Source References</h2>
          <p className="text-xs text-slate-500 mt-0.5">Review questions, correct choices, explanations, and recorded source citations</p>
        </div>

        <div className="space-y-6">
          {data.questions.map((q: any, idx: number) => {
            const isUserRight = q.isCorrect;

            return (
              <div
                key={q.id}
                className={`p-6 rounded-xl border transition ${
                  isUserRight
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-red-200 bg-red-50/10'
                }`}
              >
                {/* Question Top Header */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[11px] bg-slate-800 text-white px-2.5 py-0.5 rounded-md">
                      Question {idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {q.categoryName || 'General'}
                    </span>
                  </div>

                  {isUserRight ? (
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>+{q.pointsEarned} Points (Correct)</span>
                    </span>
                  ) : (
                    <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-200 flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>0 Points (Incorrect)</span>
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <p className="text-slate-800 font-bold text-base mb-4 leading-relaxed">
                  {q.questionText}
                </p>

                {/* Choices */}
                <div className="space-y-2 mb-4">
                  {q.choices.map((c: any) => {
                    const isSelected = q.selectedChoiceId === c.id;
                    const isCorrectChoice = c.isCorrect;

                    let bgStyle = 'border-slate-200 bg-white';
                    if (isCorrectChoice) {
                      bgStyle = 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-950';
                    } else if (isSelected && !isCorrectChoice) {
                      bgStyle = 'border-red-500 bg-red-50 font-semibold text-red-950';
                    }

                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-lg border flex items-center justify-between text-xs ${bgStyle}`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-bold">{c.choiceLabel}.</span>
                          <span>{c.choiceText}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] font-bold">
                          {isCorrectChoice && <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Correct Answer</span>}
                          {isSelected && <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">Your Answer</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation & Question Reference Source */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  {q.explanation && (
                    <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-100 text-blue-900">
                      <strong className="block text-blue-950 mb-0.5 font-bold">Explanation:</strong>
                      <span>{q.explanation}</span>
                    </div>
                  )}

                  <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600 flex items-center space-x-2 border border-slate-100">
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <span><strong className="text-slate-700">Source/Reference:</strong> {q.sourceReference}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
