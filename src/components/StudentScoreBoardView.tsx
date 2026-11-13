import React, { useRef, useState, useMemo } from 'react';
import { StudentScoreBoard, ClassSubject, calculateScoreBoardTotals } from '../types';
import { useAuth } from '../context/AuthContext';
import { AskiLogo } from './AskiLogo';
import { ConfirmModal } from './ConfirmModal';
import { 
  Printer, 
  Clock, 
  FileText, 
  Camera, 
  BookOpen, 
  Plus, 
  Check, 
  AlertCircle, 
  X, 
  Trash2, 
  Copy, 
  CheckCircle2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface StudentScoreBoardViewProps {
  scoreBoards: StudentScoreBoard[];
  classes: ClassSubject[];
}

export const StudentScoreBoardView: React.FC<StudentScoreBoardViewProps> = ({ 
  scoreBoards,
  classes 
}) => {
  const { 
    currentUser, 
    updateUserAvatar, 
    enrollInSubject, 
    unenrollSubject,
    enrollmentsList,
    logout 
  } = useAuth();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const studentPhotoRef = useRef<HTMLInputElement>(null);

  // Join Subject Modal State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inputClassCode, setInputClassCode] = useState('');
  const [joinStatus, setJoinStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Filter student-specific scoreboards strictly for THIS student only
  const myScoreBoards = useMemo(() => {
    if (!currentUser) return [];
    return scoreBoards.filter((sb) => {
      const matchId = sb.studentId === currentUser.id;
      const matchEmail = sb.studentEmail && sb.studentEmail.toLowerCase().trim() === currentUser.email?.toLowerCase().trim();
      const matchLrn = currentUser.lrn && sb.lrn && sb.lrn.trim() === currentUser.lrn.trim();
      const matchStuNum = currentUser.studentNumber && sb.studentNumber && sb.studentNumber === currentUser.studentNumber;
      return matchId || matchEmail || matchLrn || matchStuNum;
    });
  }, [scoreBoards, currentUser]);

  // Pending enrollment requests for current student
  const myPendingEnrollments = useMemo(() => {
    if (!currentUser) return [];
    return enrollmentsList.filter((e) => {
      const matchId = e.studentId === currentUser.id;
      const matchEmail = currentUser.email && e.studentEmail && e.studentEmail.toLowerCase() === currentUser.email.toLowerCase();
      return (matchId || matchEmail) && e.status === 'pending';
    });
  }, [enrollmentsList, currentUser]);

  // Rejected enrollment requests for current student
  const myRejectedEnrollments = useMemo(() => {
    if (!currentUser) return [];
    return enrollmentsList.filter((e) => {
      const matchId = e.studentId === currentUser.id;
      const matchEmail = currentUser.email && e.studentEmail && e.studentEmail.toLowerCase() === currentUser.email.toLowerCase();
      return (matchId || matchEmail) && e.status === 'rejected';
    });
  }, [enrollmentsList, currentUser]);

  // Combined approved enrolled subjects list (like Google Classroom classes enrolled)
  const enrolledSubjects = useMemo(() => {
    const list: {
      classCode: string;
      subjectName: string;
      section: string;
      teacherName: string;
      term?: string;
      schedule?: string;
      room?: string;
    }[] = [];
    const seen = new Set<string>();

    const isPendingOrRejected = (code: string) => {
      const norm = code.trim().toUpperCase();
      return (
        myPendingEnrollments.some((e) => e.classCode.toUpperCase() === norm) ||
        myRejectedEnrollments.some((e) => e.classCode.toUpperCase() === norm)
      );
    };

    const isExplicitlyUnenrolled = (code: string) => {
      const norm = code.trim().toUpperCase();
      const currentEnrolled = currentUser?.enrolledClassCodes || (currentUser?.classCode ? [currentUser.classCode] : []);
      // If code is not in currentUser.enrolledClassCodes, it has been unenrolled
      return currentUser && !currentEnrolled.some((c) => c.trim().toUpperCase() === norm);
    };

    // 1. From approved enrollments in Firestore (only if not explicitly unenrolled)
    enrollmentsList
      .filter((e) => {
        const matchId = e.studentId === currentUser?.id;
        const matchEmail = currentUser?.email && e.studentEmail && e.studentEmail.toLowerCase() === currentUser.email.toLowerCase();
        return (matchId || matchEmail) && e.status === 'approved';
      })
      .forEach((enr) => {
        const norm = enr.classCode.trim().toUpperCase();
        if (!seen.has(norm) && !isExplicitlyUnenrolled(norm)) {
          seen.add(norm);
          const cls = classes.find((c) => c.classCode.toUpperCase() === norm);
          list.push({
            classCode: norm,
            subjectName: cls?.subjectName || enr.subjectName || 'Enrolled Subject',
            section: cls?.section || enr.section || 'Regular Section',
            teacherName: cls?.teacherName || enr.teacherName || 'Assigned Faculty',
            term: cls?.term || enr.term || 'Term 1',
            schedule: cls?.schedule,
            room: cls?.room,
          });
        }
      });

    // 2. From currentUser.enrolledClassCodes (if approved and not pending/rejected)
    (currentUser?.enrolledClassCodes || []).forEach((code) => {
      const norm = code.trim().toUpperCase();
      if (!seen.has(norm) && !isPendingOrRejected(norm)) {
        seen.add(norm);
        const cls = classes.find((c) => c.classCode.toUpperCase() === norm);
        list.push({
          classCode: norm,
          subjectName: cls?.subjectName || 'Enrolled Subject',
          section: cls?.section || 'Regular Section',
          teacherName: cls?.teacherName || 'Assigned Faculty',
          term: cls?.term || 'Term 1',
          schedule: cls?.schedule,
          room: cls?.room,
        });
      }
    });

    // 3. From student's own scoreboards in Firestore (if not pending)
    myScoreBoards.forEach((sb) => {
      const norm = sb.classCode.trim().toUpperCase();
      if (!seen.has(norm) && !isPendingOrRejected(norm)) {
        seen.add(norm);
        const cls = classes.find((c) => c.classCode.toUpperCase() === norm);
        list.push({
          classCode: norm,
          subjectName: cls?.subjectName || sb.subjectName || 'Enrolled Subject',
          section: cls?.section || sb.section || 'Regular Section',
          teacherName: cls?.teacherName || sb.teacherName || 'Assigned Faculty',
          term: cls?.term || 'Term 1',
          schedule: cls?.schedule,
          room: cls?.room,
        });
      }
    });

    return list;
  }, [classes, myScoreBoards, currentUser, enrollmentsList, myPendingEnrollments, myRejectedEnrollments]);

  // Selected class code state
  const [selectedClassCode, setSelectedClassCode] = useState<string>(
    enrolledSubjects[0]?.classCode || ''
  );

  // Sync selectedClassCode when enrolledSubjects updates
  React.useEffect(() => {
    if (enrolledSubjects.length > 0) {
      if (!enrolledSubjects.some((s) => s.classCode === selectedClassCode)) {
        setSelectedClassCode(enrolledSubjects[0].classCode);
      }
    } else {
      setSelectedClassCode('');
    }
  }, [enrolledSubjects, selectedClassCode]);

  const activeSubjectInfo = enrolledSubjects.find((s) => s.classCode === selectedClassCode) || enrolledSubjects[0] || null;

  // Current active scoreboard: Strictly for current student and active subject
  const currentScoreBoard = useMemo<StudentScoreBoard | null>(() => {
    if (!activeSubjectInfo || !currentUser) return null;

    const found = myScoreBoards.find(
      (sb) => sb.classCode.toUpperCase() === activeSubjectInfo.classCode.toUpperCase()
    );
    if (found) return found;

    // Fallback template for the enrolled subject
    return {
      id: `sb-${currentUser.id}-${activeSubjectInfo.classCode.toLowerCase()}`,
      studentId: currentUser.id,
      studentNumber: currentUser.studentNumber || '2024-XXXX',
      lrn: currentUser.lrn || 'Pending DepEd LRN',
      studentName: currentUser.displayName,
      studentEmail: currentUser.email,
      classCode: activeSubjectInfo.classCode,
      subjectName: activeSubjectInfo.subjectName,
      section: activeSubjectInfo.section,
      teacherName: activeSubjectInfo.teacherName,
      writtenWorks: [
        { id: 'ww-1', title: 'Written Work 1', score: 0, maxScore: 25 },
        { id: 'ww-2', title: 'Written Work 2', score: 0, maxScore: 25 },
        { id: 'ww-3', title: 'Written Work 3', score: 0, maxScore: 20 },
      ],
      performanceTasks: [
        { id: 'pt-1', title: 'Product/Performance Task 1', score: 0, maxScore: 30 },
        { id: 'pt-2', title: 'Product/Performance Task 2', score: 0, maxScore: 30 },
        { id: 'pt-3', title: 'Product/Performance Task 3', score: 0, maxScore: 30 },
      ],
      summativeTests: [
        { id: 'st-1', title: 'Summative Test 1', score: 0, maxScore: 30 },
        { id: 'st-2', title: 'Summative Test 2', score: 0, maxScore: 30 },
      ],
      termExam: {
        id: 'term-1',
        title: 'Quarterly Term Exam',
        score: 0,
        maxScore: 60,
      },
      remarks: 'Enrolled subject. Awaiting faculty score entry.',
      updatedAt: new Date().toISOString(),
    };
  }, [myScoreBoards, activeSubjectInfo, currentUser]);

  const handleStudentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onload = () => {
        updateUserAvatar(currentUser.id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJoinSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinStatus(null);
    const cleanCode = inputClassCode.trim().toUpperCase();
    if (!cleanCode) {
      setJoinStatus({ type: 'error', message: 'Please enter a Subject Code.' });
      return;
    }

    setJoinLoading(true);
    const res = await enrollInSubject(cleanCode, classes);
    if (res.success) {
      setJoinStatus({ type: 'success', message: res.message });
      setSelectedClassCode(cleanCode);
      setTimeout(() => {
        setIsJoinModalOpen(false);
        setInputClassCode('');
        setJoinStatus(null);
      }, 1200);
    } else {
      setJoinStatus({ type: 'error', message: res.message });
    }
    setJoinLoading(false);
  };

  const handleUnenroll = (classCode: string, subjectName: string) => {
    setConfirmDialog({
      title: 'Drop Subject',
      message: `Are you sure you want to unenroll from ${subjectName} (${classCode})?`,
      confirmLabel: 'Drop Subject',
      onConfirm: async () => {
        const res = await unenrollSubject(classCode);
        if (res.success && selectedClassCode === classCode) {
          const remaining = enrolledSubjects.filter((s) => s.classCode !== classCode);
          setSelectedClassCode(remaining[0]?.classCode || '');
        }
      },
    });
  };

  const handleCopyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // If student registration is pending approval
  if (currentUser?.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white border border-amber-200 rounded-3xl p-8 sm:p-12 text-center shadow-lg shadow-amber-950/5 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border-2 border-amber-200">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Registration Pending Admin Approval
            </span>
            <h1 className="text-2xl font-black text-[#0b3b60] mt-3">
              Kumusta, {currentUser.displayName}!
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Your student registration has been received by ASKI-SKI and is awaiting Administrator approval.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left max-w-sm mx-auto space-y-1.5 text-slate-600">
            <div>• <strong className="text-slate-800">Learner Name:</strong> {currentUser.displayName}</div>
            {currentUser.lrn && (
              <div>• <strong className="text-slate-800">LRN:</strong> <span className="font-mono font-bold text-[#0b3b60]">{currentUser.lrn}</span></div>
            )}
            <div>• <strong className="text-slate-800">Email:</strong> {currentUser.email}</div>
            <div>• <strong className="text-slate-800">Status:</strong> <span className="text-amber-600 font-bold">Pending Administrator Approval</span></div>
          </div>

          <p className="text-[11px] text-slate-400">
            Once an administrator accepts your account, you will be able to enroll in all your subjects using each teacher's class code.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              onClick={logout}
              className="apple-tap inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              <span>Sign Out / Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const studentDisplayName = currentUser?.displayName || currentScoreBoard?.studentName || 'Learner';
  const studentLrn = currentUser?.lrn || currentScoreBoard?.lrn || '102938475601';
  const totals = currentScoreBoard ? calculateScoreBoardTotals(currentScoreBoard) : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (hidden when printing) - Photo, Student Name, Subject Tabs, and Actions */}
      <div className="bg-white/90 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl border border-black/[0.06] shadow-sm print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Student Circle Photo with Upload ability */}
            <div className="relative group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-amber-400 bg-white/10 shrink-0 shadow-md flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={studentDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-xl text-[#0b3b60]">
                    {studentDisplayName.charAt(0)}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={studentPhotoRef}
                onChange={handleStudentPhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => studentPhotoRef.current?.click()}
                className="apple-tap absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs border border-white transition hover:scale-110"
                title="Upload / Change Photo"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-[#0b3b60]">
                  {studentDisplayName}
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0b3b60] border border-blue-200">
                  LRN: {studentLrn}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Enrolled in <strong className="text-slate-800">{enrolledSubjects.length}</strong> {enrolledSubjects.length === 1 ? 'subject' : 'subjects'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Join Subject Button (Google Classroom Style) */}
            <button
              onClick={() => {
                setJoinStatus(null);
                setInputClassCode('');
                setIsJoinModalOpen(true);
              }}
              className="apple-tap inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Join Subject</span>
            </button>

            {/* Print Button */}
            {activeSubjectInfo && (
              <button
                onClick={handlePrint}
                className="apple-tap inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0b3b60] hover:bg-[#092c4c] text-white text-xs font-bold shadow-md shadow-blue-950/20 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">Print Score Board</span>
              </button>
            )}
          </div>
        </div>

        {/* Google Classroom Subject Selector Bar */}
        {enrolledSubjects.length > 0 ? (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-semibold text-slate-700">Enrolled Subjects ({enrolledSubjects.length})</span>
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="text-[11px] font-bold text-[#007AFF] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Enroll in another subject</span>
              </button>
            </div>

            <div className="bg-slate-200/60 p-1.5 rounded-2xl flex items-center gap-1.5 backdrop-blur-xl border border-black/[0.04] overflow-x-auto">
              {enrolledSubjects.map((subj) => {
                const isSelected = subj.classCode === selectedClassCode;

                return (
                  <button
                    key={subj.classCode}
                    onClick={() => setSelectedClassCode(subj.classCode)}
                    className={`apple-tap px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{subj.subjectName}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-blue-50 text-[#0b3b60] font-bold' : 'bg-slate-200/80 text-slate-500'
                    }`}>
                      {subj.classCode}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Pending Subject Enrollment Requests Section */}
      {myPendingEnrollments.length > 0 && (
        <div className="bg-amber-50/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-amber-200 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <h3 className="font-bold text-xs sm:text-sm text-amber-950">
                Subject Enrollment Requests Under Review ({myPendingEnrollments.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-700/80 font-medium hidden sm:inline">
              Awaiting Teacher or Admin Approval
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {myPendingEnrollments.map((enr) => (
              <div
                key={enr.id}
                className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#0b3b60] truncate">
                    {enr.subjectName}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {enr.classCode}
                    </span>
                    <span className="truncate">Teacher: {enr.teacherName || 'Faculty'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setConfirmDialog({
                      title: 'Withdraw Enrollment Request',
                      message: `Withdraw enrollment request for ${enr.subjectName} (${enr.classCode})?`,
                      confirmLabel: 'Withdraw',
                      onConfirm: async () => {
                        await unenrollSubject(enr.classCode);
                      },
                    });
                  }}
                  className="apple-tap text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl transition shrink-0"
                  title="Cancel Request"
                >
                  Withdraw
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case 1: Student has 0 enrolled subjects (Empty State Card) */}
      {enrolledSubjects.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 border border-black/[0.06] text-center shadow-lg shadow-black/[0.02] space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0b3b60] flex items-center justify-center mx-auto border-2 border-blue-200">
            <GraduationCap className="w-8 h-8 text-[#0b3b60]" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Welcome to ASKI SKI Portal
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#0b3b60]">
              You Haven't Enrolled in Any Subjects Yet
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Just like Google Classroom, you can enroll in multiple subjects with different teachers using their unique Class Codes.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setJoinStatus(null);
                setInputClassCode('');
                setIsJoinModalOpen(true);
              }}
              className="apple-tap inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0b3b60] hover:bg-[#092c4c] text-white font-bold text-xs shadow-lg shadow-blue-950/20 transition hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Enroll in Your First Subject</span>
            </button>
          </div>

          {/* Available Subjects Preview */}
          {classes.length > 0 && (
            <div className="pt-6 border-t border-slate-100 text-left max-w-lg mx-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
                Available Subjects in ASKI SKI (Click to Enroll)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {classes.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setInputClassCode(c.classCode);
                      setIsJoinModalOpen(true);
                    }}
                    className="apple-tap p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left transition group"
                  >
                    <div className="font-bold text-xs text-[#0b3b60] group-hover:text-blue-700">
                      {c.subjectName}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                      <span>{c.teacherName}</span>
                      <span className="font-mono font-bold text-[#0b3b60] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {c.classCode}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Case 2: Official Score Board Document for the active subject */
        <div 
          ref={printAreaRef}
          className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md space-y-6 font-sans print:p-0 print:border-none print:shadow-none"
        >
          {/* Institutional Header with Official School Logo */}
          <div className="border-b-2 border-[#0b3b60] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <AskiLogo size="lg" showText={false} />
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-[#0b3b60] uppercase">
                  ASKI SKILLS AND KNOWLEDGE INSTITUTE, INC.
                </h2>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Transformation • Discipline • Excellence
                </p>
                <p className="text-[11px] text-slate-500 font-serif">
                  Talavera, Nueva Ecija • Academic Score Sheet
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs">
              <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">Academic Assessment</div>
              <div className="font-bold text-[#0b3b60] text-sm">Official Score Board</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Subject: <strong className="text-slate-800">{activeSubjectInfo?.subjectName}</strong>
              </div>
            </div>
          </div>

          {/* Learner & Class Metadata Strip including Circle Photo & LRN */}
          {activeSubjectInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-400 bg-white shrink-0 shadow-xs">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={studentDisplayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#0b3b60] text-amber-300 flex items-center justify-center font-bold text-xs">
                      {studentDisplayName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Learner's Name</span>
                  <span className="text-sm font-black text-[#0b3b60] block uppercase tracking-wide">
                    {studentDisplayName}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 block">
                    LRN: {studentLrn}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Subject / Course</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                  {activeSubjectInfo.subjectName}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {activeSubjectInfo.term || 'Term 1'} Record
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Section & Code</span>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                  {activeSubjectInfo.section} • <span className="font-mono font-bold text-[#0b3b60]">{activeSubjectInfo.classCode}</span>
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Regular Academic Track
                </span>
              </div>

              <div className="flex items-center justify-between sm:block">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Subject Teacher</span>
                  <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                    {activeSubjectInfo.teacherName}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Faculty Instructor
                  </span>
                </div>

                <div className="print:hidden mt-2 sm:mt-1">
                  <button
                    onClick={() => handleUnenroll(activeSubjectInfo.classCode, activeSubjectInfo.subjectName)}
                    className="apple-tap text-[10px] text-slate-400 hover:text-rose-600 transition flex items-center gap-1"
                    title="Unenroll from this subject"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Drop Subject</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Score Tables (WW 20%, PT 50%, Exams 30%) */}
          {currentScoreBoard && totals && (
            <div className="space-y-6">
              {/* Component 1: Written/Oral Works (20%) - 2 to 5 items */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-[#0b3b60] text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider">
                  <span>Written / Oral Works (20%)</span>
                  <span className="text-amber-300 font-mono text-[11px] sm:text-xs">
                    Total Score: {totals.wwTotal} / {totals.wwMax} ({totals.wwPct}%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5 whitespace-nowrap">Task #</th>
                        <th className="px-4 py-2.5 whitespace-nowrap">Description</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Score Obtained</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Highest Possible Score</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">% Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentScoreBoard.writtenWorks.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-4 py-2 font-mono font-bold text-[#0b3b60] whitespace-nowrap">WW {idx + 1}</td>
                          <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.title}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{item.score}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{item.maxScore}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700 font-semibold whitespace-nowrap">
                            {Math.round((item.score / Math.max(item.maxScore, 1)) * 100)}%
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 font-bold">
                        <td colSpan={2} className="px-4 py-2 text-slate-700 uppercase text-[10px] whitespace-nowrap">Total Written / Oral Works</td>
                        <td className="px-4 py-2 text-right font-mono text-[#0b3b60] whitespace-nowrap">{totals.wwTotal}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600 whitespace-nowrap">{totals.wwMax}</td>
                        <td className="px-4 py-2 text-right font-mono text-[#0b3b60] whitespace-nowrap">{totals.wwPct}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Component 2: Product / Performance Tasks (50%) - Required 3 items */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-[#15803d] text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider">
                  <span>Product / Performance Tasks (50%)</span>
                  <span className="text-emerald-200 font-mono text-[11px] sm:text-xs">
                    Total Score: {totals.ptTotal} / {totals.ptMax} ({totals.ptPct}%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5 whitespace-nowrap">Task #</th>
                        <th className="px-4 py-2.5 whitespace-nowrap">Description</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Score Obtained</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Highest Possible Score</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">% Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentScoreBoard.performanceTasks.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-4 py-2 font-mono font-bold text-emerald-700 whitespace-nowrap">PT {idx + 1}</td>
                          <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.title}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{item.score}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{item.maxScore}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700 font-semibold whitespace-nowrap">
                            {Math.round((item.score / Math.max(item.maxScore, 1)) * 100)}%
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 font-bold">
                        <td colSpan={2} className="px-4 py-2 text-slate-700 uppercase text-[10px] whitespace-nowrap">Total Performance Tasks</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-800 whitespace-nowrap">{totals.ptTotal}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600 whitespace-nowrap">{totals.ptMax}</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-800 whitespace-nowrap">{totals.ptPct}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Component 3: Examination (30%) - 2 Summative Tests + 1 Term Examination */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-[#b45309] text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider">
                  <span>Examinations (30%) • 2 Summative Tests + 1 Term Examination</span>
                  <span className="text-amber-200 font-mono text-[11px] sm:text-xs">
                    Total Score: {totals.examTotal} / {totals.examMax} ({totals.examPct}%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5 whitespace-nowrap">Category</th>
                        <th className="px-4 py-2.5 whitespace-nowrap">Description</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Score Obtained</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Highest Possible Score</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">% Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentScoreBoard.summativeTests.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-4 py-2 font-mono font-bold text-amber-700 whitespace-nowrap">ST{idx + 1}</td>
                          <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.title}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{item.score}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{item.maxScore}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700 font-semibold whitespace-nowrap">
                            {Math.round((item.score / Math.max(item.maxScore, 1)) * 100)}%
                          </td>
                        </tr>
                      ))}
                      {/* 1 Term Examination */}
                      <tr className="bg-amber-50/40">
                        <td className="px-4 py-2.5 font-mono font-black text-[#0b3b60] whitespace-nowrap">TE</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {currentScoreBoard.termExam?.title || 'Quarterly Term Examination'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          {currentScoreBoard.termExam?.score || 0}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                          {currentScoreBoard.termExam?.maxScore || 60}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-[#0b3b60] whitespace-nowrap">
                          {Math.round(((currentScoreBoard.termExam?.score || 0) / Math.max(currentScoreBoard.termExam?.maxScore || 60, 1)) * 100)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Google Classroom Style: "Join Subject / Class" Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/[0.06] space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Join Subject
                  </h3>
                  <p className="text-xs text-slate-500">
                    ASKI Skills & Knowledge Institute
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsJoinModalOpen(false);
                  setJoinStatus(null);
                }}
                className="apple-tap p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error / Success Banner */}
            {joinStatus && (
              <div className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                joinStatus.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                {joinStatus.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <span>{joinStatus.message}</span>
              </div>
            )}

            {/* Join Form */}
            <form onSubmit={handleJoinSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Class / Subject Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. SKI-10A, SKI-ENG1, SKI-SC9"
                    value={inputClassCode}
                    onChange={(e) => setInputClassCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-[#0b3b60] placeholder-slate-400 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Ask your teacher for the class code, then enter it here to access their subject gradebook.
                </p>
              </div>

              {/* Quick Suggestions / Available Classes */}
              {classes.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Quick Pick Active Subjects:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {classes.map((cls) => {
                      const alreadyEnrolled = enrolledSubjects.some((s) => s.classCode === cls.classCode);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => setInputClassCode(cls.classCode)}
                          className={`apple-tap px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 transition border ${
                            inputClassCode === cls.classCode
                              ? 'bg-[#0b3b60] text-white border-[#0b3b60]'
                              : alreadyEnrolled
                              ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                              : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-200 hover:border-amber-300'
                          }`}
                        >
                          <span className="font-semibold">{cls.subjectName}</span>
                          <span className="font-mono text-[10px] opacity-75">({cls.classCode})</span>
                          {alreadyEnrolled && <span className="text-[9px] text-emerald-600 font-bold">Enrolled</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="apple-tap px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={joinLoading || !inputClassCode.trim()}
                  className="apple-tap px-5 py-2.5 rounded-xl bg-[#0b3b60] hover:bg-[#092c4c] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-950/20 transition flex items-center gap-1.5"
                >
                  {joinLoading ? 'Joining...' : 'Join Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        variant="danger"
        loading={confirmLoading}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          if (!confirmDialog) return;
          setConfirmLoading(true);
          try {
            await confirmDialog.onConfirm();
          } finally {
            setConfirmLoading(false);
            setConfirmDialog(null);
          }
        }}
      />
    </div>
  );
};
