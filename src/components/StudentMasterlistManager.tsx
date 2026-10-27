import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import { StudentMasterlistRecord } from '../types.ts';
import { StudentIdInput } from './StudentIdInput.tsx';
import {
  FileSpreadsheet, Upload, Download, Search, Plus, Edit2, Trash2, CheckCircle2,
  AlertTriangle, X, RefreshCw, UserCheck, Filter, AlertCircle, FileText
} from 'lucide-react';

export const StudentMasterlistManager: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [records, setRecords] = useState<StudentMasterlistRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Excel Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadReport, setUploadReport] = useState<any | null>(null);

  // Modal State for Manual Add / Edit
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    lastName: '',
    firstName: '',
    middleName: '',
    course: 'BEED General Education',
    yearGraduated: '2026',
  });
  const [formSaving, setFormSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Delete Confirmation State
  const [deleteCandidate, setDeleteCandidate] = useState<StudentMasterlistRecord | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', {
        params: {
          search: searchTerm,
          course: selectedCourse,
          yearGraduated: selectedYear,
        },
      });
      setRecords(res.data.records || []);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch student masterlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchRecords();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, selectedCourse, selectedYear]);

  // Handle Excel Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadReport(null);

    const formDataPayload = new FormData();
    formDataPayload.append('file', uploadFile);

    try {
      const res = await api.post('/students/upload', formDataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadReport(res.data);
      setUploadFile(null);
      // Reset input element
      const fileInput = document.getElementById('excel-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchRecords();
    } catch (err: any) {
      setUploadReport({
        error: err.response?.data?.error || 'Failed to upload and validate Excel file.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    window.location.href = '/api/students/template';
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setCurrentEditId(null);
    setFormData({
      studentId: '',
      lastName: '',
      firstName: '',
      middleName: '',
      course: 'BEED General Education',
      yearGraduated: '2026',
    });
    setFormError('');
    setEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: StudentMasterlistRecord) => {
    setCurrentEditId(rec.id);
    setFormData({
      studentId: rec.studentId,
      lastName: rec.lastName,
      firstName: rec.firstName,
      middleName: rec.middleName || '',
      course: rec.course,
      yearGraduated: rec.yearGraduated,
    });
    setFormError('');
    setEditModalOpen(true);
  };

  // Save Add / Edit
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId.trim() || !formData.lastName.trim() || !formData.firstName.trim()) {
      setFormError('Student ID, Last Name, and First Name are required.');
      return;
    }

    setFormSaving(true);
    setFormError('');

    try {
      if (currentEditId) {
        await api.put(`/students/${currentEditId}`, formData);
      } else {
        await api.post('/students', formData);
      }
      setEditModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save student record.');
    } finally {
      setFormSaving(false);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await api.delete(`/students/${deleteCandidate.id}`);
      setDeleteCandidate(null);
      fetchRecords();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete student record.');
    } finally {
      setDeleting(false);
    }
  };

  // Unique Courses & Years for Filtering
  const availableCourses = Array.from(new Set(records.map(r => r.course).filter(Boolean)));
  const availableYears = Array.from(new Set(records.map(r => r.yearGraduated).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                Official Student Masterlist
              </span>
              <span className="text-xs text-slate-500">• {totalCount} Enrolled / Graduating Records</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1.5 flex items-center space-x-2">
              <UserCheck className="w-7 h-7 text-blue-700" />
              <span>Examinee Database Management</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Upload official graduating student rosters via Excel (.xlsx / .xls) to enable examinee Student ID verification and pre-board clearance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm transition flex items-center space-x-1.5"
              title="Download standard Excel import template"
            >
              <Download className="w-4 h-4 text-blue-700" />
              <span>Download Excel Template</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-100 transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student Record</span>
            </button>
          </div>
        </div>
      </div>

      {/* Excel Upload Section Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-3">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <h2>Batch Upload Student Database (Excel .xlsx / .xls)</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          The uploaded Excel file must contain these exact columns: <span className="font-semibold text-slate-700">Student ID Number</span>, <span className="font-semibold text-slate-700">Last Name</span>, <span className="font-semibold text-slate-700">First Name</span>, <span className="font-semibold text-slate-700">Middle Name</span>, <span className="font-semibold text-slate-700">Course</span>, and <span className="font-semibold text-slate-700">Year Graduated</span>.
        </p>

        <form onSubmit={handleUploadSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg p-1 bg-slate-50 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={!uploadFile || uploading}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-100 transition flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating & Importing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload and Process Excel</span>
              </>
            )}
          </button>
        </form>

        {/* Upload Feedback / Report */}
        {uploadReport && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            {uploadReport.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800 text-xs">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Upload Error</h4>
                  <p className="mt-0.5">{uploadReport.error}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{uploadReport.message}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-slate-700">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Total Rows Processed</span>
                    <span className="text-base font-bold text-slate-800">{uploadReport.totalRowsProcessed}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">New Records Added</span>
                    <span className="text-base font-bold text-emerald-700">+{uploadReport.importedCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Duplicates Skipped</span>
                    <span className="text-base font-bold text-amber-600">{uploadReport.duplicateCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Invalid Rows</span>
                    <span className="text-base font-bold text-red-600">{uploadReport.errorCount}</span>
                  </div>
                </div>

                {uploadReport.duplicates?.length > 0 && (
                  <div className="mt-2 p-2 bg-amber-50/70 rounded border border-amber-200/60 text-[11px] text-amber-800">
                    <strong>Duplicate IDs skipped:</strong>{' '}
                    {uploadReport.duplicates.map((d: any) => `${d.studentId} (${d.name})`).join(', ')}
                  </div>
                )}

                {uploadReport.errors?.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50/70 rounded border border-red-200/60 text-[11px] text-red-800">
                    <strong>Rows with validation errors:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {uploadReport.errors.map((e: any, idx: number) => (
                        <li key={idx}>Row {e.row}: {e.reason} {e.studentId ? `(${e.studentId})` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search, Filter & Masterlist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Filter Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-slate-50/40">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Student ID, Name, Course, or Year..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Courses</option>
              {availableCourses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Graduating Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={fetchRecords}
              className="p-2 text-slate-500 hover:text-blue-700 bg-white border border-slate-200 rounded-lg transition"
              title="Refresh masterlist"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/70 sticky top-0">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3">Student ID</th>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">Course / Degree</th>
                <th className="px-5 py-3">Year Graduated</th>
                <th className="px-5 py-3">Uploaded By</th>
                <th className="px-5 py-3">Added Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <RefreshCw className="w-6 h-6 text-blue-700 animate-spin mx-auto mb-2" />
                    <span className="text-xs text-slate-400">Loading student records...</span>
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-blue-700 text-xs">
                      {rec.studentId}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {rec.lastName}, {rec.firstName} {rec.middleName || ''}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs font-medium">
                      {rec.course}
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-bold text-xs">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                        Class {rec.yearGraduated}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      <div>{rec.uploadedByName || 'System Seed'}</div>
                      {rec.uploadedByRole && (
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                          ({rec.uploadedByRole})
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(rec)}
                          className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                          title="Edit Student Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {(isAdmin || rec.uploadedById === user?.id) && (
                          <button
                            onClick={() => setDeleteCandidate(rec)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                            title="Delete Student Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs italic">
                    No student records match the criteria. Upload an Excel roster or add students manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900">
              {currentEditId ? 'Edit Student Masterlist Record' : 'Add New Student Record'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Authorized SLTCFPDI examinee masterlist information.
            </p>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
              <StudentIdInput
                value={formData.studentId}
                onChange={(id) => setFormData(prev => ({ ...prev, studentId: id }))}
                label="Student ID Number"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Surname"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Given name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Middle Name / M.I.</label>
                <input
                  type="text"
                  placeholder="Middle Name (Optional)"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course / Degree *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSED Major in English"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Year Graduated *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026"
                    value={formData.yearGraduated}
                    onChange={(e) => setFormData({ ...formData, yearGraduated: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition"
                >
                  {formSaving ? 'Saving...' : currentEditId ? 'Update Record' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to remove <span className="font-bold text-slate-800">{deleteCandidate.lastName}, {deleteCandidate.firstName}</span> ({deleteCandidate.studentId}) from the official student masterlist?
            </p>
            <div className="flex justify-center space-x-3 mt-5">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
