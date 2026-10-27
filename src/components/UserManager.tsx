import React, { useState, useEffect } from 'react';
import api from '../lib/api.ts';
import { User, Role } from '../types.ts';
import {
  Users, UserPlus, Search, Shield, Edit2, CheckCircle, XCircle, RefreshCw, X
} from 'lucide-react';

export const UserManager: React.FC = () => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<Role>('EXAMINEE');
  const [studentId, setStudentId] = useState<string>('');
  const [department, setDepartment] = useState<string>('College of Education');
  const [majorSubject, setMajorSubject] = useState<string>('General Education');
  const [yearLevel, setYearLevel] = useState<string>('4th Year');
  const [password, setPassword] = useState<string>('sltc12345');

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsersList(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAddModal = () => {
    setEmail('');
    setFullName('');
    setRole('EXAMINEE');
    setStudentId('');
    setDepartment('College of Education');
    setMajorSubject('General Education');
    setYearLevel('4th Year');
    setPassword('sltc12345');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      setErrorMsg('Email and Full Name are required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await api.post('/users', {
        email,
        fullName,
        role,
        studentId,
        department,
        majorSubject,
        yearLevel,
        password,
      });

      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.put(`/users/${user.id}`, {
        isActive: !user.isActive,
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user status');
    }
  };

  const filteredUsers = usersList.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.studentId && u.studentId.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">User Account Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Admin management of Examinee, Faculty, and System Administrator accounts.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-100 transition flex items-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Account</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by full name, email, or student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white font-semibold text-slate-700"
        >
          <option value="">All Roles</option>
          <option value="EXAMINEE">Examinee</option>
          <option value="FACULTY">Faculty</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/50 sticky top-0">
              <tr className="border-b border-slate-100">
                <th className="py-3 px-4">Full Name & Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Student ID / Dept</th>
                <th className="py-3 px-4">Major Subject</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{u.fullName}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      u.role === 'ADMIN'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : u.role === 'FACULTY'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-700">
                    <div className="font-semibold text-slate-800">{u.studentId || 'Staff'}</div>
                    <div className="text-slate-400">{u.department}</div>
                  </td>

                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                    {u.majorSubject || 'General Education'}
                  </td>

                  <td className="py-3.5 px-4">
                    {u.isActive ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                        DEACTIVATED
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                        u.isActive
                          ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                      }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add User */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Register New User Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Ana Clara Reyes"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@sltcfpdi.edu.ph"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    System Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
                  >
                    <option value="EXAMINEE">Examinee</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Student / Staff ID
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="2026-SLTC-001"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  />
                </div>
              </div>

              {role === 'EXAMINEE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Major Subject
                    </label>
                    <select
                      value={majorSubject}
                      onChange={(e) => setMajorSubject(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
                    >
                      <option value="General Education">General Education</option>
                      <option value="English">English</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="Social Studies">Social Studies</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Year Level
                    </label>
                    <select
                      value={yearLevel}
                      onChange={(e) => setYearLevel(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Graduated">Graduated</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Default Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
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
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
