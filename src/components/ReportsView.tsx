import React, { useState, useEffect } from 'react';
import api from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  FileText, Download, Printer, UserCheck, RefreshCw, FileSpreadsheet, Building2,
  Edit3, Award, Target, CheckCircle2, AlertCircle, Save, X, Sparkles, BookOpen, ShieldCheck
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'general' | 'individual'>('general');
  const [generalData, setGeneralData] = useState<any>(null);
  const [individualData, setIndividualData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Edit Report Modal state
  const [isEditingRemarks, setIsEditingRemarks] = useState<boolean>(false);
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editRecommendation, setEditRecommendation] = useState<string>('');
  const [editEvaluator, setEditEvaluator] = useState<string>('');
  const [editStudentId, setEditStudentId] = useState<string>('');
  const [editMajorSubject, setEditMajorSubject] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editYearLevel, setEditYearLevel] = useState<string>('');
  const [savingRemarks, setSavingRemarks] = useState<boolean>(false);

  const isFacultyOrAdmin = user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const fetchGeneralReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/general');
      setGeneralData(res.data);
    } catch (err) {
      console.error('Failed to fetch general report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndividualReport = async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/reports/individual/${userId}`);
      setIndividualData(res.data);
    } catch (err) {
      console.error('Failed to fetch individual report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFacultyOrAdmin) {
      api.get('/users').then(res => {
        const examinees = res.data.filter((u: any) => u.role === 'EXAMINEE');
        setUsersList(examinees);
        if (examinees.length > 0) {
          setSelectedUserId(examinees[0].id.toString());
        }
      }).catch(console.error);
    } else if (user?.id) {
      setReportType('individual');
      setSelectedUserId(user.id.toString());
    }

    fetchGeneralReport();
  }, [user]);

  useEffect(() => {
    if (reportType === 'individual' && selectedUserId) {
      fetchIndividualReport(selectedUserId);
    }
  }, [reportType, selectedUserId]);

  const handleOpenEditModal = () => {
    if (!individualData) return;
    const info = individualData.examineeInfo;
    setEditRemarks(info.facultyRemarks || '');
    setEditRecommendation(info.facultyRecommendation || '');
    setEditEvaluator(info.evaluatorName || '');
    setEditStudentId(info.studentId !== 'N/A' ? info.studentId : '');
    setEditMajorSubject(info.majorSubject || '');
    setEditDepartment(info.department || '');
    setEditYearLevel(info.yearLevel || '');
    setIsEditingRemarks(true);
  };

  const handleSaveRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setSavingRemarks(true);
    try {
      await api.put(`/reports/individual/${selectedUserId}/remarks`, {
        facultyRemarks: editRemarks,
        facultyRecommendation: editRecommendation,
        evaluatorName: editEvaluator,
        studentId: editStudentId,
        majorSubject: editMajorSubject,
        department: editDepartment,
        yearLevel: editYearLevel,
      });
      setIsEditingRemarks(false);
      await fetchIndividualReport(selectedUserId);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update report evaluation');
    } finally {
      setSavingRemarks(false);
    }
  };

  // Export PDF with jsPDF and autoTable
  const exportPDF = () => {
    const doc = new jsPDF();

    // Official Header
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SOUTHERN LUZON TECHNOLOGICAL COLLEGE FOUNDATION PIO DURAN INC.', 14, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Automated Licensure Examination for Teachers (LET) Mock Examination & Monitoring System', 14, 21);
    doc.text(`Official Report Generated On: ${new Date().toLocaleString()}`, 14, 26);
    doc.line(14, 29, 196, 29);

    if (reportType === 'general' && generalData) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('GENERAL EXAMINATION PERFORMANCE SUMMARY REPORT', 14, 36);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Attempts: ${generalData.summary.totalAttempts}`, 14, 43);
      doc.text(`Passed: ${generalData.summary.passedCount}`, 70, 43);
      doc.text(`Failed: ${generalData.summary.failedCount}`, 120, 43);
      doc.text(`Pass Rate: ${generalData.summary.passRate}`, 160, 43);

      const tableRows = generalData.records.map((r: any) => [
        r.examineeName,
        r.studentId || 'N/A',
        r.majorSubject || 'General Ed',
        r.examTitle,
        `${r.score}/${r.totalPoints}`,
        `${r.percentage}%`,
        r.passed ? 'PASSED' : 'FAILED',
        r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : 'N/A',
      ]);

      autoTable(doc, {
        startY: 48,
        head: [['Examinee', 'Student ID', 'Major Subject', 'Exam Title', 'Score', 'Percentage', 'Result', 'Date']],
        body: tableRows,
        headStyles: { fillColor: [30, 41, 59] },
      });

      doc.save(`SLTCFPDI_General_LET_Report_${Date.now()}.pdf`);
    } else if (reportType === 'individual' && individualData) {
      const info = individualData.examineeInfo;
      const summary = individualData.performanceSummary;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`INDIVIDUAL EXAMINEE EVALUATION REPORT: ${info.fullName.toUpperCase()}`, 14, 36);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Student ID: ${info.studentId} | Major Subject: ${info.majorSubject} | Department: ${info.department}`, 14, 43);
      doc.text(`Overall Pass Rate: ${summary.passRate} | Average Score: ${summary.averagePercentage}`, 14, 48);

      doc.setFont('helvetica', 'bold');
      doc.text(`STANDOUT SUBJECT AREA: ${summary.standoutCategoryName} (${summary.standoutPercentage})`, 14, 55);
      doc.text(`PRIMARY FOCUS AREA: ${summary.weakestCategoryName} (${summary.weakestPercentage})`, 14, 60);

      let currentY = 66;

      // Category Performance Breakdown
      if (individualData.categoryBreakdown && individualData.categoryBreakdown.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('COMPETENCY & SUBJECT AREA PERFORMANCE BREAKDOWN:', 14, currentY);
        currentY += 4;

        const catRows = individualData.categoryBreakdown.map((c: any) => [
          c.categoryName,
          c.totalQuestions,
          c.correctAnswers,
          `${c.percentage}%`,
          c.performanceTag,
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Subject / Category', 'Questions', 'Correct', 'Accuracy Score', 'Competency Rating']],
          body: catRows,
          headStyles: { fillColor: [51, 65, 85] },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Faculty Evaluation & Remarks
      doc.setFont('helvetica', 'bold');
      doc.text('FACULTY EVALUATION & OFFICIAL RECOMMENDATION:', 14, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      const splitRemarks = doc.splitTextToSize(`Remarks: ${info.facultyRemarks}`, 180);
      doc.text(splitRemarks, 14, currentY);
      currentY += splitRemarks.length * 4.5 + 2;

      doc.setFont('helvetica', 'bold');
      doc.text(`Official Recommendation: ${info.facultyRecommendation}`, 14, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`Evaluator / Signatory: ${info.evaluatorName}`, 14, currentY);
      currentY += 8;

      // Attempt History
      doc.setFont('helvetica', 'bold');
      doc.text('EXAMINATION HISTORY LOGS:', 14, currentY);
      currentY += 4;

      const tableRows = individualData.attemptHistory.map((a: any) => [
        a.examTitle,
        `${a.score}/${a.totalPoints}`,
        `${a.percentage}%`,
        a.passed ? 'PASSED' : 'FAILED',
        a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : 'N/A',
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Exam Title', 'Score', 'Percentage', 'Result', 'Date Submitted']],
        body: tableRows,
        headStyles: { fillColor: [30, 41, 59] },
      });

      doc.save(`SLTCFPDI_Individual_Report_${info.fullName.replace(/\s+/g, '_')}.pdf`);
    }
  };

  // Export Excel with ExcelJS
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    if (reportType === 'general' && generalData) {
      const sheet = workbook.addWorksheet('General LET Summary');
      sheet.columns = [
        { header: 'Examinee Name', key: 'name', width: 25 },
        { header: 'Student ID', key: 'studentId', width: 18 },
        { header: 'Department', key: 'dept', width: 25 },
        { header: 'Major Subject', key: 'major', width: 20 },
        { header: 'Exam Title', key: 'title', width: 35 },
        { header: 'Score', key: 'score', width: 12 },
        { header: 'Percentage', key: 'percentage', width: 14 },
        { header: 'Pass/Fail', key: 'result', width: 12 },
        { header: 'Submitted At', key: 'date', width: 20 },
      ];

      generalData.records.forEach((r: any) => {
        sheet.addRow({
          name: r.examineeName,
          studentId: r.studentId || 'N/A',
          dept: r.department,
          major: r.majorSubject,
          title: r.examTitle,
          score: `${r.score}/${r.totalPoints}`,
          percentage: `${r.percentage}%`,
          result: r.passed ? 'PASSED' : 'FAILED',
          date: r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'N/A',
        });
      });
    } else if (reportType === 'individual' && individualData) {
      const sheet1 = workbook.addWorksheet('Subject Area Breakdown');
      sheet1.columns = [
        { header: 'Subject Area Domain', key: 'catName', width: 30 },
        { header: 'Questions Attempted', key: 'total', width: 20 },
        { header: 'Correct Answers', key: 'correct', width: 18 },
        { header: 'Accuracy Percentage', key: 'pct', width: 20 },
        { header: 'Performance Rating', key: 'rating', width: 22 },
      ];

      if (individualData.categoryBreakdown) {
        individualData.categoryBreakdown.forEach((c: any) => {
          sheet1.addRow({
            catName: c.categoryName,
            total: c.totalQuestions,
            correct: c.correctAnswers,
            pct: `${c.percentage}%`,
            rating: c.performanceTag,
          });
        });
      }

      const sheet2 = workbook.addWorksheet('Exam History Logs');
      sheet2.columns = [
        { header: 'Exam Title', key: 'title', width: 35 },
        { header: 'Score', key: 'score', width: 12 },
        { header: 'Percentage', key: 'percentage', width: 14 },
        { header: 'Result', key: 'result', width: 12 },
        { header: 'Date Submitted', key: 'date', width: 20 },
      ];

      individualData.attemptHistory.forEach((a: any) => {
        sheet2.addRow({
          title: a.examTitle,
          score: `${a.score}/${a.totalPoints}`,
          percentage: `${a.percentage}%`,
          result: a.passed ? 'PASSED' : 'FAILED',
          date: a.submittedAt ? new Date(a.submittedAt).toLocaleString() : 'N/A',
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SLTCFPDI_LET_Report_${Date.now()}.xlsx`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Performance Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate, view, edit faculty recommendations, and export General Summaries and Individual Examinee Reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {reportType === 'individual' && isFacultyOrAdmin && individualData && (
            <button
              onClick={handleOpenEditModal}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Evaluation Report</span>
            </button>
          )}

          <button
            onClick={exportPDF}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={exportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Switcher & Examinee Selector */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        {isFacultyOrAdmin && (
          <div className="flex space-x-2">
            <button
              onClick={() => setReportType('general')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                reportType === 'general' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              General Summary Report
            </button>
            <button
              onClick={() => setReportType('individual')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                reportType === 'individual' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Individual Examinee Report
            </button>
          </div>
        )}

        {reportType === 'individual' && isFacultyOrAdmin && (
          <div className="flex-1 flex items-center space-x-2">
            <label className="text-xs font-bold text-slate-700 shrink-0">Select Examinee:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
            >
              {usersList.map(u => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.studentId || u.email})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white p-8 sm:p-12 rounded-xl border border-slate-200 shadow-sm space-y-6 text-slate-800 print:p-0 print:border-none print:shadow-none">
        {/* Official Header */}
        <div className="text-center pb-6 border-b border-slate-200">
          <div className="flex justify-center items-center space-x-2 mb-2">
            <Building2 className="w-6 h-6 text-blue-700" />
            <h2 className="font-extrabold text-lg tracking-tight uppercase text-slate-900">
              SOUTHERN LUZON TECHNOLOGICAL COLLEGE FOUNDATION PIO DURAN INCORPORATED
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
            Automated Licensure Examination for Teachers (LET) Mock Examination & Monitoring System
          </p>
          <p className="text-xs text-slate-400 mt-1">Official Performance Evaluation & Competency Report</p>
        </div>

        {/* General Report Display */}
        {reportType === 'general' && generalData && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-lg font-bold text-slate-800">General Examination Summary Report</h2>
                <p className="text-xs text-slate-500">System-wide performance metrics across all examinees</p>
              </div>
              <span className="text-xs text-slate-500 font-medium">Generated: {new Date().toLocaleString()}</span>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Attempts</span>
                <span className="text-2xl font-bold text-slate-800">{generalData.summary.totalAttempts}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Passed</span>
                <span className="text-2xl font-bold text-emerald-600">{generalData.summary.passedCount}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Failed</span>
                <span className="text-2xl font-bold text-red-600">{generalData.summary.failedCount}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overall Pass Rate</span>
                <span className="text-2xl font-bold text-blue-700">{generalData.summary.passRate}</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/50">
                  <tr className="border-b border-slate-200">
                    <th className="py-2.5 px-3">Examinee Name</th>
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Major Subject</th>
                    <th className="py-2.5 px-3">Exam Title</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Percentage</th>
                    <th className="py-2.5 px-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generalData.records.map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{r.examineeName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{r.studentId || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{r.majorSubject}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{r.examTitle}</td>
                      <td className="py-2.5 px-3 font-bold">{r.score}/{r.totalPoints}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700">{r.percentage}%</td>
                      <td className="py-2.5 px-3 font-bold">
                        {r.passed ? (
                          <span className="text-emerald-700">PASSED</span>
                        ) : (
                          <span className="text-red-700">FAILED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Individual Report Display */}
        {reportType === 'individual' && individualData && (
          <div className="space-y-6">
            {/* Header Details */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{individualData.examineeInfo.fullName}</h2>
                  {isFacultyOrAdmin && (
                    <button
                      onClick={handleOpenEditModal}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-md border border-blue-200 transition flex items-center space-x-1 print:hidden"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Info & Remarks</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Student ID: <span className="font-semibold text-slate-800">{individualData.examineeInfo.studentId}</span> •
                  Major Subject: <span className="font-semibold text-slate-800">{individualData.examineeInfo.majorSubject}</span> •
                  Year: <span className="font-semibold text-slate-800">{individualData.examineeInfo.yearLevel}</span>
                </p>
                <p className="text-xs text-slate-500">Department: {individualData.examineeInfo.department}</p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">LET Board Readiness</span>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border inline-block mt-1 ${
                  parseFloat(individualData.performanceSummary.averagePercentage) >= 75
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {individualData.performanceSummary.readinessStatus}
                </span>
              </div>
            </div>

            {/* Standout Area & Focus Area Highlight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Standout Subject Area */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 flex items-start space-x-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">TOP STANDOUT SUBJECT AREA</span>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {individualData.performanceSummary.standoutCategoryName}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Highest relative accuracy score: <span className="font-extrabold text-emerald-700 text-sm">{individualData.performanceSummary.standoutPercentage}</span>
                  </p>
                  <p className="text-[11px] text-emerald-800/80 italic mt-1">
                    Examinee demonstrates strong mastery and high readiness in this domain.
                  </p>
                </div>
              </div>

              {/* Primary Focus Area */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 flex items-start space-x-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">PRIMARY FOCUS / DRILL NEEDED</span>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {individualData.performanceSummary.weakestCategoryName}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Accuracy score: <span className="font-extrabold text-amber-700 text-sm">{individualData.performanceSummary.weakestPercentage}</span>
                  </p>
                  <p className="text-[11px] text-amber-900/80 italic mt-1">
                    Recommended area for additional mock drills and targeted reviewer exercises.
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Exams Attempted</span>
                <span className="text-xl font-bold text-slate-800">{individualData.performanceSummary.totalAttempts}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Exams Passed</span>
                <span className="text-xl font-bold text-emerald-600">{individualData.performanceSummary.passedCount}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overall Pass Rate</span>
                <span className="text-xl font-bold text-blue-700">{individualData.performanceSummary.passRate}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Average Percentage</span>
                <span className="text-xl font-bold text-indigo-700">{individualData.performanceSummary.averagePercentage}</span>
              </div>
            </div>

            {/* Category Competency Breakdown Table */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Competency & Subject Area Performance Breakdown</h3>
                  <p className="text-xs text-slate-500">Evaluated performance categorized across General Education, Professional Education, and Major Subjects</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/50">
                    <tr className="border-b border-slate-200">
                      <th className="py-2.5 px-3">Subject Domain / Category</th>
                      <th className="py-2.5 px-3 text-center">Questions Attempted</th>
                      <th className="py-2.5 px-3 text-center">Correct Answers</th>
                      <th className="py-2.5 px-3">Accuracy %</th>
                      <th className="py-2.5 px-3 w-32">Visual Accuracy</th>
                      <th className="py-2.5 px-3 text-right">Competency Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {individualData.categoryBreakdown && individualData.categoryBreakdown.map((cat: any, idx: number) => {
                      const pct = parseFloat(cat.percentage);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{cat.categoryName} ({cat.categoryCode})</td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-600">{cat.totalQuestions}</td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-600">{cat.correctAnswers}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-700">{cat.percentage}%</td>
                          <td className="py-2.5 px-3">
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full ${
                                  pct >= 80 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-600' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {cat.performanceTag === 'OUTSTANDING' && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px]">
                                OUTSTANDING
                              </span>
                            )}
                            {cat.performanceTag === 'SATISFACTORY' && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold text-[10px]">
                                SATISFACTORY
                              </span>
                            )}
                            {cat.performanceTag === 'NEEDS_IMPROVEMENT' && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold text-[10px]">
                                NEEDS DRILLS
                              </span>
                            )}
                            {cat.performanceTag === 'NOT_TESTED' && (
                              <span className="px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-200 rounded font-medium text-[10px]">
                                NOT YET TESTED
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Faculty Remarks & Advisory Box */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Faculty Advisory Remarks & Official Recommendation</span>
                </div>
                {isFacultyOrAdmin && (
                  <button
                    onClick={handleOpenEditModal}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-800 underline print:hidden"
                  >
                    Edit Evaluation Remarks
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <p className="italic text-slate-800">"{individualData.examineeInfo.facultyRemarks}"</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-1 gap-2">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Official Recommendation Status:</span>
                  <span className="ml-2 font-extrabold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {individualData.examineeInfo.facultyRecommendation}
                  </span>
                </div>

                <div className="text-slate-500">
                  Evaluator: <span className="font-semibold text-slate-800">{individualData.examineeInfo.evaluatorName}</span>
                </div>
              </div>
            </div>

            {/* Exam Attempts List */}
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-3">Examination History Logs</h3>
              <table className="w-full text-left border-collapse text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/50">
                  <tr className="border-b border-slate-200">
                    <th className="py-2.5 px-3">Examination Title</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Percentage</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3">Date Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {individualData.attemptHistory.map((att: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{att.examTitle}</td>
                      <td className="py-2.5 px-3 font-bold">{att.score} / {att.totalPoints}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700">{att.percentage}%</td>
                      <td className="py-2.5 px-3 font-bold">
                        {att.passed ? (
                          <span className="text-emerald-700">PASSED</span>
                        ) : (
                          <span className="text-red-700">FAILED</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signature Footer */}
        <div className="pt-12 mt-12 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-700 print:mt-16">
          <div>
            <p className="font-semibold text-slate-800 mb-1">{individualData?.examineeInfo?.evaluatorName || 'SLTCFPDI Review Faculty'}</p>
            <div className="border-b border-slate-400 w-48 mb-1"></div>
            <p className="font-bold text-slate-800">Faculty / Review Coordinator</p>
            <p className="text-slate-500">SLTCFPDI College of Education</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="font-semibold text-slate-800 mb-1">Academic Board Administrator</p>
            <div className="border-b border-slate-400 w-48 mb-1"></div>
            <p className="font-bold text-slate-800">Dean / System Administrator</p>
            <p className="text-slate-500">SLTCFPDI Academic Affairs</p>
          </div>
        </div>
      </div>

      {/* Edit Evaluation Report Modal */}
      {isEditingRemarks && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-700" />
                <h2 className="text-lg font-bold text-slate-800">Edit Examinee Report & Evaluation</h2>
              </div>
              <button
                onClick={() => setIsEditingRemarks(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRemarks} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={editStudentId}
                    onChange={(e) => setEditStudentId(e.target.value)}
                    placeholder="e.g. 2026-LET-0192"
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Major Subject Domain</label>
                  <input
                    type="text"
                    value={editMajorSubject}
                    onChange={(e) => setEditMajorSubject(e.target.value)}
                    placeholder="e.g. Mathematics, English, General Education"
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Remarks & Advisory Notes</label>
                <textarea
                  rows={4}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Provide faculty feedback, strengths, or areas needing improvement..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Recommendation Status</label>
                <select
                  value={editRecommendation}
                  onChange={(e) => setEditRecommendation(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700 bg-white"
                >
                  <option value="RECOMMENDED FOR OFFICIAL LET BOARD EXAMINATION">RECOMMENDED FOR OFFICIAL LET BOARD EXAMINATION</option>
                  <option value="RECOMMENDED FOR INTENSIVE REMEDIAL REVIEW">RECOMMENDED FOR INTENSIVE REMEDIAL REVIEW</option>
                  <option value="RECOMMENDED FOR MAJOR SUBJECT DRILLS">RECOMMENDED FOR MAJOR SUBJECT DRILLS</option>
                  <option value="PASSED MOCK - EXCELLENT READINESS">PASSED MOCK - EXCELLENT READINESS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Evaluator / Faculty Signatory Title</label>
                <input
                  type="text"
                  value={editEvaluator}
                  onChange={(e) => setEditEvaluator(e.target.value)}
                  placeholder="e.g. Dr. Maria Santos, LPT - LET Coordinator"
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditingRemarks(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRemarks}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingRemarks ? 'Saving...' : 'Save Report Evaluation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

