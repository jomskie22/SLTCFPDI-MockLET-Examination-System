import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  GraduationCap, LogIn, UserPlus, Building2, ShieldCheck, X
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode = 'login', onClose }) => {
  const { login, register, quickSwitchAccount } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [majorSubject, setMajorSubject] = useState<string>('General Education');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          fullName,
          studentId,
          majorSubject,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await quickSwitchAccount(demoEmail);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed quick demo login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-100 text-blue-700 rounded-2xl mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'login' ? 'SLTCFPDI Portal Login' : 'Examinee Self-Registration'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Southern Luzon Technological College Foundation Pio Duran Inc.
          </p>
        </div>

        {/* Quick Demo Buttons Panel */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-6 space-y-2">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">
            Instant Demo Account Access:
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
            <button
              onClick={() => handleQuickDemo('admin@sltcfpdi.edu.ph')}
              className="py-1.5 px-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition border border-red-200 text-center"
            >
              Admin Demo
            </button>
            <button
              onClick={() => handleQuickDemo('faculty@sltcfpdi.edu.ph')}
              className="py-1.5 px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition border border-blue-200 text-center"
            >
              Faculty Demo
            </button>
            <button
              onClick={() => handleQuickDemo('student@sltcfpdi.edu.ph')}
              className="py-1.5 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition border border-emerald-200 text-center"
            >
              Examinee Demo
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Maria Santos"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Student ID Number
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="2026-SLTC-0099"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  LET Track / Major
                </label>
                <select
                  value={majorSubject}
                  onChange={(e) => setMajorSubject(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="General Education">General Education</option>
                  <option value="English">English</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="Social Studies">Social Studies</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@sltcfpdi.edu.ph"
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-900/30 transition mt-2"
          >
            {loading
              ? 'Authenticating...'
              : mode === 'login'
              ? 'Log In to Portal'
              : 'Complete Student Registration'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <p>
              New examinee at SLTCFPDI?{' '}
              <button
                onClick={() => setMode('register')}
                className="font-bold text-blue-600 hover:underline"
              >
                Register Here
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="font-bold text-blue-600 hover:underline"
              >
                Log In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
