import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import {
  Clock, Flag, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, X, ShieldCheck
} from 'lucide-react';

interface QuestionChoice {
  id: number;
  choiceLabel: string;
  choiceText: string;
}

interface QuestionItem {
  id: number;
  categoryId: number;
  questionText: string;
  pointValue: number;
  choices: QuestionChoice[];
}

interface ExamTakingViewProps {
  examId: number;
  onSubmitted: (attemptId: number) => void;
  onCancel: () => void;
}

export const ExamTakingView: React.FC<ExamTakingViewProps> = ({ examId, onSubmitted, onCancel }) => {
  const { user } = useAuth();
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [examTitle, setExamTitle] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Examinee answers state: questionId -> { selectedChoiceId, isFlagged }
  const [userAnswers, setUserAnswers] = useState<Record<number, { selectedChoiceId: number | null; isFlagged: boolean }>>({});

  const [secondsRemaining, setSecondsRemaining] = useState<number>(120 * 60);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  // Initialize Exam Session
  useEffect(() => {
    const startSession = async () => {
      setLoading(true);
      try {
        const res = await api.post(`/exams/${examId}/start`);
        const { attemptId: attId, examTitle: title, durationMinutes: duration, questions: qList } = res.data;

        setAttemptId(attId);
        setExamTitle(title);
        setDurationMinutes(duration);
        setQuestions(qList);
        setSecondsRemaining(duration * 60);

        // Init blank answers map
        const initialMap: Record<number, { selectedChoiceId: number | null; isFlagged: boolean }> = {};
        qList.forEach((q: QuestionItem) => {
          initialMap[q.id] = { selectedChoiceId: null, isFlagged: false };
        });
        setUserAnswers(initialMap);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to start exam session');
        onCancel();
      } finally {
        setLoading(false);
      }
    };

    startSession();
  }, [examId]);

  // Countdown Timer
  useEffect(() => {
    if (loading || submitting || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, submitting, secondsRemaining]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectChoice = (choiceId: number) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;

    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedChoiceId: choiceId,
      },
    }));

    // Async sync with server
    api.post(`/exams/attempts/${attemptId}/answer`, {
      questionId: qId,
      selectedChoiceId: choiceId,
      isFlagged: userAnswers[qId]?.isFlagged || false,
    }).catch(console.error);
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    const newFlagged = !userAnswers[qId]?.isFlagged;

    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        isFlagged: newFlagged,
      },
    }));

    api.post(`/exams/attempts/${attemptId}/answer`, {
      questionId: qId,
      selectedChoiceId: userAnswers[qId]?.selectedChoiceId || null,
      isFlagged: newFlagged,
    }).catch(console.error);
  };

  const handleClearSelection = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;

    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedChoiceId: null,
      },
    }));

    api.post(`/exams/attempts/${attemptId}/answer`, {
      questionId: qId,
      selectedChoiceId: null,
      isFlagged: userAnswers[qId]?.isFlagged || false,
    }).catch(console.error);
  };

  const handleFinalSubmit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    try {
      const answersPayload = Object.entries(userAnswers).map(([qId, val]) => ({
        questionId: parseInt(qId, 10),
        selectedChoiceId: (val as { selectedChoiceId: number | null; isFlagged: boolean }).selectedChoiceId,
        isFlagged: (val as { selectedChoiceId: number | null; isFlagged: boolean }).isFlagged,
      }));

      const timeSpent = durationMinutes * 60 - secondsRemaining;

      const res = await api.post(`/exams/attempts/${attemptId}/submit`, {
        timeSpentSeconds: timeSpent,
        answers: answersPayload,
      });

      if (user?.role === 'EXAMINEE') {
        setIsSubmittedSuccess(true);
      } else {
        onSubmitted(attemptId);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit exam');
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    alert('Time has expired! Your examination answers are being submitted automatically.');
    handleFinalSubmit();
  };

  if (isSubmittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              EXAMINATION SUBMITTED SUCCESSFULLY
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-3">
              Your Exam Responses Have Been Recorded
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Submission completed for <span className="font-semibold text-slate-800">"{examTitle}"</span>.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-left text-xs text-blue-900 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-blue-950 text-sm">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Official Institutional Record Notice</span>
            </div>
            <p className="leading-relaxed text-blue-800">
              In compliance with SLTCFPDI academic examination policy, individual pass/fail scores and answer rationalizations are restricted from direct student view upon test submission. Your exam performance metrics have been securely saved and transmitted to your Faculty/Instructor and System Administrator for official evaluation.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm shadow-md shadow-blue-100 transition"
            >
              Return to Mock Examinations List
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-700 font-semibold text-lg">Initializing LET Examination Environment...</p>
        <p className="text-slate-500 text-sm mt-1">Randomizing questions & options...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id] : null;

  const answerList = Object.values(userAnswers) as { selectedChoiceId: number | null; isFlagged: boolean }[];
  const answeredCount = answerList.filter(a => a.selectedChoiceId !== null).length;
  const flaggedCount = answerList.filter(a => a.isFlagged).length;
  const unansweredCount = questions.length - answeredCount;

  // Timer color
  const isTimeCritical = secondsRemaining < 300; // < 5 mins
  const isTimeWarning = secondsRemaining < 600; // < 10 mins

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Fixed Control Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md mb-6 sticky top-20 z-30 flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-800">
            OFFICIAL MOCK EXAM IN PROGRESS
          </span>
          <h1 className="text-base font-bold text-white mt-1">{examTitle}</h1>
        </div>

        {/* Timer Box */}
        <div className="flex items-center space-x-6">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-mono text-lg font-bold border ${
            isTimeCritical
              ? 'bg-red-950/90 text-red-200 border-red-800 animate-pulse'
              : isTimeWarning
              ? 'bg-amber-950/90 text-amber-200 border-amber-800'
              : 'bg-slate-800 text-emerald-400 border-slate-700'
          }`}>
            <Clock className="w-5 h-5" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-md transition"
          >
            Submit Examination
          </button>
        </div>
      </div>

      {/* Main Examination Layout: Sidebar Grid + Question Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Palette Sidebar */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Question Palette</span>
            <span className="text-xs text-slate-500 font-semibold">{answeredCount}/{questions.length} Answered</span>
          </h2>

          <div className="grid grid-cols-5 gap-2 max-h-80 overflow-y-auto p-1">
            {questions.map((q, idx) => {
              const ans = userAnswers[q.id];
              const isCurrent = idx === currentIndex;
              const isAnswered = ans?.selectedChoiceId !== null && ans?.selectedChoiceId !== undefined;
              const isFlagged = ans?.isFlagged;

              let btnStyle = 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200';
              if (isCurrent) {
                btnStyle = 'ring-2 ring-blue-700 bg-blue-700 text-white font-bold';
              } else if (isFlagged) {
                btnStyle = 'bg-amber-500 text-white font-bold border-amber-600';
              } else if (isAnswered) {
                btnStyle = 'bg-emerald-600 text-white font-bold border-emerald-700';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center relative transition border ${btnStyle}`}
                >
                  {idx + 1}
                  {isFlagged && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-300 rounded-full"></span>}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 bg-blue-700 rounded"></span>
              <span>Current Question</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 bg-emerald-600 rounded"></span>
              <span>Answered</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 bg-amber-500 rounded"></span>
              <span>Flagged for Review ({flaggedCount})</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 bg-slate-100 border border-slate-200 rounded"></span>
              <span>Unanswered ({unansweredCount})</span>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[500px]">
          {currentQuestion && (
            <div>
              {/* Question Header */}
              <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <span className="bg-slate-800 text-white font-bold text-xs px-3 py-1 rounded-md">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                    {currentQuestion.pointValue} {currentQuestion.pointValue === 1 ? 'Point' : 'Points'}
                  </span>
                </div>

                <button
                  onClick={handleToggleFlag}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 border ${
                    currentAnswer?.isFlagged
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <Flag className={`w-4 h-4 ${currentAnswer?.isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span>{currentAnswer?.isFlagged ? 'Flagged for Review' : 'Flag for Review'}</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-slate-800 font-bold text-base leading-relaxed mb-6">
                {currentQuestion.questionText}
              </div>

              {/* Choices Options */}
              <div className="space-y-3">
                {currentQuestion.choices.map((choice) => {
                  const isSelected = currentAnswer?.selectedChoiceId === choice.id;

                  return (
                    <label
                      key={choice.id}
                      onClick={() => handleSelectChoice(choice.id)}
                      className={`flex items-start space-x-3.5 p-3.5 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-700 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        isSelected ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 text-slate-600 bg-white'
                      }`}>
                        {choice.choiceLabel}
                      </div>
                      <span className="text-slate-800 font-medium text-sm leading-snug">
                        {choice.choiceText}
                      </span>
                    </label>
                  );
                })}
              </div>

              {currentAnswer?.selectedChoiceId !== null && (
                <div className="mt-4 text-right">
                  <button
                    onClick={handleClearSelection}
                    className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                  >
                    Clear answer choice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-100 transition flex items-center space-x-1.5"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition"
              >
                Finish & Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-base font-bold text-slate-800">Confirm Examination Submission</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to submit your LET mock examination?
            </p>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs text-slate-700 mb-6">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold">{questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Answered Questions:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Flagged Questions:</span>
                <span className="font-bold">{flaggedCount}</span>
              </div>
              <div className="flex justify-between text-red-700">
                <span>Unanswered Questions:</span>
                <span className="font-bold">{unansweredCount}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-6 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>You still have {unansweredCount} unanswered questions. Unanswered questions will receive 0 points.</span>
              </div>
            )}

            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-50"
              >
                Return to Exam
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-md"
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
