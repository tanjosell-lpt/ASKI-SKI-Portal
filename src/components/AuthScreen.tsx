import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AskiLogo } from './AskiLogo';
import { 
  LogIn, 
  UserPlus, 
  KeyRound, 
  Mail, 
  Hash, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  CreditCard,
  Camera,
  Upload,
  User,
  GraduationCap,
  X,
  Send,
  ArrowLeft,
  Lock
} from 'lucide-react';
import { ClassSubject, UserRole } from '../types';

interface AuthScreenProps {
  classes: ClassSubject[];
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ classes }) => {
  const { 
    signIn, 
    signUp, 
    signUpTeacher, 
    signInWithGoogle, 
    requestPasswordReset,
    verifyOtpAndResetPassword 
  } = useAuth();

  // Role Chooser: Student | Teacher | Admin
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Sign In inputs
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Student Sign Up inputs
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [lrn, setLrn] = useState('');
  const [studentPhoto, setStudentPhoto] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [classCode, setClassCode] = useState(classes[0]?.classCode || 'SKI-10A');

  // Teacher Sign Up inputs (every part mandatory: Name, Email, Password, and Photo)
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherPhoto, setTeacherPhoto] = useState<string>('');

  // Admin Sign In: No email needed. Only username and password!
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Forgot Password / OTP Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'success'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotOtpSentInfo, setForgotOtpSentInfo] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Status & notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingSuccessData, setPendingSuccessData] = useState<{
    name: string;
    lrn?: string;
    classCode: string;
    email: string;
    photo?: string;
  } | null>(null);
  const [teacherSuccessMsg, setTeacherSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const studentFileInputRef = useRef<HTMLInputElement>(null);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);

  // Handle student photo file selection
  const handleStudentPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setStudentPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle teacher photo file selection
  const handleTeacherPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTeacherPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (selectedRole === 'admin') {
      if (!adminUsername.trim()) {
        setErrorMsg('Please enter the administrator username.');
        setLoading(false);
        return;
      }
      if (!adminPassword.trim()) {
        setErrorMsg('Please enter the administrator password.');
        setLoading(false);
        return;
      }
      const res = await signIn(adminUsername.trim(), adminPassword.trim(), 'admin');
      if (!res.success) {
        setErrorMsg(res.message || 'Invalid administrator username or password.');
      }
      setLoading(false);
      return;
    }

    if (selectedRole === 'teacher') {
      if (!signInIdentifier.trim()) {
        setErrorMsg('Faculty email address is mandatory.');
        setLoading(false);
        return;
      }
      if (!signInPassword.trim()) {
        setErrorMsg('Password is mandatory.');
        setLoading(false);
        return;
      }
    }

    // Special auto-healing: if admin email tanjosell.lpt@gmail.com is entered anywhere, auto-promote to admin
    if (signInIdentifier.toLowerCase().trim() === 'tanjosell.lpt@gmail.com') {
      await signIn('tanjosell.lpt@gmail.com', signInPassword, 'admin');
      setLoading(false);
      return;
    }

    const res = await signIn(signInIdentifier, signInPassword, selectedRole);
    if (!res.success) {
      setErrorMsg(res.message || 'Invalid credentials or pending approval.');
    }
    setLoading(false);
  };

  const isValidSignupEmail = (email: string) => {
    const clean = email.trim().toLowerCase();
    return clean.endsWith('@gmail.com') || clean.endsWith('@aski-ski.edu.ph');
  };

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // If admin email was entered in student signup by mistake, heal it immediately
    if (signUpEmail.trim().toLowerCase() === 'tanjosell.lpt@gmail.com') {
      await signIn('tanjosell.lpt@gmail.com', signUpPassword, 'admin');
      setLoading(false);
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !signUpEmail.trim()) {
      setErrorMsg('Please enter your first name, last name, and email address.');
      return;
    }

    // Strict domain check: only gmail.com and aski-ski.edu.ph allowed
    if (!isValidSignupEmail(signUpEmail)) {
      setErrorMsg('Registration requires a valid @gmail.com or @aski-ski.edu.ph institutional email address.');
      return;
    }

    if (!classCode.trim()) {
      setErrorMsg('Please enter a valid Class Code provided by your teacher.');
      return;
    }

    setLoading(true);
    const res = await signUp({
      firstName,
      middleName,
      lastName,
      lrn: lrn.trim() || undefined,
      avatar: studentPhoto || undefined,
      email: signUpEmail,
      password: signUpPassword,
      classCode,
    });

    if (res.success && res.user) {
      setPendingSuccessData({
        name: res.user.displayName,
        lrn: res.user.lrn,
        classCode: res.user.classCode || classCode,
        email: res.user.email,
        photo: res.user.avatar,
      });
    } else {
      setErrorMsg(res.message || 'Registration failed. Please check your inputs.');
    }
    setLoading(false);
  };

  const handleTeacherSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Mandatory fields check for teacher
    if (!teacherPhoto) {
      setErrorMsg('Faculty Profile Photo is mandatory. Please upload a clear photo.');
      return;
    }

    if (!teacherName.trim()) {
      setErrorMsg('Full Name is mandatory.');
      return;
    }

    if (!teacherEmail.trim()) {
      setErrorMsg('Email Address is mandatory.');
      return;
    }

    // Strict domain check: only gmail.com and aski-ski.edu.ph allowed
    if (!isValidSignupEmail(teacherEmail)) {
      setErrorMsg('Faculty registration requires a valid @aski-ski.edu.ph or @gmail.com email address.');
      return;
    }

    if (!teacherPassword.trim()) {
      setErrorMsg('Password is mandatory.');
      return;
    }

    setLoading(true);
    const res = await signUpTeacher({
      name: teacherName.trim(),
      email: teacherEmail.trim(),
      password: teacherPassword,
      avatar: teacherPhoto,
    });

    if (res.success && res.user) {
      setTeacherSuccessMsg(`Teacher account created for ${res.user.displayName}! Signing in...`);
      setTimeout(() => {
        signIn(res.user!.email, res.user!.password || teacherPassword, 'teacher');
      }, 1000);
    } else {
      setErrorMsg(res.message || 'Teacher registration failed.');
    }
    setLoading(false);
  };

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
    setTeacherSuccessMsg(null);
    setActiveTab('signin');
    // Ensure inputs are completely empty so users input their own credentials
    setAdminUsername('');
    setAdminPassword('');
    setSignInIdentifier('');
    setSignInPassword('');
  };

  // Forgot password handlers
  const handleOpenForgotModal = () => {
    setForgotStep('request');
    setForgotEmail(signInIdentifier || '');
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
    setForgotOtpSentInfo(null);
    setForgotError(null);
    setForgotSuccess(null);
    setIsForgotModalOpen(true);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address or identifier.');
      return;
    }
    setForgotLoading(true);
    const res = await requestPasswordReset(forgotEmail);
    if (res.success) {
      setForgotOtpSentInfo(res.message + (res.otpCode ? ` (Verification Code: ${res.otpCode})` : ''));
      if (res.otpCode) {
        setForgotOtp(res.otpCode);
      }
      setForgotStep('verify');
    } else {
      setForgotError(res.message);
    }
    setForgotLoading(false);
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!forgotOtp.trim()) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (forgotNewPass.length < 6) {
      setForgotError('New password must be at least 6 characters in length.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Passwords do not match. Please verify and re-type.');
      return;
    }
    setForgotLoading(true);
    const res = await verifyOtpAndResetPassword(forgotEmail, forgotOtp, forgotNewPass);
    if (res.success) {
      setForgotSuccess(res.message);
      setForgotStep('success');
      setSignInPassword(forgotNewPass);
      if (forgotEmail) setSignInIdentifier(forgotEmail);
    } else {
      setForgotError(res.message);
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Decorative Brand Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0b3b60]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 space-y-5">
        {/* Institutional Header with Official School Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <AskiLogo size="xl" showText={false} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0b3b60] tracking-tight">
              ASKI SKI Portal
            </h1>
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mt-0.5">
              Transformation • Discipline • Excellence
            </p>
          </div>
        </div>

        {/* SECTION 1: ROLE CHOOSER (Student, Teacher, Admin) before proceeding to login & signup */}
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-3 shadow-lg shadow-black/[0.03]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2.5">
            Select Portal Access
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectRole('student')}
              className={`apple-tap p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-center border ${
                selectedRole === 'student'
                  ? 'bg-[#0b3b60] text-white border-[#0b3b60] shadow-md shadow-blue-950/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <GraduationCap className={`w-5 h-5 ${selectedRole === 'student' ? 'text-amber-300' : 'text-[#0b3b60]'}`} />
              <div>
                <div className="font-bold text-xs">Student</div>
                <div className={`text-[9px] ${selectedRole === 'student' ? 'text-blue-100' : 'text-slate-400'}`}>Score Board</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('teacher')}
              className={`apple-tap p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-center border ${
                selectedRole === 'teacher'
                  ? 'bg-[#0b3b60] text-white border-[#0b3b60] shadow-md shadow-blue-950/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <BookOpen className={`w-5 h-5 ${selectedRole === 'teacher' ? 'text-amber-300' : 'text-[#0b3b60]'}`} />
              <div>
                <div className="font-bold text-xs">Teacher</div>
                <div className={`text-[9px] ${selectedRole === 'teacher' ? 'text-blue-100' : 'text-slate-400'}`}>Faculty</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('admin')}
              className={`apple-tap p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-center border ${
                selectedRole === 'admin'
                  ? 'bg-[#0b3b60] text-white border-[#0b3b60] shadow-md shadow-blue-950/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <ShieldCheck className={`w-5 h-5 ${selectedRole === 'admin' ? 'text-amber-300' : 'text-amber-600'}`} />
              <div>
                <div className="font-bold text-xs">Admin</div>
                <div className={`text-[9px] ${selectedRole === 'admin' ? 'text-blue-100' : 'text-slate-400'}`}>System</div>
              </div>
            </button>
          </div>
        </div>

        {/* If pending student approval confirmation */}
        {pendingSuccessData ? (
          <div className="bg-white border border-amber-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl shadow-amber-900/5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto border-2 border-amber-400 shadow-md">
              {pendingSuccessData.photo ? (
                <img src={pendingSuccessData.photo} alt={pendingSuccessData.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#0b3b60] text-amber-300 flex items-center justify-center font-bold text-xl">
                  {pendingSuccessData.name.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Sign Up Submitted • Pending Admin Approval
              </span>
              <h2 className="text-xl font-bold text-[#0b3b60] mt-3">
                Welcome, {pendingSuccessData.name}!
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Your registration for Class Code <strong className="text-[#0b3b60] font-mono">{pendingSuccessData.classCode}</strong> has been forwarded to the ASKI-SKI administration.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
              {pendingSuccessData.lrn && (
                <div className="text-slate-600">
                  LRN: <span className="text-[#0b3b60] font-mono font-bold">{pendingSuccessData.lrn}</span>
                </div>
              )}
              <div className="text-slate-600">
                Registered Email: <span className="text-slate-800 font-mono font-semibold">{pendingSuccessData.email}</span>
              </div>
              <div className="text-slate-600">
                Status: <span className="text-amber-600 font-bold">Pending Administrator Approval</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setPendingSuccessData(null);
                  setActiveTab('signin');
                }}
                className="w-full py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white font-bold text-xs shadow-md transition"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* SECTION 2: LOGIN & SIGN UP SECTION */
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-5">
            {/* Active Role Indicator */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="font-extrabold text-xs text-[#0b3b60] uppercase tracking-wider">
                  {selectedRole === 'student' ? 'Student Portal' : selectedRole === 'teacher' ? 'Faculty Teacher Portal' : 'Administrator Console'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                ASKI-SKI Talavera
              </span>
            </div>

            {/* Error or Success banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}
            {teacherSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{teacherSuccessMsg}</span>
              </div>
            )}

            {/* 1. STUDENT LOGIN / SIGN UP */}
            {selectedRole === 'student' && (
              <div className="space-y-4">
                {/* 2 Choices Selector: 1. Sign In | 2. Sign Up */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                      activeTab === 'signin' ? 'bg-[#0b3b60] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>1. Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('signup'); setErrorMsg(null); }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                      activeTab === 'signup' ? 'bg-[#0b3b60] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>2. Sign Up</span>
                  </button>
                </div>

                {/* Student Sign In */}
                {activeTab === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Email Address or 12-Digit LRN
                        </label>
                        <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          LRN Supported
                        </span>
                      </div>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. 102938475601 or jiro.adriano@aski-ski.edu.ph"
                          value={signInIdentifier}
                          onChange={(e) => setSignInIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenForgotModal}
                          className="text-[11px] font-semibold text-[#007AFF] hover:underline transition apple-tap"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white font-bold text-xs shadow-md shadow-blue-950/20 transition hover:scale-[1.01]"
                    >
                      {loading ? 'Verifying...' : 'Sign In as Student'}
                    </button>
                  </form>
                )}

                {/* Student Sign Up with Photo Upload */}
                {activeTab === 'signup' && (
                  <form onSubmit={handleStudentSignUp} className="space-y-3">
                    {/* Circle Photo Upload Input */}
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 bg-white shrink-0 flex items-center justify-center shadow-xs">
                        {studentPhoto ? (
                          <img src={studentPhoto} alt="Student preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-800">
                          Student Photo (2x2 / ID Photo)
                        </label>
                        <p className="text-[10px] text-slate-400 mb-1.5">
                          Upload your photo to show on your Score Board
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          ref={studentFileInputRef}
                          onChange={handleStudentPhotoChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => studentFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#0b3b60]" />
                          <span>{studentPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Separated First, Middle, Last Name */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Jiro"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Middle Name
                        </label>
                        <input
                          type="text"
                          placeholder="De Guzman"
                          value={middleName}
                          onChange={(e) => setMiddleName(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          placeholder="Adriano"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                          required
                        />
                      </div>
                    </div>

                    {/* 12-Digit LRN */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        12-Digit LRN (Learner Reference Number)
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          maxLength={12}
                          placeholder="e.g. 102938475601"
                          value={lrn}
                          onChange={(e) => setLrn(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-[#0b3b60] focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="student@aski-ski.edu.ph"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          placeholder="Create password"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Class Code (provided by your teacher) *
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-[#0b3b60] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. SKI-10A"
                          value={classCode}
                          onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-[#0b3b60] uppercase focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      ⏳ Note: After sign up, your account is placed in <strong>Pending Admin Approval</strong> queue.
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white font-bold text-xs shadow-md shadow-blue-950/20 transition hover:scale-[1.01]"
                    >
                      {loading ? 'Submitting registration...' : 'Sign Up & Request Approval'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 2. TEACHER LOGIN & SIGN UP */}
            {selectedRole === 'teacher' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                      activeTab === 'signin' ? 'bg-[#0b3b60] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Teacher Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('signup'); setErrorMsg(null); }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                      activeTab === 'signup' ? 'bg-[#0b3b60] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Teacher Registration</span>
                  </button>
                </div>

                {/* Teacher Sign In */}
                {activeTab === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Faculty Email Address <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="teacher.tanjosell@aski-ski.edu.ph"
                          value={signInIdentifier}
                          onChange={(e) => setSignInIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Password <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenForgotModal}
                          className="text-[11px] font-semibold text-[#007AFF] hover:underline transition apple-tap"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="apple-tap w-full py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white font-bold text-xs shadow-md shadow-blue-950/20 transition hover:scale-[1.01]"
                    >
                      {loading ? 'Signing in...' : 'Sign In to Faculty Portal'}
                    </button>
                  </form>
                )}

                {/* Teacher Sign Up: EVERY part is mandatory to fill out including profile photo */}
                {activeTab === 'signup' && (
                  <form onSubmit={handleTeacherSignUp} className="space-y-3.5">
                    {/* Circle Photo Upload Input - Mandatory */}
                    <div className={`flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border transition ${
                      !teacherPhoto ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                    }`}>
                      <div className={`relative w-14 h-14 rounded-full overflow-hidden border-2 ${
                        teacherPhoto ? 'border-amber-400' : 'border-dashed border-amber-400 bg-amber-50'
                      } shrink-0 flex items-center justify-center shadow-xs`}>
                        {teacherPhoto ? (
                          <img src={teacherPhoto} alt="Teacher preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-amber-500" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-800">
                            Faculty Profile Photo <span className="text-rose-600 font-extrabold">* (Mandatory)</span>
                          </label>
                          {teacherPhoto ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Attached
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-500">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mb-1.5">
                          Display photo for your teacher dashboard
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          ref={teacherFileInputRef}
                          onChange={handleTeacherPhotoChange}
                          className="hidden"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => teacherFileInputRef.current?.click()}
                          className="apple-tap inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#0b3b60]" />
                          <span>{teacherPhoto ? 'Change Photo' : 'Upload Required Photo'}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-rose-600 font-bold">* (Mandatory)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Prof. Tanjosell"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Email Address <span className="text-rose-600 font-bold">* (Mandatory)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="teacher@aski-ski.edu.ph"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Password <span className="text-rose-600 font-bold">* (Mandatory)</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Create strong password"
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                        required
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-[#0b3b60]">
                      ℹ️ Teachers can also be added directly by the Portal Administrator in the Admin section.
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="apple-tap w-full py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white font-bold text-xs shadow-md shadow-blue-950/20 transition hover:scale-[1.01]"
                    >
                      {loading ? 'Creating account...' : 'Create Teacher Account'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 3. ADMIN LOGIN (User inputs username and password themselves) */}
            {selectedRole === 'admin' && (
              <form onSubmit={handleSignIn} autoComplete="off" className="space-y-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#0b3b60] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">Administrator Access Portal</span>
                    <span className="text-[11px] text-slate-500">
                      Please enter your administrator username and password to proceed.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Administrator Username <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Enter administrator username"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenForgotModal}
                      className="text-[11px] font-semibold text-[#007AFF] hover:underline transition apple-tap"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="apple-tap w-full py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white font-bold text-xs shadow-md shadow-blue-950/20 transition hover:scale-[1.01]"
                >
                  {loading ? 'Verifying admin...' : 'Sign In as Administrator'}
                </button>
              </form>
            )}

            {/* Google Account OAuth Link */}
            <div className="pt-1">
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400">
                  Or continue with
                </span>
              </div>

              <button
                type="button"
                onClick={() => signInWithGoogle(selectedRole)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-700 flex items-center justify-center gap-2.5 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google Account</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer: Strictly Transformation Discipline Excellence */}
        <footer className="pt-4 pb-2 text-center select-none">
          <p className="text-xs tracking-widest text-slate-400 font-medium uppercase">
            Transformation Discipline Excellence
          </p>
        </footer>
      </div>

      {/* Forgot Password / OTP Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#0b3b60] flex items-center justify-center border border-blue-200">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    {forgotStep === 'success' ? 'Password Updated' : 'Reset Password'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Security Verification via OTP
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message banner */}
            {forgotError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{forgotError}</span>
              </div>
            )}

            {/* STEP 1: REQUEST OTP */}
            {forgotStep === 'request' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered institutional email address or LRN. We will generate and send a 6-digit verification code to authenticate your identity.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Email Address or LRN <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. teacher@aski-ski.edu.ph or 102938475601"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                      required
                    />
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="apple-tap w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="apple-tap w-2/3 py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white text-xs font-bold shadow-md shadow-blue-950/20 transition flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading ? (
                      <span>Sending OTP...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span>Send Verification OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: VERIFY OTP AND SET NEW PASSWORD */}
            {forgotStep === 'verify' && (
              <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
                {forgotOtpSentInfo && (
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-[#0b3b60] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OTP Code Dispatched</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-700">
                      {forgotOtpSentInfo}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    6-Digit Verification Code (OTP) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono tracking-widest font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="Re-type new password"
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="apple-tap w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="apple-tap w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading ? (
                      <span>Updating...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION */}
            {forgotStep === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Password Reset Complete!
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                    Your password has been successfully updated. You can now proceed to log in with your new credentials.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="apple-tap w-full py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] text-white text-xs font-bold shadow-md transition"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
