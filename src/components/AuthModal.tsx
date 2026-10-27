import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../lib/api.ts';
import { StudentIdInput } from './StudentIdInput.tsx';
import {
  GraduationCap, LogIn, UserPlus, Building2, ShieldCheck, X, CheckCircle2,
  AlertCircle, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, ShieldAlert,
  Clock, KeyRound, Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode = 'login', onClose }) => {
  const { login, examineeLogin, register, quickSwitchAccount } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login Mode Selection
  // 'examinee' uses the fixed SLPD-YYYY-COL-NNNN format; 'staff' uses email
  const [loginMethod, setLoginMethod] = useState<'examinee' | 'staff'>('examinee');

  // Examinee Login Inputs (NO password required for examinees)
  const [examineeStudentId, setExamineeStudentId] = useState<string>('SLPD-2022-COL-0841');
  const [examineeStudentIdValid, setExamineeStudentIdValid] = useState<boolean>(true);

  // Examinee Wait State when clearance is PENDING or DECLINED
  const [examineeWaitState, setExamineeWaitState] = useState<{
    status: 'PENDING' | 'DECLINED';
    student: {
      studentId: string;
      fullName: string;
      course: string;
      yearGraduated: string;
    };
    requestedAt?: string;
    reviewNotes?: string | null;
    message: string;
  } | null>(null);

  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [reRequesting, setReRequesting] = useState<boolean>(false);

  // Staff Login Inputs
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [staffPassword, setStaffPassword] = useState<string>('');

  // Registration Form Fields & Step Flow
  // Step 1: Student ID Verification, Step 2: Account Setup
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [verifyStudentId, setVerifyStudentId] = useState<string>('SLPD-2024-COL-0190');
  const [verifyIdValid, setVerifyIdValid] = useState<boolean>(true);
  const [verifyingId, setVerifyingId] = useState<boolean>(false);

  // Already Registered Account Info (if found on Step 1)
  const [existingAccountInfo, setExistingAccountInfo] = useState<{
    studentId: string;
    fullName: string;
    course: string;
    yearGraduated: string;
    clearanceStatus: string;
    clearanceNotes?: string | null;
    existingEmail: string;
  } | null>(null);

  // Verified Student Record for Registration
  const [verifiedStudent, setVerifiedStudent] = useState<{
    id: number;
    studentId: string;
    fullName: string;
    course: string;
    yearGraduated: string;
  } | null>(null);

  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  // Confirmation Modals for Login & Registration
  const [confirmLoginModalOpen, setConfirmLoginModalOpen] = useState<boolean>(false);
  const [pendingLoginTarget, setPendingLoginTarget] = useState<{
    type: 'examinee' | 'staff' | 'demo';
    identifier: string; // Email or Student ID
    password?: string;
    roleLabel?: string;
  } | null>(null);

  const [confirmRegisterModalOpen, setConfirmRegisterModalOpen] = useState<boolean>(false);

  // Polling for Admin Approval when in PENDING state
  React.useEffect(() => {
    let interval: any = null;
    if (examineeWaitState?.status === 'PENDING' && isOpen) {
      interval = setInterval(async () => {
        try {
          const res = await examineeLogin(examineeWaitState.student.studentId);
          if (res.approved) {
            setSuccessNotice('Approval granted by Administrator! Directing you to your exam portal...');
            setTimeout(() => {
              onClose();
            }, 1200);
          } else if (res.status === 'DECLINED') {
            setExamineeWaitState({
              status: 'DECLINED',
              student: res.student,
              reviewNotes: res.reviewNotes,
              message: res.message,
            });
          }
        } catch {
          // Silent polling error
        }
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [examineeWaitState, isOpen]);

  if (!isOpen) return null;

  // Trigger examinee login confirmation (Passwordless - Student ID only)
  const handleInitiateExamineeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examineeStudentId.trim() || !examineeStudentIdValid) {
      setErrorMsg('Please enter a complete Student ID in the official format SLPD-YYYY-COL-NNNN.');
      return;
    }
    setErrorMsg('');
    setPendingLoginTarget({
      type: 'examinee',
      identifier: examineeStudentId.trim().toUpperCase(),
      roleLabel: 'Official Examinee (Student ID Access)',
    });
    setConfirmLoginModalOpen(true);
  };

  // Trigger staff login confirmation
  const handleInitiateStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim() || !staffPassword) {
      setErrorMsg('Please enter your staff email address and password.');
      return;
    }
    setErrorMsg('');
    setPendingLoginTarget({
      type: 'staff',
      identifier: staffEmail.trim().toLowerCase(),
      password: staffPassword,
      roleLabel: 'Faculty / Administrator',
    });
    setConfirmLoginModalOpen(true);
  };

  // Demo quick switch
  const handleInitiateDemoLogin = (identifier: string, roleLabel: string, type: 'examinee' | 'demo') => {
    setErrorMsg('');
    setPendingLoginTarget({
      type,
      identifier,
      roleLabel,
    });
    setConfirmLoginModalOpen(true);
  };

  // User confirmed login action in modal
  const handleConfirmLoginProceed = async () => {
    if (!pendingLoginTarget) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessNotice('');
    setConfirmLoginModalOpen(false);

    try {
      if (pendingLoginTarget.type === 'examinee') {
        const result = await examineeLogin(pendingLoginTarget.identifier);
        if (result.approved) {
          setSuccessNotice('Login confirmed! Welcome to your examination portal.');
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          // Display the waiting message view
          setExamineeWaitState({
            status: result.status,
            student: result.student,
            requestedAt: result.requestedAt,
            reviewNotes: result.reviewNotes,
            message: result.message,
          });
        }
      } else if (pendingLoginTarget.type === 'staff' && pendingLoginTarget.password) {
        await login(pendingLoginTarget.identifier, pendingLoginTarget.password);
        onClose();
      } else {
        await quickSwitchAccount(pendingLoginTarget.identifier);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your Student ID.');
    } finally {
      setLoading(false);
      setPendingLoginTarget(null);
    }
  };

  // User cancelled login action in modal
  const handleCancelLogin = () => {
    setConfirmLoginModalOpen(false);
    setPendingLoginTarget(null);
  };

  // Check approval status on demand
  const handleManualCheckStatus = async () => {
    if (!examineeWaitState?.student?.studentId) return;
    setCheckingStatus(true);
    setErrorMsg('');
    try {
      const res = await examineeLogin(examineeWaitState.student.studentId);
      if (res.approved) {
        setSuccessNotice('Approval granted by Administrator! Directing you to your exam portal...');
        setTimeout(() => {
          onClose();
        }, 1000);
      } else if (res.status === 'DECLINED') {
        setExamineeWaitState({
          status: 'DECLINED',
          student: res.student,
          reviewNotes: res.reviewNotes,
          message: res.message,
        });
      } else {
        setSuccessNotice('Status checked: Request is still pending Administrator review.');
        setTimeout(() => setSuccessNotice(''), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error checking approval status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Re-submit request if declined
  const handleReSubmitRequest = async () => {
    if (!examineeWaitState?.student?.studentId) return;
    setReRequesting(true);
    setErrorMsg('');
    try {
      await api.post('/auth/examinee-re-request', {
        studentId: examineeWaitState.student.studentId,
        requestNotes: 'Re-submitted examinee clearance request for Administrator approval.',
      });
      setExamineeWaitState({
        ...examineeWaitState,
        status: 'PENDING',
        message: 'Your examination clearance request is currently under review by the Administrator. Please wait for the approval of the Admin before you are directed to the exam page or your account.',
        reviewNotes: null,
      });
      setSuccessNotice('Clearance request re-submitted. Awaiting Administrator approval.');
      setTimeout(() => setSuccessNotice(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to re-submit request.');
    } finally {
      setReRequesting(false);
    }
  };

  // Verify Student ID on Registration Step 1
  const handleVerifyStudentId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyStudentId.trim() || !verifyIdValid) {
      setErrorMsg('Please enter a complete Student ID in the format SLPD-YYYY-COL-NNNN (e.g., SLPD-2024-COL-0190).');
      return;
    }

    setVerifyingId(true);
    setErrorMsg('');
    setExistingAccountInfo(null);
    setVerifiedStudent(null);

    try {
      const res = await api.post('/students/verify-id', {
        studentId: verifyStudentId.trim().toUpperCase(),
      });

      if (res.data.alreadyRegistered) {
        setExistingAccountInfo({
          studentId: res.data.student.studentId,
          fullName: res.data.student.fullName,
          course: res.data.student.course,
          yearGraduated: res.data.student.yearGraduated,
          clearanceStatus: res.data.clearanceStatus || 'PENDING',
          clearanceNotes: res.data.clearanceNotes,
          existingEmail: res.data.existingEmail,
        });
        return;
      }

      setVerifiedStudent(res.data.student);
      setRegStep(2);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error ||
        `Student ID "${verifyStudentId.trim()}" was not found in the official SLTCFPDI student masterlist. Access denied.`
      );
    } finally {
      setVerifyingId(false);
    }
  };

  // Switch from Step 1 existing account card to login
  const handleGoToLoginWithExistingId = (studentId: string) => {
    setMode('login');
    setLoginMethod('examinee');
    setExamineeStudentId(studentId);
    setExamineeStudentIdValid(true);
    setExistingAccountInfo(null);
    setErrorMsg('');
  };

  // Initiate Registration Confirmation
  const handleInitiateRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedStudent) {
      setErrorMsg('Student ID must be verified first.');
      setRegStep(1);
      return;
    }

    if (!regEmail.trim() || !regPassword) {
      setErrorMsg('Account email address and password are required.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setErrorMsg('');
    setConfirmRegisterModalOpen(true);
  };

  // User confirmed registration in modal
  const handleConfirmRegisterProceed = async () => {
    if (!verifiedStudent) return;
    setLoading(true);
    setErrorMsg('');
    setConfirmRegisterModalOpen(false);

    try {
      await register({
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        fullName: verifiedStudent.fullName,
        studentId: verifiedStudent.studentId,
        majorSubject: verifiedStudent.course,
        yearLevel: `Batch ${verifiedStudent.yearGraduated}`,
        contactNumber: contactNumber.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-6">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-blue-100 text-blue-700 rounded-2xl mb-2.5">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {mode === 'login' ? 'SLTCFPDI Examination Portal' : 'Examinee ID Verification & Registration'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Southern Luzon Technological College Foundation Pio Duran Inc.
            </p>
          </div>

          {/* Quick Demo Accounts Banner */}
          {mode === 'login' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-4 space-y-2">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center flex items-center justify-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Instant Demo Login (with Confirmation)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleInitiateDemoLogin('admin@sltcfpdi.edu.ph', 'Administrator', 'demo')}
                  className="py-1.5 px-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition border border-red-200 text-center truncate"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleInitiateDemoLogin('faculty@sltcfpdi.edu.ph', 'Faculty Instructor', 'demo')}
                  className="py-1.5 px-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition border border-blue-200 text-center truncate"
                >
                  Faculty
                </button>
                <button
                  type="button"
                  onClick={() => handleInitiateDemoLogin('SLPD-2022-COL-0841', 'Approved Examinee (SLPD-2022-COL-0841)', 'examinee')}
                  className="py-1.5 px-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition border border-emerald-200 text-center truncate"
                >
                  Approved Student
                </button>
                <button
                  type="button"
                  onClick={() => handleInitiateDemoLogin('SLPD-2024-COL-0190', 'Pending Examinee (SLPD-2024-COL-0190)', 'examinee')}
                  className="py-1.5 px-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition border border-amber-200 text-center truncate"
                >
                  Pending Student
                </button>
              </div>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs mb-4 flex items-start space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{successNotice}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs mb-4 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* LOGIN VIEW                                                */}
          {/* ========================================================= */}
          {mode === 'login' && (
            <div className="space-y-4">
              {/* Tab Selector: Examinee (Student ID) vs Staff (Email) */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('examinee'); setErrorMsg(''); }}
                  className={`py-2 px-3 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                    loginMethod === 'examinee'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Examinee Portal (Student ID)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('staff'); setErrorMsg(''); }}
                  className={`py-2 px-3 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                    loginMethod === 'staff'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Faculty / Admin (Email)</span>
                </button>
              </div>

              {/* 1A. Examinee Login: Passwordless via Student ID */}
              {/* IF PENDING OR DECLINED: Display Dedicated Waiting / Status View */}
              {loginMethod === 'examinee' && examineeWaitState && (
                <div className="space-y-4 text-sm">
                  {examineeWaitState.status === 'PENDING' ? (
                    <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-5 text-amber-950 space-y-4 shadow-sm animate-in fade-in duration-300">
                      <div className="flex items-center space-x-3">
                        <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-200/80 text-amber-800 shrink-0">
                          <Clock className="w-6 h-6 animate-pulse" />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                        </div>
                        <div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                            Clearance Status: Pending Review
                          </div>
                          <h3 className="text-base font-extrabold text-amber-950 mt-0.5">
                            Waiting for Administrator Approval
                          </h3>
                        </div>
                      </div>

                      {/* Prominent required wait message */}
                      <div className="p-3.5 bg-white/95 rounded-xl border border-amber-300 shadow-xs space-y-1.5">
                        <div className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Action Required: Administrator Clearance</span>
                        </div>
                        <p className="text-xs text-amber-900 font-bold leading-relaxed">
                          You need to wait for the approval of the Admin before you are directed to the exam page or your account.
                        </p>
                        <p className="text-[11px] text-amber-800 leading-normal">
                          Your examination clearance request is currently under review by the SLTCFPDI Administrator. Once approved in the Admin Dashboard, this screen will automatically direct you to your examination portal.
                        </p>
                      </div>

                      {/* Student Identification Card */}
                      <div className="bg-white/80 rounded-xl p-3 border border-amber-200 text-xs space-y-1">
                        <div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                          Verified Examinee Identity
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {examineeWaitState.student.fullName}
                        </div>
                        <div className="text-slate-600 flex items-center space-x-2">
                          <span>Student ID: <strong className="font-mono text-blue-700">{examineeWaitState.student.studentId}</strong></span>
                          <span>•</span>
                          <span>{examineeWaitState.student.course}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Graduating Class: Batch {examineeWaitState.student.yearGraduated}
                        </div>
                      </div>

                      {/* Real-time pulse indicator */}
                      <div className="flex items-center justify-between text-[11px] text-amber-800 px-1">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${checkingStatus ? 'animate-spin text-blue-600' : 'animate-spin'}`} />
                          <span>Checking approval status in real-time...</span>
                        </div>
                        <span className="font-mono text-[10px] text-amber-600">Auto-refresh active</span>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleManualCheckStatus}
                          disabled={checkingStatus}
                          className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
                        >
                          {checkingStatus ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Check Approval Status</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExamineeWaitState(null);
                            setErrorMsg('');
                            setSuccessNotice('');
                          }}
                          className="py-2.5 px-3 bg-white hover:bg-amber-100/60 text-amber-900 font-bold rounded-xl text-xs border border-amber-300 transition text-center"
                        >
                          Change Student ID
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* DECLINED state */
                    <div className="bg-red-50/90 border-2 border-red-300 rounded-2xl p-5 text-red-950 space-y-4 shadow-sm animate-in fade-in duration-300">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
                            Clearance Status: Declined
                          </div>
                          <h3 className="text-base font-extrabold text-red-950 mt-0.5">
                            Examination Clearance Declined
                          </h3>
                        </div>
                      </div>

                      <div className="p-3.5 bg-white/95 rounded-xl border border-red-200 text-xs space-y-1.5">
                        <div className="font-bold text-red-900">Administrator Review Notes:</div>
                        <p className="text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-200">
                          "{examineeWaitState.reviewNotes || 'Clearance was declined by Administrator.'}"
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Please resolve the requirements with your department or click below to re-submit your clearance request.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleReSubmitRequest}
                          disabled={reRequesting}
                          className="py-2.5 px-3 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
                        >
                          {reRequesting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Re-submit to Admin</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExamineeWaitState(null);
                            setErrorMsg('');
                          }}
                          className="py-2.5 px-3 bg-white hover:bg-red-100/60 text-red-900 font-bold rounded-xl text-xs border border-red-300 transition text-center"
                        >
                          Change Student ID
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IF NOT IN WAIT STATE: Show Clean Passwordless Student ID Form */}
              {loginMethod === 'examinee' && !examineeWaitState && (
                <form onSubmit={handleInitiateExamineeLogin} className="space-y-4 text-sm">
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
                    <p className="font-semibold flex items-center space-x-1">
                      <GraduationCap className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>Examinee Portal Sign-In</span>
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Input your official Student ID. No password required. If your clearance is pending Admin approval, a wait message will display until approved.
                    </p>
                  </div>

                  {/* Formatted Segmented Student ID Input */}
                  <StudentIdInput
                    value={examineeStudentId}
                    onChange={(id, isValid) => {
                      setExamineeStudentId(id);
                      setExamineeStudentIdValid(isValid);
                      if (errorMsg) setErrorMsg('');
                    }}
                    label="Official Student ID Number"
                    helperText="Fixed prefix 'SLPD' and division 'COL' are required by SLTCFPDI registrar."
                    autoFocus
                  />

                  {/* Quick test buttons for examiners/reviewers */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-slate-500">Quick Test Student IDs:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setExamineeStudentId('SLPD-2022-COL-0841');
                          setExamineeStudentIdValid(true);
                        }}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 text-left transition"
                      >
                        <div className="font-mono font-bold text-[11px]">SLPD-2022-COL-0841</div>
                        <div className="text-[10px] text-emerald-600">Status: Approved (Direct Entry)</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExamineeStudentId('SLPD-2024-COL-0190');
                          setExamineeStudentIdValid(true);
                        }}
                        className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 text-left transition"
                      >
                        <div className="font-mono font-bold text-[11px]">SLPD-2024-COL-0190</div>
                        <div className="text-[10px] text-amber-600">Status: Pending (Wait Message)</div>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-100 transition mt-2 flex items-center justify-center space-x-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Proceed with Student ID</span>
                  </button>
                </form>
              )}

              {/* 1B. Staff Login with Email */}
              {loginMethod === 'staff' && (
                <form onSubmit={handleInitiateStaffLogin} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Institutional Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="faculty@sltcfpdi.edu.ph"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-100 transition mt-2 flex items-center justify-center space-x-2"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Log In as Faculty / Admin</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* REGISTRATION & VERIFICATION VIEW                          */}
          {/* ========================================================= */}
          {mode === 'register' && (
            <div className="space-y-4">
              {/* Step Indicators */}
              <div className="flex items-center justify-between text-xs font-bold px-2 pb-2 border-b border-slate-100">
                <span className={regStep === 1 ? 'text-blue-700 flex items-center space-x-1' : 'text-emerald-700 flex items-center space-x-1'}>
                  {regStep === 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>1. Student ID Verification</span>
                </span>
                <span className={regStep === 2 ? 'text-blue-700' : 'text-slate-400'}>
                  2. Create Individual Account
                </span>
              </div>

              {/* STEP 1: Verify Student ID with SLPD Format */}
              {regStep === 1 && (
                <div className="space-y-4">
                  <form onSubmit={handleVerifyStudentId} className="space-y-4 text-sm">
                    <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
                      <p className="font-semibold">Official Student Masterlist Verification</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Examinee accounts require an official Student ID in the graduating masterlist uploaded by SLTCFPDI Faculty or Admin.
                      </p>
                    </div>

                    <StudentIdInput
                      value={verifyStudentId}
                      onChange={(id, isValid) => {
                        setVerifyStudentId(id);
                        setVerifyIdValid(isValid);
                        setExistingAccountInfo(null);
                        if (errorMsg) setErrorMsg('');
                      }}
                      label="Your Official Student ID Number"
                      helperText="Fixed prefix 'SLPD' and division 'COL' are required by SLTCFPDI registrar."
                      autoFocus
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span>Ready test ID (unregistered in masterlist):</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyStudentId('SLPD-2024-COL-0190');
                          setVerifyIdValid(true);
                          setExistingAccountInfo(null);
                        }}
                        className="font-mono font-bold text-blue-700 hover:underline bg-white px-2 py-0.5 rounded border border-blue-200"
                      >
                        SLPD-2024-COL-0190
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={verifyingId}
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-100 transition flex items-center justify-center space-x-1.5"
                    >
                      {verifyingId ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Checking Official Masterlist...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Student ID & Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* ALREADY REGISTERED ACCOUNT CARD (If student ID exists in users) */}
                  {existingAccountInfo && (
                    <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-amber-950 space-y-3">
                      <div className="flex items-start space-x-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-amber-900">
                            Account Already Registered for This Student ID
                          </h4>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            An individual examinee account is already linked to Student ID <strong className="font-mono">{existingAccountInfo.studentId}</strong>. Duplicate accounts are prohibited.
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1.5">
                        <div className="font-bold text-slate-800">{existingAccountInfo.fullName}</div>
                        <div className="text-[11px] text-slate-600">
                          Program: <span className="font-semibold text-slate-800">{existingAccountInfo.course}</span> • Graduating Class {existingAccountInfo.yearGraduated}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Registered Email: <span className="font-mono font-semibold text-slate-800">{existingAccountInfo.existingEmail}</span>
                        </div>

                        {/* Current Clearance Status Badge */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">MockLET Clearance Status:</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] uppercase ${
                            existingAccountInfo.clearanceStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : existingAccountInfo.clearanceStatus === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {existingAccountInfo.clearanceStatus}
                          </span>
                        </div>

                        {existingAccountInfo.clearanceNotes && (
                          <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                            Admin Note: {existingAccountInfo.clearanceNotes}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGoToLoginWithExistingId(existingAccountInfo.studentId)}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-1.5"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Log In with Student ID {existingAccountInfo.studentId}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Account Creation with Verified Masterlist Record */}
              {regStep === 2 && verifiedStudent && (
                <form onSubmit={handleInitiateRegistration} className="space-y-3.5 text-xs">
                  {/* Verified Student Banner */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-xs text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Masterlist Record Confirmed</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setRegStep(1); setVerifiedStudent(null); }}
                        className="text-[11px] text-emerald-700 hover:underline font-semibold"
                      >
                        Change ID
                      </button>
                    </div>
                    <div className="text-slate-900 font-bold text-sm">{verifiedStudent.fullName}</div>
                    <div className="text-slate-600 text-[11px]">
                      Student ID: <span className="font-mono font-bold text-blue-700">{verifiedStudent.studentId}</span> • {verifiedStudent.course} (Batch {verifiedStudent.yearGraduated})
                    </div>
                    <div className="text-[10px] text-emerald-800 bg-emerald-100/60 p-1.5 rounded mt-1">
                      Your examination clearance request will automatically be queued for Administrator review upon account registration.
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Account Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g., student.name@sltcfpdi.edu.ph"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Contact / Mobile Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="0917-xxx-xxxx"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-100 transition mt-2 flex items-center justify-center space-x-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Individual Account & Submit Request</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Toggle between Login and Register */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                New examinee at SLTCFPDI?{' '}
                <button
                  onClick={() => { setMode('register'); setRegStep(1); setErrorMsg(''); setExistingAccountInfo(null); }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Verify Student ID & Register Here
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setErrorMsg(''); setExistingAccountInfo(null); }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Log In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONFIRMATION MODAL BEFORE LOGIN                           */}
      {/* ========================================================= */}
      {confirmLoginModalOpen && pendingLoginTarget && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto">
              <LogIn className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Confirm Portal Login</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to proceed and authenticate as:
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-800">
              <div className="font-bold text-sm font-mono text-blue-700">{pendingLoginTarget.identifier}</div>
              {pendingLoginTarget.roleLabel && (
                <div className="text-[11px] font-semibold text-slate-500">
                  Role: <span className="text-slate-700">{pendingLoginTarget.roleLabel}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              {pendingLoginTarget.type === 'examinee'
                ? 'Confirming will verify your Student ID against the official masterlist. If your clearance is pending Admin review, you will be shown the approval waiting screen.'
                : 'Confirming will initiate your authorized session. Cancel will abort this action without signing in.'}
            </p>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={handleCancelLogin}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLoginProceed}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition"
              >
                Confirm Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIRMATION MODAL BEFORE REGISTRATION                    */}
      {/* ========================================================= */}
      {confirmRegisterModalOpen && verifiedStudent && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Confirm Account Registration</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to create an individual examinee account for:
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-left text-slate-800">
              <div className="font-bold text-sm text-slate-900">{verifiedStudent.fullName}</div>
              <div className="font-mono text-blue-700 font-bold">{verifiedStudent.studentId}</div>
              <div className="text-[11px] text-slate-600">{verifiedStudent.course}</div>
              <div className="text-[11px] text-slate-500">Email: {regEmail}</div>
            </div>

            <p className="text-[11px] text-slate-400">
              Upon confirmation, your individual MockLET Examination Clearance Request will be queued for Administrator approval.
            </p>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRegisterModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegisterProceed}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
              >
                Confirm & Register
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
