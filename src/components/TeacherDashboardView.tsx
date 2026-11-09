import React, { useState, useMemo, useRef } from 'react';
import { 
  ClassSubject, 
  StudentScoreBoard, 
  BroadcastNote, 
  ScoreItem, 
  UserAccount,
  SubjectEnrollment,
  calculateScoreBoardTotals 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { AskiLogo } from './AskiLogo';
import { 
  Plus, 
  FileSpreadsheet, 
  Megaphone, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Users, 
  BookOpen, 
  Sparkles, 
  Search,
  Download,
  X,
  Camera,
  UserCheck,
  UserX,
  Layers,
  ChevronDown,
  Clock,
  Sliders,
  Calendar
} from 'lucide-react';
import { 
  saveClassSubject, 
  saveScoreBoard, 
  deleteScoreBoard, 
  saveBatchScoreBoards,
  saveBroadcast, 
  addNotification,
  updateUserStatus 
} from '../services/dbService';
import { 
  exportClassRecordSpreadsheet,
  UploadScope 
} from '../services/spreadsheetService';

interface TeacherDashboardViewProps {
  classes: ClassSubject[];
  scoreboards: StudentScoreBoard[];
  broadcasts: BroadcastNote[];
  onOpenUploadModal: (classCode: string, subjectName: string, scope?: UploadScope) => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  classes,
  scoreboards,
  broadcasts,
  onOpenUploadModal,
}) => {
  const { 
    currentUser, 
    updateUserAvatar, 
    usersList, 
    enrollmentsList, 
    approveSubjectEnrollment, 
    rejectSubjectEnrollment 
  } = useAuth();
  const [selectedClassCode, setSelectedClassCode] = useState<string>(classes[0]?.classCode || 'SKI-10A');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Modals state
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [editingScoreBoard, setEditingScoreBoard] = useState<StudentScoreBoard | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isTaskCustomizerOpen, setIsTaskCustomizerOpen] = useState(false);

  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onload = () => {
        updateUserAvatar(currentUser.id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter classes belonging strictly to THIS faculty teacher
  const myTeacherClasses = useMemo(() => {
    if (!currentUser) return [];
    return classes.filter((cls) => {
      const matchId = cls.teacherId && cls.teacherId === currentUser.id;
      const matchName = cls.teacherName && currentUser.displayName && cls.teacherName.toLowerCase().trim() === currentUser.displayName.toLowerCase().trim();
      const isDefaultTanjosell = (currentUser.email === 'teacher.tanjosell@aski-ski.edu.ph' || currentUser.displayName.toLowerCase().includes('tanjosell')) && (!cls.teacherId || cls.teacherId === 'teacher-1');
      return matchId || matchName || isDefaultTanjosell;
    });
  }, [classes, currentUser]);

  const teacherClassCodes = useMemo(() => myTeacherClasses.map((c) => c.classCode.toUpperCase()), [myTeacherClasses]);

  const activeClass = myTeacherClasses.find((c) => c.classCode === selectedClassCode) || myTeacherClasses[0];

  // Keep selectedClassCode in sync with myTeacherClasses
  React.useEffect(() => {
    if (myTeacherClasses.length > 0) {
      if (!myTeacherClasses.some((c) => c.classCode === selectedClassCode)) {
        setSelectedClassCode(myTeacherClasses[0].classCode);
      }
    } else {
      setSelectedClassCode('');
    }
  }, [myTeacherClasses, selectedClassCode]);

  // Pending students registered or enrolled in THIS teacher's class(es)
  const pendingStudentsForTeacher = useMemo(() => {
    if (teacherClassCodes.length === 0) return [];
    return usersList.filter(
      (u) =>
        u.role === 'student' &&
        u.status === 'pending' &&
        (
          teacherClassCodes.includes((u.classCode || '').toUpperCase()) ||
          (u.enrolledClassCodes && u.enrolledClassCodes.some((code) => teacherClassCodes.includes(code.toUpperCase())))
        )
    );
  }, [usersList, teacherClassCodes]);

  // Pending subject enrollment requests for THIS teacher's classes
  const pendingEnrollmentsForTeacher = useMemo(() => {
    if (teacherClassCodes.length === 0) return [];
    return enrollmentsList.filter(
      (e) => teacherClassCodes.includes(e.classCode.toUpperCase()) && e.status === 'pending'
    );
  }, [enrollmentsList, teacherClassCodes]);

  // Filter scoreboards for the selected class code
  const classScoreboards = useMemo(() => {
    if (!selectedClassCode) return [];
    return scoreboards.filter((sb) => {
      const matchCode = sb.classCode.toUpperCase() === selectedClassCode.toUpperCase();
      // Ensure pending or rejected users don't show on official roster
      const user = usersList.find(
        (u) => u.id === sb.studentId || (u.email && sb.studentEmail && u.email.toLowerCase() === sb.studentEmail.toLowerCase())
      );
      if (user && user.status === 'pending') return false;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        sb.studentName.toLowerCase().includes(q) ||
        (sb.studentNumber && sb.studentNumber.includes(q)) ||
        (sb.lrn && sb.lrn.includes(q));
      return matchCode && matchSearch;
    });
  }, [scoreboards, selectedClassCode, searchQuery, usersList]);

  // Task counts for current class
  const currentWWList = classScoreboards[0]?.writtenWorks || [
    { id: 'ww-1', title: 'Written Work 1', score: 0, maxScore: 25 },
    { id: 'ww-2', title: 'Written Work 2', score: 0, maxScore: 25 },
    { id: 'ww-3', title: 'Written Work 3', score: 0, maxScore: 20 },
  ];
  const currentPTList = classScoreboards[0]?.performanceTasks || [
    { id: 'pt-1', title: 'Performance Task 1', score: 0, maxScore: 30 },
    { id: 'pt-2', title: 'Performance Task 2', score: 0, maxScore: 30 },
    { id: 'pt-3', title: 'Performance Task 3', score: 0, maxScore: 30 },
  ];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteScoreBoard = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the score record for ${name}?`)) {
      await deleteScoreBoard(id);
      setActionStatus(`Deleted record for ${name}`);
      setTimeout(() => setActionStatus(null), 2500);
    }
  };

  // --- Teacher Student Registration Approval Handlers ---
  const handleTeacherApproveStudent = async (student: UserAccount) => {
    await updateUserStatus(student.id, 'approved');
    await addNotification({
      id: `notif-${Date.now()}`,
      recipientId: student.id,
      recipientRole: 'student',
      title: 'Registration Approved by Teacher',
      message: `Teacher ${currentUser?.displayName || 'Faculty'} accepted your registration for ${student.classCode || selectedClassCode}. You can now view your scoreboard!`,
      type: 'approval',
      read: false,
      createdAt: new Date().toISOString(),
    });
    setActionStatus(`Approved registration for ${student.displayName}`);
    setTimeout(() => setActionStatus(null), 3000);
  };

  const handleTeacherRejectStudent = async (student: UserAccount) => {
    if (window.confirm(`Reject registration request for ${student.displayName}?`)) {
      await updateUserStatus(student.id, 'rejected');
      setActionStatus(`Registration for ${student.displayName} rejected`);
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const handleTeacherApproveAllStudents = async () => {
    if (window.confirm(`Approve all ${pendingStudentsForTeacher.length} pending student registrations?`)) {
      for (const student of pendingStudentsForTeacher) {
        await updateUserStatus(student.id, 'approved');
      }
      setActionStatus(`Approved all ${pendingStudentsForTeacher.length} students`);
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  // --- Teacher Subject Enrollment Approval Handlers ---
  const handleTeacherApproveEnrollment = async (enrollment: SubjectEnrollment) => {
    await approveSubjectEnrollment(enrollment, currentUser?.displayName || 'Faculty Teacher');
    setActionStatus(`Approved ${enrollment.studentName} for ${enrollment.subjectName} (${enrollment.classCode})`);
    setTimeout(() => setActionStatus(null), 3000);
  };

  const handleTeacherRejectEnrollment = async (enrollment: SubjectEnrollment) => {
    if (window.confirm(`Reject subject enrollment for ${enrollment.studentName} in ${enrollment.subjectName} (${enrollment.classCode})?`)) {
      await rejectSubjectEnrollment(enrollment.id, currentUser?.displayName || 'Faculty Teacher');
      setActionStatus(`Rejected enrollment for ${enrollment.studentName}`);
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const handleTeacherApproveAllEnrollments = async () => {
    if (window.confirm(`Approve all ${pendingEnrollmentsForTeacher.length} subject enrollment requests?`)) {
      for (const enr of pendingEnrollmentsForTeacher) {
        await approveSubjectEnrollment(enr, currentUser?.displayName || 'Faculty Teacher');
      }
      setActionStatus(`Approved all ${pendingEnrollmentsForTeacher.length} subject enrollments`);
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  // --- Dynamic Task Customization for Class ---
  const handleAddClassWrittenWork = async () => {
    if (classScoreboards.length === 0) {
      alert('Please enroll or upload students first before adding tasks.');
      return;
    }
    const nextIdx = (classScoreboards[0].writtenWorks?.length || 0) + 1;
    if (nextIdx > 5) {
      alert('Maximum 5 Written Works allowed by ASKI-SKI assessment framework.');
      return;
    }

    const updated = classScoreboards.map((sb) => {
      const clone: StudentScoreBoard = JSON.parse(JSON.stringify(sb));
      if (!clone.writtenWorks) clone.writtenWorks = [];
      clone.writtenWorks.push({
        id: `ww-${nextIdx}`,
        title: `Written/Oral Work ${nextIdx}`,
        score: 0,
        maxScore: 20,
      });
      clone.updatedAt = new Date().toISOString();
      return clone;
    });

    await saveBatchScoreBoards(updated);
    setActionStatus(`Added Written Work ${nextIdx} to all ${classScoreboards.length} learners`);
    setTimeout(() => setActionStatus(null), 3000);
  };

  const handleDeleteClassWrittenWork = async (itemIdx: number) => {
    if ((classScoreboards[0]?.writtenWorks?.length || 0) <= 2) {
      alert('Minimum 2 Written Works required by ASKI-SKI framework.');
      return;
    }
    if (!window.confirm(`Delete Written Work ${itemIdx + 1} from all learners in ${selectedClassCode}?`)) {
      return;
    }

    const updated = classScoreboards.map((sb) => {
      const clone: StudentScoreBoard = JSON.parse(JSON.stringify(sb));
      if (clone.writtenWorks) {
        clone.writtenWorks = clone.writtenWorks.filter((_, i) => i !== itemIdx);
        clone.writtenWorks.forEach((item, i) => {
          item.id = `ww-${i + 1}`;
          item.title = `Written/Oral Work ${i + 1}`;
        });
      }
      clone.updatedAt = new Date().toISOString();
      return clone;
    });

    await saveBatchScoreBoards(updated);
    setActionStatus(`Removed Written Work item`);
    setTimeout(() => setActionStatus(null), 3000);
  };

  const handleAddClassPerformanceTask = async () => {
    if (classScoreboards.length === 0) {
      alert('Please enroll or upload students first before adding tasks.');
      return;
    }
    const nextIdx = (classScoreboards[0].performanceTasks?.length || 0) + 1;

    const updated = classScoreboards.map((sb) => {
      const clone: StudentScoreBoard = JSON.parse(JSON.stringify(sb));
      if (!clone.performanceTasks) clone.performanceTasks = [];
      clone.performanceTasks.push({
        id: `pt-${nextIdx}`,
        title: `Product/Performance Task ${nextIdx}`,
        score: 0,
        maxScore: 30,
      });
      clone.updatedAt = new Date().toISOString();
      return clone;
    });

    await saveBatchScoreBoards(updated);
    setActionStatus(`Added Performance Task ${nextIdx} to all learners`);
    setTimeout(() => setActionStatus(null), 3000);
  };

  const handleDeleteClassPerformanceTask = async (itemIdx: number) => {
    if ((classScoreboards[0]?.performanceTasks?.length || 0) <= 1) {
      alert('At least 1 Performance Task required.');
      return;
    }
    if (!window.confirm(`Delete Performance Task ${itemIdx + 1} from all learners in ${selectedClassCode}?`)) {
      return;
    }

    const updated = classScoreboards.map((sb) => {
      const clone: StudentScoreBoard = JSON.parse(JSON.stringify(sb));
      if (clone.performanceTasks) {
        clone.performanceTasks = clone.performanceTasks.filter((_, i) => i !== itemIdx);
        clone.performanceTasks.forEach((item, i) => {
          item.id = `pt-${i + 1}`;
          item.title = `Product/Performance Task ${i + 1}`;
        });
      }
      clone.updatedAt = new Date().toISOString();
      return clone;
    });

    await saveBatchScoreBoards(updated);
    setActionStatus(`Removed Performance Task`);
    setTimeout(() => setActionStatus(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast notification pill */}
      {actionStatus && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="apple-bubble flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white shadow-xl border border-slate-200 text-xs font-bold text-slate-900">
            <Check className="w-4 h-4 text-[#34C759]" />
            <span>{actionStatus}</span>
          </div>
        </div>
      )}

      {/* Teacher Top Welcome Banner */}
      <div className="bg-[#0b3b60] p-6 sm:p-7 rounded-3xl text-white shadow-xl relative overflow-hidden border border-[#092c4c]">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Circle Photo and Teacher Name only */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-amber-400 bg-white/10 shrink-0 shadow-lg flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-2xl text-amber-300">
                    {currentUser?.displayName?.charAt(0) || 'T'}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={photoFileInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoFileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md border-2 border-[#0b3b60] transition hover:scale-110"
                title="Upload / Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <AskiLogo size="sm" />
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
                  Faculty Teacher
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {currentUser?.displayName || 'Prof. Tanjosell'}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddClassOpen(true)}
              className="apple-bubble-primary flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-xs font-bold shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Add Subject / Class</span>
            </button>

            <button
              onClick={() => onOpenUploadModal(activeClass?.classCode || 'SKI-10A', activeClass?.subjectName || 'Mathematics 10', 'ALL')}
              className="apple-tap flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Upload Spreadsheet</span>
            </button>

            <button
              onClick={() => exportClassRecordSpreadsheet(scoreboards, selectedClassCode, activeClass?.subjectName || 'Mathematics 10')}
              className="apple-tap flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-500/30 transition shadow-xs"
              title="Download Class Record (.xlsx)"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Download Record (.xlsx)</span>
            </button>

            <button
              onClick={() => setIsBroadcastOpen(true)}
              className="apple-tap flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition"
            >
              <Megaphone className="w-4 h-4 text-amber-300" />
              <span>Broadcast Note</span>
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Student Registration Approvals Section */}
      {pendingStudentsForTeacher.length > 0 && (
        <div className="liquid-glass p-5 rounded-3xl border border-amber-300/60 shadow-lg space-y-3.5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h3 className="font-bold text-sm text-slate-900">
                Pending Class Registrations ({pendingStudentsForTeacher.length})
              </h3>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Students awaiting your class approval
              </span>
            </div>

            {pendingStudentsForTeacher.length > 1 && (
              <button
                onClick={handleTeacherApproveAllStudents}
                className="apple-bubble-primary px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs self-start sm:self-auto"
              >
                Approve All ({pendingStudentsForTeacher.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingStudentsForTeacher.map((student) => (
              <div
                key={student.id}
                className="apple-glass p-3.5 rounded-2xl border border-slate-200/80 bg-white/90 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#0b3b60] truncate">
                    {student.displayName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {student.lrn ? `LRN: ${student.lrn}` : student.email}
                  </div>
                  <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1">
                    Class: {student.classCode || selectedClassCode}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTeacherApproveStudent(student)}
                    className="apple-tap p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition"
                    title="Approve Student"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTeacherRejectStudent(student)}
                    className="apple-tap p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    title="Reject"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teacher Subject Enrollment Approvals Section: Requests from students entering class code */}
      {pendingEnrollmentsForTeacher.length > 0 && (
        <div className="liquid-glass p-5 rounded-3xl border border-blue-300/60 shadow-lg space-y-3.5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#007AFF]"></span>
              </span>
              <h3 className="font-bold text-sm text-slate-900">
                Subject Enrollment Requests ({pendingEnrollmentsForTeacher.length})
              </h3>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Students requesting to join your subjects
              </span>
            </div>

            {pendingEnrollmentsForTeacher.length > 1 && (
              <button
                onClick={handleTeacherApproveAllEnrollments}
                className="apple-bubble-primary px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs self-start sm:self-auto"
              >
                Approve All Requests ({pendingEnrollmentsForTeacher.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingEnrollmentsForTeacher.map((enr) => (
              <div
                key={enr.id}
                className="apple-glass p-3.5 rounded-2xl border border-slate-200/80 bg-white/95 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#0b3b60] truncate">
                    {enr.studentName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {enr.lrn ? `LRN: ${enr.lrn}` : (enr.studentNumber || enr.studentEmail)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-[#007AFF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {enr.classCode}
                    </span>
                    <span className="text-[10px] font-medium text-slate-600 truncate">
                      {enr.subjectName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTeacherApproveEnrollment(enr)}
                    className="apple-tap p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition"
                    title="Approve Subject Enrollment"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTeacherRejectEnrollment(enr)}
                    className="apple-tap p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    title="Reject"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrolled Subjects & Sections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Enrolled Subjects & Sections</span>
            <span className="text-xs font-normal text-slate-500">
              (ASKI-SKI Academic Terms 1 to 3)
            </span>
          </h2>

          <button
            onClick={() => setIsAddClassOpen(true)}
            className="apple-tap text-xs text-[#007AFF] hover:underline font-semibold flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Subject</span>
          </button>
        </div>

        {myTeacherClasses.length === 0 ? (
          <div className="apple-glass rounded-3xl p-8 sm:p-10 text-center space-y-4 border border-white/60 bg-white/90 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#007AFF] flex items-center justify-center mx-auto border border-blue-200 shadow-inner">
              <BookOpen className="w-7 h-7 text-[#007AFF]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Welcome to your Faculty Portal, {currentUser?.displayName}!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                You have not created any subjects or sections yet. Click below to add your first subject. A unique Class Code will be generated for your students to join your class.
              </p>
            </div>
            <button
              onClick={() => setIsAddClassOpen(true)}
              className="apple-bubble-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-bold shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Create Your First Subject</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {myTeacherClasses.map((cls) => {
              const isSelected = cls.classCode === selectedClassCode;
              const enrolledCount = scoreboards.filter((sb) => sb.classCode === cls.classCode).length;

              return (
                <div
                  key={cls.id || cls.classCode}
                  onClick={() => setSelectedClassCode(cls.classCode)}
                  className={`apple-tap p-4 rounded-3xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'apple-glass ring-2 ring-[#007AFF] shadow-sm bg-white'
                      : 'bg-white/80 border-slate-200/60 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-[#007AFF] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                          {cls.term || 'Term 1'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">
                        {cls.subjectName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {cls.section}
                      </p>
                    </div>

                    {/* Class Code Pill with Copy button */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCode(cls.classCode);
                      }}
                      className="apple-bubble flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-mono text-xs font-semibold hover:bg-slate-200 transition"
                      title="Click to copy Class Code"
                    >
                      <span>{cls.classCode}</span>
                      {copiedCode === cls.classCode ? (
                        <Check className="w-3 h-3 text-[#34C759]" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{enrolledCount} Learners</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {cls.schedule || cls.term || 'Term 1'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Class Scoreboard Management for Selected Class */}
      <div className="apple-glass rounded-3xl overflow-hidden shadow-xs border border-white/60 bg-white/95">
        {/* Table Action Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                {activeClass?.subjectName || 'Subject'} Gradebook
              </h3>
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                {selectedClassCode}
              </span>
              <span className="text-xs font-bold text-[#007AFF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                {activeClass?.term || 'Term 1'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Weightings: Written Works (20%) • Performance Tasks (50%) • Exams (30%)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search learner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>

            {/* Assessment Task Customizer Toggle */}
            <button
              onClick={() => setIsTaskCustomizerOpen(!isTaskCustomizerOpen)}
              className="apple-tap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition"
              title="Add or remove written works and performance tasks"
            >
              <Sliders className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Customize Tasks</span>
            </button>

            {/* Quick Upload Specific Part Button */}
            <div className="relative group">
              <button
                className="apple-tap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition shadow-xs"
                title="Upload Excel for a specific task only"
              >
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Upload Single Task</span>
                <ChevronDown className="w-3 h-3 text-amber-600" />
              </button>

              <div className="absolute right-0 mt-1 w-52 rounded-2xl bg-white shadow-xl border border-slate-200 p-2 z-30 hidden group-hover:block animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                  Select Specific Part
                </div>
                <button
                  onClick={() => onOpenUploadModal(selectedClassCode, activeClass?.subjectName || '', 'WW1')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Written Work 1 (WW1)
                </button>
                <button
                  onClick={() => onOpenUploadModal(selectedClassCode, activeClass?.subjectName || '', 'WW2')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Written Work 2 (WW2)
                </button>
                <button
                  onClick={() => onOpenUploadModal(selectedClassCode, activeClass?.subjectName || '', 'PT1')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Performance Task 1 (PT1)
                </button>
                <button
                  onClick={() => onOpenUploadModal(selectedClassCode, activeClass?.subjectName || '', 'PT2')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Performance Task 2 (PT2)
                </button>
                <button
                  onClick={() => onOpenUploadModal(selectedClassCode, activeClass?.subjectName || '', 'ST1')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Summative Test 1 (ST1)
                </button>
                <button
                  onClick={() => onOpenUploadModal(selectedClassCode, activeClass?.subjectName || '', 'TE')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Term Exam (TE)
                </button>
              </div>
            </div>

            <button
              onClick={() => exportClassRecordSpreadsheet(scoreboards, selectedClassCode, activeClass?.subjectName || 'Mathematics 10')}
              className="apple-tap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 shadow-xs transition"
              title="Download Class Record (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => onOpenUploadModal(selectedClassCode, activeClass?.subjectName || 'Mathematics 10', 'ALL')}
              className="apple-bubble-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold shadow-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Upload Spreadsheet</span>
            </button>
          </div>
        </div>

        {/* Dynamic Task Customizer Bar (Expandable) */}
        {isTaskCustomizerOpen && (
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/70 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#007AFF]" />
                <span>Customize Assessment Tasks for {selectedClassCode}</span>
              </h4>
              <button
                onClick={() => setIsTaskCustomizerOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Written Works Controller */}
              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0b3b60]">
                    Written Works ({currentWWList.length} items • Min 2, Max 5)
                  </span>
                  {currentWWList.length < 5 && (
                    <button
                      onClick={handleAddClassWrittenWork}
                      className="apple-bubble text-[11px] font-bold text-[#007AFF] px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
                    >
                      + Add Written Work
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {currentWWList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="font-medium text-slate-700">
                        {item.title} (Max: {item.maxScore})
                      </span>
                      {currentWWList.length > 2 && (
                        <button
                          onClick={() => handleDeleteClassWrittenWork(idx)}
                          className="apple-tap p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Delete this task column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Tasks Controller */}
              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800">
                    Performance Tasks ({currentPTList.length} items)
                  </span>
                  <button
                    onClick={handleAddClassPerformanceTask}
                    className="apple-bubble text-[11px] font-bold text-emerald-700 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
                  >
                    + Add Performance Task
                  </button>
                </div>

                <div className="space-y-1.5">
                  {currentPTList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/50 border border-emerald-100"
                    >
                      <span className="font-medium text-slate-700">
                        {item.title} (Max: {item.maxScore})
                      </span>
                      {currentPTList.length > 1 && (
                        <button
                          onClick={() => handleDeleteClassPerformanceTask(idx)}
                          className="apple-tap p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Delete this task column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Master Scoreboard Table: Transmuted Grade Removed as Requested */}
        {classScoreboards.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">
              No learners graded yet for {selectedClassCode}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload your Excel sheet or ask students to sign up using Class Code <strong>{selectedClassCode}</strong>.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onOpenUploadModal(selectedClassCode, activeClass?.subjectName || 'Mathematics 10', 'ALL')}
                className="apple-bubble-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                <span>Upload Electronic Grade Record</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Learners' Names</th>
                  <th className="px-3 py-3 text-center">
                    WW Total (20%)
                    <span className="block text-[9px] font-normal text-slate-400">
                      {currentWWList.length} items
                    </span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    PT Total (50%)
                    <span className="block text-[9px] font-normal text-slate-400">
                      {currentPTList.length} items
                    </span>
                  </th>
                  <th className="px-3 py-3 text-center">ST1 & ST2</th>
                  <th className="px-3 py-3 text-center">TE (Term Exam)</th>
                  {/* Transmuted Grade column removed as requested */}
                  <th className="px-3 py-3 text-center">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {classScoreboards.map((sb) => {
                  const totals = calculateScoreBoardTotals(sb);
                  return (
                    <tr key={sb.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0b3b60]">
                          {sb.studentName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {sb.lrn ? `LRN: ${sb.lrn}` : (sb.studentNumber || sb.studentEmail)}
                        </div>
                      </td>

                      {/* WW Total */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono font-bold text-slate-800">
                          {totals.wwTotal}/{totals.wwMax}
                        </span>
                        <div className="text-[10px] text-slate-400">({totals.wwPct}%)</div>
                      </td>

                      {/* PT Total */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono font-bold text-emerald-800">
                          {totals.ptTotal}/{totals.ptMax}
                        </span>
                        <div className="text-[10px] text-slate-400">({totals.ptPct}%)</div>
                      </td>

                      {/* Summative Tests Total */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono font-bold text-amber-800">
                          {(sb.summativeTests || []).map((t) => t.score).join(' + ')}
                        </span>
                        <div className="text-[10px] text-slate-400">ST1 & ST2</div>
                      </td>

                      {/* Term Exam */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono font-black text-[#0b3b60]">
                          {sb.termExam?.score || 0} / {sb.termExam?.maxScore || 60}
                        </span>
                      </td>

                      {/* Passed / Failed badge */}
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          totals.remarks === 'Passed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {totals.remarks}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingScoreBoard(sb)}
                            className="apple-tap inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-[#007AFF] font-semibold text-[11px] hover:bg-blue-100 transition"
                            title="Edit individual scores"
                          >
                            <Edit3 className="w-3 h-3 text-[#007AFF]" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteScoreBoard(sb.id, sb.studentName)}
                            className="apple-tap p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Broadcast Notes Feed */}
      <div className="apple-glass rounded-3xl border border-white/60 p-5 space-y-3 bg-white/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-[#0b3b60]">
              Broadcast Notes for Class {selectedClassCode}
            </h3>
          </div>
          <button
            onClick={() => setIsBroadcastOpen(true)}
            className="apple-tap text-xs text-[#007AFF] font-bold hover:underline"
          >
            + Post Announcement
          </button>
        </div>

        <div className="space-y-2">
          {broadcasts
            .filter((b) => b.classCode === selectedClassCode || b.classCode === 'ALL')
            .map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0b3b60]">{b.title}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{b.message}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Modal 1: Add Subject / Section with Term 1-3 */}
      {isAddClassOpen && (
        <AddClassModal
          teacherName={currentUser?.displayName || 'Prof. Tanjosell'}
          teacherId={currentUser?.id || 'teacher-1'}
          onClose={() => setIsAddClassOpen(false)}
          onSave={async (newClass) => {
            await saveClassSubject(newClass);
            setIsAddClassOpen(false);
          }}
        />
      )}

      {/* Modal 2: Individual Student Score Editor */}
      {editingScoreBoard && (
        <EditStudentScoreBoardModal
          scoreBoard={editingScoreBoard}
          onClose={() => setEditingScoreBoard(null)}
          onSave={async (updated) => {
            await saveScoreBoard(updated);
            setEditingScoreBoard(null);
          }}
        />
      )}

      {/* Modal 3: Broadcast Note Modal */}
      {isBroadcastOpen && (
        <BroadcastNoteModal
          classCode={selectedClassCode}
          subjectName={activeClass?.subjectName || 'Mathematics 10'}
          teacherName={currentUser?.displayName || 'Prof. Tanjosell'}
          teacherId={currentUser?.id || 'teacher-1'}
          onClose={() => setIsBroadcastOpen(false)}
          onSave={async (note) => {
            await saveBroadcast(note);
            await addNotification({
              id: `notif-${Date.now()}`,
              recipientRole: 'student',
              title: `New Note in ${note.subjectName}`,
              message: note.title,
              type: 'broadcast',
              read: false,
              createdAt: new Date().toISOString(),
            });
            setIsBroadcastOpen(false);
          }}
        />
      )}
    </div>
  );
};

// Sub-components: AddClassModal with Term 1-3 dropdown
const AddClassModal: React.FC<{
  teacherName: string;
  teacherId: string;
  onClose: () => void;
  onSave: (cls: ClassSubject) => Promise<void>;
}> = ({ teacherName, teacherId, onClose, onSave }) => {
  const [subjectName, setSubjectName] = useState('');
  const [section, setSection] = useState('');
  const [term, setTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [schedule, setSchedule] = useState('');
  const [room, setRoom] = useState('');
  
  const generatedCode = useMemo(() => {
    const prefix = subjectName ? subjectName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'SKI') : 'SKI';
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${rand}`;
  }, [subjectName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !section.trim()) return;

    await onSave({
      id: `class-${Date.now()}`,
      subjectName: subjectName.trim(),
      section: section.trim(),
      classCode: generatedCode,
      teacherId,
      teacherName,
      term,
      schedule: schedule.trim() || `${term} Schedule`,
      room: room.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="apple-glass bg-white/95 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#007AFF]" />
            <h3 className="font-bold text-sm text-slate-900">
              Create Subject & Section
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Mathematics 10, Science, English"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Section *
            </label>
            <input
              type="text"
              placeholder="e.g. Grade 10 - St. Jude, Grade 9 - St. Luke"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              required
            />
          </div>

          {/* Academic Term 1 to 3 Dropdown */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Academic Term *
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value as 'Term 1' | 'Term 2' | 'Term 3')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            >
              <option value="Term 1">Term 1 (First Term)</option>
              <option value="Term 2">Term 2 (Second Term)</option>
              <option value="Term 3">Term 3 (Third Term)</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-900">
                Generated Class Code:
              </span>
              <span className="font-mono text-xs font-black text-[#0b3b60] bg-white px-2 py-0.5 rounded border border-amber-300">
                {generatedCode}
              </span>
            </div>
            <p className="text-[10px] text-amber-800">
              Students enter this code upon registration to automatically land in this section.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Schedule (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. MWF 8-9 AM"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Room (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Room 204"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="apple-tap px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="apple-bubble-primary px-4 py-1.5 rounded-xl text-white font-bold"
            >
              Create Class & Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal: Edit Individual Student Score Board
const EditStudentScoreBoardModal: React.FC<{
  scoreBoard: StudentScoreBoard;
  onClose: () => void;
  onSave: (updated: StudentScoreBoard) => Promise<void>;
}> = ({ scoreBoard, onClose, onSave }) => {
  const [ww, setWw] = useState<ScoreItem[]>(scoreBoard.writtenWorks || []);
  const [pt, setPt] = useState<ScoreItem[]>(scoreBoard.performanceTasks || []);
  const [st, setSt] = useState<ScoreItem[]>(scoreBoard.summativeTests || []);
  const [term, setTerm] = useState<ScoreItem>(
    scoreBoard.termExam || { id: 'term', title: 'Term Exam', score: 50, maxScore: 60 }
  );
  const [remarks, setRemarks] = useState<string>(scoreBoard.remarks || '');
  const [loading, setLoading] = useState(false);

  const addWrittenWork = () => {
    if (ww.length < 5) {
      setWw([...ww, { id: `ww-${ww.length + 1}`, title: `Written Work ${ww.length + 1}`, score: 20, maxScore: 25 }]);
    }
  };

  const removeWrittenWork = (idx: number) => {
    if (ww.length > 2) {
      setWw(ww.filter((_, i) => i !== idx));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updated: StudentScoreBoard = {
      ...scoreBoard,
      writtenWorks: ww,
      performanceTasks: pt,
      summativeTests: st,
      termExam: term,
      remarks,
      updatedAt: new Date().toISOString(),
    };

    await onSave(updated);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="apple-glass bg-white/95 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div>
            <h3 className="font-bold text-sm text-[#0b3b60]">
              Edit Learner Score: {scoreBoard.studentName}
            </h3>
            <p className="text-[11px] text-slate-500">
              Class Code: {scoreBoard.classCode} • {scoreBoard.subjectName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* 1. Written Works (2 to 5) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0b3b60]">
                1. Written / Oral Works ({ww.length} items • Min 2, Max 5)
              </span>
              {ww.length < 5 && (
                <button
                  type="button"
                  onClick={addWrittenWork}
                  className="text-xs text-amber-600 font-bold hover:underline"
                >
                  + Add WW Item
                </button>
              )}
            </div>

            {ww.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...ww];
                    next[idx].title = e.target.value;
                    setWw(next);
                  }}
                  className="col-span-6 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                />
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.score}
                    onChange={(e) => {
                      const next = [...ww];
                      next[idx].score = Number(e.target.value);
                      setWw(next);
                    }}
                    placeholder="Score"
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-right text-[#0b3b60]"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.maxScore}
                    onChange={(e) => {
                      const next = [...ww];
                      next[idx].maxScore = Number(e.target.value);
                      setWw(next);
                    }}
                    placeholder="Max"
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 text-right"
                  />
                </div>
                <div className="col-span-2 text-right">
                  {ww.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeWrittenWork(idx)}
                      className="text-rose-500 hover:text-rose-700 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 2. Performance Tasks */}
          <div className="space-y-2">
            <span className="font-bold text-emerald-800">
              2. Product / Performance Tasks ({pt.length} items)
            </span>
            {pt.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-emerald-50/40 p-2 rounded-xl border border-emerald-100">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...pt];
                    next[idx].title = e.target.value;
                    setPt(next);
                  }}
                  className="col-span-6 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs"
                />
                <div className="col-span-3">
                  <input
                    type="number"
                    value={item.score}
                    onChange={(e) => {
                      const next = [...pt];
                      next[idx].score = Number(e.target.value);
                      setPt(next);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-bold text-right text-emerald-800"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    value={item.maxScore}
                    onChange={(e) => {
                      const next = [...pt];
                      next[idx].maxScore = Number(e.target.value);
                      setPt(next);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs text-slate-500 text-right"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 3. Examinations (2 Summative Tests + 1 Term Exam) */}
          <div className="space-y-2">
            <span className="font-bold text-amber-800">
              3. Examinations (2 Summative Tests & 1 Term Exam)
            </span>
            {st.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-amber-50/40 p-2 rounded-xl border border-amber-100">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...st];
                    next[idx].title = e.target.value;
                    setSt(next);
                  }}
                  className="col-span-6 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-xs"
                />
                <div className="col-span-3">
                  <input
                    type="number"
                    value={item.score}
                    onChange={(e) => {
                      const next = [...st];
                      next[idx].score = Number(e.target.value);
                      setSt(next);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-bold text-right text-amber-900"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    value={item.maxScore}
                    onChange={(e) => {
                      const next = [...st];
                      next[idx].maxScore = Number(e.target.value);
                      setSt(next);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-amber-200 text-xs text-slate-500 text-right"
                  />
                </div>
              </div>
            ))}

            {/* Term Exam */}
            <div className="grid grid-cols-12 gap-2 items-center bg-blue-50 p-2 rounded-xl border border-blue-200">
              <input
                type="text"
                value={term.title}
                onChange={(e) => setTerm({ ...term, title: e.target.value })}
                className="col-span-6 px-2.5 py-1.5 rounded-lg bg-white border border-blue-300 text-xs font-bold text-[#0b3b60]"
              />
              <div className="col-span-3">
                <input
                  type="number"
                  value={term.score}
                  onChange={(e) => setTerm({ ...term, score: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white border border-blue-300 text-xs font-black text-right text-[#0b3b60]"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  value={term.maxScore}
                  onChange={(e) => setTerm({ ...term, maxScore: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white border border-blue-300 text-xs text-slate-500 text-right"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Teacher Feedback / Progress Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              placeholder="e.g. Consistent recitation, active participation."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="apple-tap px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-bubble-primary px-4 py-1.5 rounded-xl text-white font-bold"
            >
              {loading ? 'Saving...' : 'Save & Sync Scoreboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal: Broadcast Note
const BroadcastNoteModal: React.FC<{
  classCode: string;
  subjectName: string;
  teacherName: string;
  teacherId: string;
  onClose: () => void;
  onSave: (note: BroadcastNote) => Promise<void>;
}> = ({ classCode, subjectName, teacherName, teacherId, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetCode, setTargetCode] = useState(classCode);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setLoading(true);
    await onSave({
      id: `bcast-${Date.now()}`,
      classCode: targetCode,
      subjectName,
      title: title.trim(),
      message: message.trim(),
      teacherName,
      teacherId,
      createdAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="apple-glass bg-white/95 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-[#0b3b60]">
              Broadcast Announcement to Class
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Title / Subject Line *
            </label>
            <input
              type="text"
              placeholder="e.g. First Term Scores Available"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Message Body *
            </label>
            <textarea
              rows={4}
              placeholder="Write the message for your learners..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="apple-tap px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-bubble-primary px-4 py-1.5 rounded-xl text-white font-bold"
            >
              {loading ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
