import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  GraduationCap,
  BookOpen,
  FileSpreadsheet,
  Users,
  BarChart3,
  LogOut,
  ShieldAlert,
  UserCheck,
  Building2,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth }) => {
  const { user, logout, quickSwitchAccount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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

  return (
    <header className="bg-white text-slate-800 shadow-sm sticky top-0 z-40 border-b border-slate-200">
      {/* Top Banner / Institution Title */}
      <div className="bg-slate-50 px-4 py-2 text-xs border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-2 font-medium tracking-wide text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            <span className="font-semibold text-slate-700">Southern Luzon Technological College Foundation Pio Duran Incorporated (SLTCFPDI)</span>
          </div>
          <div className="flex items-center space-x-2.5 text-slate-600">
            <span className="hidden md:inline text-slate-400 font-medium text-[11px]">Demo Role Switch:</span>
            <button
              onClick={() => quickSwitchAccount('admin@sltcfpdi.edu.ph')}
              className="px-2.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-semibold transition border border-red-200"
            >
              Admin
            </button>
            <button
              onClick={() => quickSwitchAccount('faculty@sltcfpdi.edu.ph')}
              className="px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold transition border border-blue-200"
            >
              Faculty
            </button>
            <button
              onClick={() => quickSwitchAccount('student@sltcfpdi.edu.ph')}
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
              <p className="text-sm font-bold text-slate-800 leading-tight">Mock Exam Portal</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {user && (
              <>
                {user.role !== 'EXAMINEE' && (
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                      activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('exams')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    activeTab === 'exams' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{user.role === 'EXAMINEE' ? 'Mock Examinations' : 'Manage Examinations'}</span>
                </button>

                {(user.role === 'ADMIN' || user.role === 'FACULTY') && (
                  <button
                    onClick={() => setActiveTab('questions')}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                      activeTab === 'questions' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Question Bank</span>
                  </button>
                )}

                {user.role === 'ADMIN' && (
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                      activeTab === 'users' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>User Management</span>
                  </button>
                )}

                {user.role !== 'EXAMINEE' && (
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
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
                  {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'U'}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-end space-x-1.5">
                    <span>{user.fullName}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                </div>
                <button
                  onClick={logout}
                  title="Log Out"
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
                  Student Register
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
              {user.role !== 'EXAMINEE' && (
                <button
                  onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium"
                >
                  Dashboard
                </button>
              )}
              <button
                onClick={() => { setActiveTab('exams'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium"
              >
                Mock Examinations
              </button>
              {(user.role === 'ADMIN' || user.role === 'FACULTY') && (
                <button
                  onClick={() => { setActiveTab('questions'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium"
                >
                  Question Bank
                </button>
              )}
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium"
                >
                  User Management
                </button>
              )}
              {user.role !== 'EXAMINEE' && (
                <button
                  onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium"
                >
                  Reports
                </button>
              )}
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                className="w-full text-center py-2 bg-slate-100 text-slate-800 rounded-md font-semibold text-sm"
              >
                Log In
              </button>
              <button
                onClick={() => { onOpenAuth('register'); setMobileMenuOpen(false); }}
                className="w-full text-center py-2 bg-blue-700 text-white rounded-md font-semibold text-sm"
              >
                Student Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
