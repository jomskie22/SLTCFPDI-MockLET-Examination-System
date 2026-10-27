import React, { useState, useEffect } from 'react';
import api from '../lib/api.ts';
import { Question, Category, Topic } from '../types.ts';
import {
  Plus, Search, Edit3, Trash2, BookOpen, AlertCircle, CheckCircle2, FileText, Filter, X
} from 'lucide-react';

export const QuestionBankManager: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form Fields
  const [categoryId, setCategoryId] = useState<string>('');
  const [topicId, setTopicId] = useState<string>('');
  const [questionText, setQuestionText] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [pointValue, setPointValue] = useState<number>(1);
  const [sourceReference, setSourceReference] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  // Choices State (A, B, C, D)
  const [choices, setChoices] = useState([
    { choiceLabel: 'A', choiceText: '', isCorrect: true },
    { choiceLabel: 'B', choiceText: '', isCorrect: false },
    { choiceLabel: 'C', choiceText: '', isCorrect: false },
    { choiceLabel: 'D', choiceText: '', isCorrect: false },
  ]);

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchQuestionsAndCategories = async () => {
    setLoading(true);
    try {
      const [qRes, cRes] = await Promise.all([
        api.get('/questions'),
        api.get('/questions/categories'),
      ]);
      setQuestions(qRes.data);
      setCategories(cRes.data);
    } catch (err) {
      console.error('Failed to fetch question bank:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionsAndCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingQuestion(null);
    setCategoryId(categories[0]?.id.toString() || '');
    setTopicId('');
    setQuestionText('');
    setExplanation('');
    setPointValue(1);
    setSourceReference('');
    setDifficulty('Medium');
    setChoices([
      { choiceLabel: 'A', choiceText: '', isCorrect: true },
      { choiceLabel: 'B', choiceText: '', isCorrect: false },
      { choiceLabel: 'C', choiceText: '', isCorrect: false },
      { choiceLabel: 'D', choiceText: '', isCorrect: false },
    ]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (q: Question) => {
    setEditingQuestion(q);
    setCategoryId(q.categoryId.toString());
    setTopicId(q.topicId ? q.topicId.toString() : '');
    setQuestionText(q.questionText);
    setExplanation(q.explanation || '');
    setPointValue(q.pointValue || 1);
    setSourceReference(q.sourceReference || '');
    setDifficulty(q.difficulty || 'Medium');

    if (q.choices && q.choices.length > 0) {
      setChoices(q.choices.map((c, idx) => ({
        choiceLabel: c.choiceLabel || String.fromCharCode(65 + idx),
        choiceText: c.choiceText,
        isCorrect: !!c.isCorrect,
      })));
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleChoiceTextChange = (index: number, text: string) => {
    const updated = [...choices];
    updated[index].choiceText = text;
    setChoices(updated);
  };

  const handleSetCorrectChoice = (index: number) => {
    const updated = choices.map((c, idx) => ({
      ...c,
      isCorrect: idx === index,
    }));
    setChoices(updated);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !questionText.trim() || !sourceReference.trim()) {
      setErrorMsg('Category, Question Text, and Source Reference are mandatory.');
      return;
    }

    if (choices.some(c => !c.choiceText.trim())) {
      setErrorMsg('Please enter choice text for all choices A, B, C, and D.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        categoryId,
        topicId: topicId || null,
        questionText: questionText.trim(),
        explanation: explanation.trim(),
        pointValue,
        sourceReference: sourceReference.trim(),
        difficulty,
        choices,
      };

      if (editingQuestion) {
        await api.put(`/questions/${editingQuestion.id}`, payload);
      } else {
        await api.post('/questions', payload);
      }

      setIsModalOpen(false);
      fetchQuestionsAndCategories();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question from the question bank?')) return;
    try {
      await api.delete(`/questions/${id}`);
      fetchQuestionsAndCategories();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete question');
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (selectedCategory && q.categoryId !== parseInt(selectedCategory, 10)) return false;
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      return q.questionText.toLowerCase().includes(term) || q.sourceReference.toLowerCase().includes(term);
    }
    return true;
  });

  const selectedCatObj = categories.find(c => c.id.toString() === categoryId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">LET Question Bank Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Faculty & Admin facility to record questions, choices, correct answers, point values, and source references aligned with LET coverage.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-100 transition flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search questions or source references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white text-slate-700 font-semibold"
        >
          <option value="">All LET Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
          ))}
        </select>
      </div>

      {/* Question Cards / List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
            <div className="flex justify-between items-start gap-4 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                  {q.categoryName || 'GenEd'}
                </span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {q.pointValue} {q.pointValue === 1 ? 'Point' : 'Points'}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  Difficulty: {q.difficulty}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEditModal(q)}
                  className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-50 rounded-lg transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-slate-800 font-semibold text-sm mb-4 leading-relaxed">
              {idx + 1}. {q.questionText}
            </p>

            {/* Answer choices display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {q.choices?.map(c => (
                <div
                  key={c.id || c.choiceLabel}
                  className={`p-2.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
                    c.isCorrect
                      ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950 font-bold'
                      : 'border-slate-100 bg-slate-50/50 text-slate-700'
                  }`}
                >
                  <span><strong>{c.choiceLabel}.</strong> {c.choiceText}</span>
                  {c.isCorrect && <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Correct</span>}
                </div>
              ))}
            </div>

            {/* Source Reference & Explanation Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span><strong className="text-slate-700">Source/Reference:</strong> {q.sourceReference}</span>
              </div>
              <div>
                Author: <span className="font-semibold text-slate-700">{q.creatorName || 'Faculty'}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredQuestions.length === 0 && !loading && (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
            No questions found matching your filter criteria.
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 my-8">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingQuestion ? 'Edit LET Board Question' : 'Input New LET Question'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    LET Coverage Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Sub-Topic (Optional)
                  </label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
                  >
                    <option value="">General Topic</option>
                    {selectedCatObj?.topics?.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the full clear question stem..."
                  className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                ></textarea>
              </div>

              {/* Choices Input */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Answer Choices & Correct Option Specification *
                </label>
                {choices.map((c, idx) => (
                  <div key={c.choiceLabel} className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={c.isCorrect}
                      onChange={() => handleSetCorrectChoice(idx)}
                      className="w-4 h-4 text-blue-700 focus:ring-blue-700"
                      title="Mark as Correct Answer"
                    />
                    <span className="font-bold text-xs w-6 text-center text-slate-800">{c.choiceLabel}.</span>
                    <input
                      type="text"
                      value={c.choiceText}
                      onChange={(e) => handleChoiceTextChange(idx, e.target.value)}
                      placeholder={`Choice ${c.choiceLabel} text...`}
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                    />
                    {c.isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                        Correct Answer
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Point Value *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={pointValue}
                    onChange={(e) => setPointValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Question Source / Reference Citation *
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g., Lorimar LET Reviewer 2024 Vol 1, Page 45 / PRC Board Exam 2023"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Explanation / Rationalization (Optional)
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Provide educational rationalization for why the correct option is right..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                ></textarea>
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
                  {saving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
