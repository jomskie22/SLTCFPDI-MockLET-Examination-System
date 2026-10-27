import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  GraduationCap,
  BookOpen,
  FileSpreadsheet,
  Users,
  BarChart3,
  LogOut,
  ShieldCheck,
  UserCheck,
  Building2,
  Menu,
  X,
  AlertTriangle
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth }) => {
  const { user, logout, quickSwitchAccount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState<boolean>(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-200">ADMIN</span>;
      case 'FACULTY':
        return <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">FACULTY</span>;
      case 'EXAMINEE':
        return <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">EXAMINEE</span>;
      default:
        return null;
    }
  };

  const handleInitiateLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
  };

  const handleCancelLogout = () => {
    setLogoutConfirmOpen(false);
  };

  return (
    <>
      <header className="bg-white text-slate-800 shadow-sm sticky top-0 z-40 border-b border-slate-200">
        {/* Top Banner / Institution Title */}
        <div className="bg-slate-50 px-4 py-2 text-xs border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex items-center space-x-2 font-medium tracking-wide text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span className="font-semibold text-slate-700">Southern Luzon Technological College Foundation Pio Duran Incorporated (SLTCFPDI)</span>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-600">
              <span className="hidden md:inline text-slate-400 font-medium text-[11px]">Instant Switch:</span>
              <button
                onClick={() => onOpenAuth('login')}
                className="px-2.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-semibold transition border border-red-200"
              >
                Admin
              </button>
              <button
                onClick={() => onOpenAuth('login')}
                className="px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold transition border border-blue-200"
              >
                Faculty
              </button>
              <button
                onClick={() => onOpenAuth('login')}
                className="px-2.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition border border-emerald-200"
              >
                Examinee
              </button>
            </div>
          </div>
        </div>

        {/* Main Navigation Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & System Name */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xs font-bold text-slate-400 tracking-widest uppercase">SLTCFPDI</h1>
                <p className="text-sm font-bold text-slate-800 leading-tight">MockLET Portal</p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {user && (
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                      activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('exams')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                      activeTab === 'exams' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{user.role === 'EXAMINEE' ? 'Mock Examinations' : 'Manage Exams'}</span>
                  </button>

                  {(user.role === 'ADMIN' || user.role === 'FACULTY') && (
                    <>
                      <button
                        onClick={() => setActiveTab('students')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                          activeTab === 'students' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>Student Database</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('clearance')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                          activeTab === 'clearance' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-700" />
                        <span>Exam Approvals</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('questions')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                          activeTab === 'questions' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Question Bank</span>
                      </button>
                    </>
                  )}

                  {user.role === 'ADMIN' && (
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                        activeTab === 'users' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Users</span>
                    </button>
                  )}

                  {user.role !== 'EXAMINEE' && (
                    <button
                      onClick={() => setActiveTab('reports')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                        activeTab === 'reports' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Reports</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* User Status / Login Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
                  <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-end space-x-1.5">
                      <span>{user.fullName}</span>
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {user.studentId ? `ID: ${user.studentId}` : user.email}
                    </div>
                  </div>
                  <button
                    onClick={handleInitiateLogout}
                    title="Log Out of Session"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition shadow-md shadow-blue-100"
                  >
                    Student ID Register
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2">
            {user ? (
              <>
                <div className="p-3 bg-slate-50 rounded-lg mb-2 flex items-center justify-between border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                      {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{user.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                    </div>
                  </div>
                  {getRoleBadge(user.role)}
                </div>

                <button
                  onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium text-xs"
                >
                  Dashboard
                </button>

                <button
                  onClick={() => { setActiveTab('exams'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium text-xs"
                >
                  Mock Examinations
                </button>

                {(user.role === 'ADMIN' || user.role === 'FACULTY') && (
                  <>
                    <button
                      onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium text-xs flex items-center space-x-2"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Student Database (Excel)</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('clearance'); setMobileMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium text-xs flex items-center space-x-2"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-700" />
                      <span>Exam Approvals</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('questions'); setMobileMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium text-xs"
                    >
                      Question Bank
                    </button>
                  </>
                )}

                {user.role === 'ADMIN' && (
                  <button
                    onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium text-xs"
                  >
                    User Management
                  </button>
                )}

                {user.role !== 'EXAMINEE' && (
                  <button
                    onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium text-xs"
                  >
                    Reports
                  </button>
                )}

                <button
                  onClick={() => { setMobileMenuOpen(false); handleInitiateLogout(); }}
                  className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium flex items-center space-x-2 text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Session</span>
                </button>
              </>
            ) : (
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                  className="w-full text-center py-2 bg-slate-100 text-slate-800 rounded-md font-semibold text-xs"
                >
                  Log In
                </button>
                <button
                  onClick={() => { onOpenAuth('register'); setMobileMenuOpen(false); }}
                  className="w-full text-center py-2 bg-blue-700 text-white rounded-md font-semibold text-xs"
                >
                  Student ID Register
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* CONFIRMATION MODAL BEFORE LOGOUT */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Confirm Log Out</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to log out of your current session as{' '}
              <span className="font-bold text-slate-800">{user?.fullName || 'User'}</span>?
            </p>

            <p className="text-[11px] text-slate-400">
              You will need to sign in again to access examinations and performance monitoring. Cancel will keep you logged in.
            </p>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={handleCancelLogout}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition"
              >
                Confirm Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
