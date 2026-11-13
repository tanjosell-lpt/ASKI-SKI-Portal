import React, { useState, useMemo, useRef } from 'react';
import { 
  UserAccount, 
  ClassSubject, 
  StudentScoreBoard, 
  ScoreItem,
  UserRole,
  ApprovalStatus,
  calculateScoreBoardTotals,
  SubjectEnrollment 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { AskiLogo } from './AskiLogo';
import { ConfirmModal } from './ConfirmModal';
import { 
  ShieldCheck, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  Search, 
  Trash2, 
  Edit3, 
  UserPlus, 
  Camera, 
  X, 
  User,
  Plus,
  RefreshCw,
  Sparkles,
  Sliders,
  ArrowUpDown,
  AlertCircle
} from 'lucide-react';
import { 
  saveUserAccount,
  updateUserStatus, 
  deleteUserAccount, 
  saveScoreBoard,
  deleteScoreBoard, 
  saveClassSubject,
  deleteClassSubject,
  addNotification 
} from '../services/dbService';

interface AdminDashboardViewProps {
  users: UserAccount[];
  classes: ClassSubject[];
  scoreboards: StudentScoreBoard[];
}

type DirectorySortOption = 'first-asc' | 'first-desc' | 'last-asc' | 'last-desc' | 'newest';

const getLastNameKey = (fullName: string, explicitLastName?: string): string => {
  if (explicitLastName && explicitLastName.trim()) {
    return explicitLastName.trim().toLowerCase();
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[parts.length - 1] : parts[0] || '').toLowerCase();
};

const sortUsersDirectory = (list: UserAccount[], sortOption: DirectorySortOption): UserAccount[] => {
  return [...list].sort((a, b) => {
    if (sortOption === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortOption === 'last-asc' || sortOption === 'last-desc') {
      const la = getLastNameKey(a.displayName || '', a.lastName);
      const lb = getLastNameKey(b.displayName || '', b.lastName);
      const cmp = la.localeCompare(lb) || (a.displayName || '').localeCompare(b.displayName || '');
      return sortOption === 'last-asc' ? cmp : -cmp;
    }
    const cmp = (a.displayName || '').trim().localeCompare((b.displayName || '').trim());
    return sortOption === 'first-asc' ? cmp : -cmp;
  });
};

const sortScoreboardsDirectory = (
  list: StudentScoreBoard[],
  sortOption: DirectorySortOption,
  usersList: UserAccount[]
): StudentScoreBoard[] => {
  const findUser = (sb: StudentScoreBoard) =>
    usersList.find(
      (u) =>
        u.id === sb.studentId ||
        (u.email && sb.studentEmail && u.email.toLowerCase() === sb.studentEmail.toLowerCase())
    );

  return [...list].sort((a, b) => {
    const ua = findUser(a);
    const ub = findUser(b);
    if (sortOption === 'newest') {
      const ta = new Date(ua?.createdAt || a.updatedAt || 0).getTime();
      const tb = new Date(ub?.createdAt || b.updatedAt || 0).getTime();
      return tb - ta;
    }
    if (sortOption === 'last-asc' || sortOption === 'last-desc') {
      const la = getLastNameKey(a.studentName || '', ua?.lastName);
      const lb = getLastNameKey(b.studentName || '', ub?.lastName);
      const cmp = la.localeCompare(lb) || (a.studentName || '').localeCompare(b.studentName || '');
      return sortOption === 'last-asc' ? cmp : -cmp;
    }
    const cmp = (a.studentName || '').trim().localeCompare((b.studentName || '').trim());
    return sortOption === 'first-asc' ? cmp : -cmp;
  });
};

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  users,
  classes,
  scoreboards,
}) => {
  const { 
    signUpTeacher, 
    ensureAdminRestored, 
    enrollmentsList, 
    approveSubjectEnrollment, 
    rejectSubjectEnrollment,
    deleteUser 
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'students' | 'teachers' | 'classes' | 'scoreboards'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [studentSort, setStudentSort] = useState<DirectorySortOption>('first-asc');
  const [teacherSort, setTeacherSort] = useState<DirectorySortOption>('first-asc');
  const [scoreboardSort, setScoreboardSort] = useState<DirectorySortOption>('first-asc');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant?: 'danger' | 'primary' | 'warning';
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Edit Modals
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editingScoreboard, setEditingScoreboard] = useState<StudentScoreBoard | null>(null);
  const [editingClass, setEditingClass] = useState<ClassSubject | null>(null);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);

  // Filter pending users (both students and teachers)
  const pendingUsers = useMemo(() => {
    return users.filter((u) => u.status === 'pending');
  }, [users]);

  const pendingStudents = useMemo(() => {
    return users.filter((u) => u.role === 'student' && u.status === 'pending');
  }, [users]);

  const pendingTeachers = useMemo(() => {
    return users.filter((u) => u.role === 'teacher' && u.status === 'pending');
  }, [users]);

  // Filter pending subject enrollment requests
  const pendingEnrollments = useMemo(() => {
    return enrollmentsList.filter((e) => e.status === 'pending');
  }, [enrollmentsList]);

  const teacherUsers = useMemo(() => {
    return sortUsersDirectory(
      users.filter((u) => u.role === 'teacher'),
      teacherSort
    );
  }, [users, teacherSort]);

  const filteredTeachers = useMemo(() => {
    const q = teacherSearchQuery.toLowerCase().trim();
    if (!q) return teacherUsers;
    return teacherUsers.filter(
      (t) =>
        t.displayName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
    );
  }, [teacherUsers, teacherSearchQuery]);

  const sortedStudents = useMemo(() => {
    const filtered = users
      .filter((u) => u.role === 'student')
      .filter((u) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          u.displayName.toLowerCase().includes(q) ||
          (u.lrn && u.lrn.includes(q)) ||
          u.email.toLowerCase().includes(q)
        );
      });
    return sortUsersDirectory(filtered, studentSort);
  }, [users, searchQuery, studentSort]);

  const sortedScoreboards = useMemo(() => {
    const filtered = scoreboards.filter((sb) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        sb.studentName.toLowerCase().includes(q) ||
        sb.classCode.toLowerCase().includes(q) ||
        sb.subjectName.toLowerCase().includes(q)
      );
    });
    return sortScoreboardsDirectory(filtered, scoreboardSort, users);
  }, [scoreboards, searchQuery, scoreboardSort, users]);

  const handleApprove = async (user: UserAccount) => {
    await updateUserStatus(user.id, 'approved');
    await addNotification({
      id: `notif-${Date.now()}`,
      recipientId: user.id,
      recipientRole: user.role,
      title: user.role === 'teacher' ? 'Faculty Registration Approved' : 'Student Registration Approved',
      message: user.role === 'teacher'
        ? `Your faculty teacher account has been verified and approved by the Administrator. You can now sign in to the Faculty Portal.`
        : `Your student account has been approved by the Administrator. You can now enroll in your subjects using the codes provided by your teachers.`,
      type: 'approval',
      read: false,
      createdAt: new Date().toISOString(),
    });
    setActionSuccess(`Approved ${user.role === 'teacher' ? 'Faculty Teacher' : 'Student'} ${user.displayName}`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleApproveEnrollment = async (enrollment: SubjectEnrollment) => {
    await approveSubjectEnrollment(enrollment, 'Administrator');
    setActionSuccess(`Approved enrollment for ${enrollment.studentName} in ${enrollment.subjectName} (${enrollment.classCode})`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleRejectEnrollment = (enrollmentId: string, studentName: string) => {
    setConfirmDialog({
      title: 'Reject Enrollment Request',
      message: `Reject enrollment request for ${studentName}?`,
      confirmLabel: 'Reject Request',
      variant: 'danger',
      onConfirm: async () => {
        await rejectSubjectEnrollment(enrollmentId, 'Administrator');
        setActionSuccess(`Rejected enrollment request for ${studentName}`);
        setTimeout(() => setActionSuccess(null), 3000);
      },
    });
  };

  const handleApproveAll = () => {
    setConfirmDialog({
      title: 'Approve All Pending Accounts',
      message: `Approve all ${pendingUsers.length} pending account registrations?`,
      confirmLabel: 'Approve All',
      variant: 'primary',
      onConfirm: async () => {
        for (const u of pendingUsers) {
          await updateUserStatus(u.id, 'approved');
        }
        setActionSuccess(`All ${pendingUsers.length} registrations approved`);
        setTimeout(() => setActionSuccess(null), 3000);
      },
    });
  };

  const handleReject = (user: UserAccount) => {
    setConfirmDialog({
      title: 'Reject Registration',
      message: `Reject registration request for ${user.displayName}?`,
      confirmLabel: 'Reject',
      variant: 'danger',
      onConfirm: async () => {
        await updateUserStatus(user.id, 'rejected');
        setActionSuccess(`Registration for ${user.displayName} rejected`);
        setTimeout(() => setActionSuccess(null), 3000);
      },
    });
  };

  const handleDeleteUser = (user: UserAccount) => {
    const isTeacher = user.role === 'teacher';
    const confirmMsg = isTeacher
      ? `Permanently remove faculty member ${user.displayName}? All assigned subjects will be deleted, enrolled students will be automatically unenrolled from those subjects, and the faculty member will lose portal access immediately.`
      : `Permanently delete learner account for ${user.displayName}? The student will be unenrolled from all subjects and their score records removed.`;

    setConfirmDialog({
      title: isTeacher ? 'Remove Faculty Member' : 'Delete Learner Account',
      message: confirmMsg,
      confirmLabel: isTeacher ? 'Remove Faculty' : 'Delete Learner',
      variant: 'danger',
      onConfirm: async () => {
        await deleteUser(user.id);
        setActionSuccess(`${isTeacher ? 'Faculty member' : 'Learner'} ${user.displayName} removed and unenrolled`);
        setTimeout(() => setActionSuccess(null), 3500);
      },
    });
  };

  const handleDeleteClass = (cls: ClassSubject) => {
    setConfirmDialog({
      title: 'Delete Class Section',
      message: `Delete class ${cls.subjectName} (${cls.classCode})? All enrolled students will be unenrolled and score records removed.`,
      confirmLabel: 'Delete Class',
      variant: 'danger',
      onConfirm: async () => {
        await deleteClassSubject(cls.id, cls.classCode);
        setActionSuccess(`Class ${cls.classCode} deleted and learners unenrolled`);
        setTimeout(() => setActionSuccess(null), 3000);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Apple-style Admin Master Banner: Strictly "ASKI SKI PORTAL" title only */}
      <div className="bg-[#0b3b60] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-[#092c4c]">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-40 -bottom-10 w-60 h-60 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <AskiLogo size="lg" />
            <div>
              {/* Name of the admin dashboard: "ASKI SKI PORTAL" only */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                ASKI SKI PORTAL
              </h1>
            </div>
          </div>

          {/* Quick Apple-style Pills */}
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                await ensureAdminRestored();
                setActionSuccess('Administrator account verified');
                setTimeout(() => setActionSuccess(null), 2500);
              }}
              className="apple-tap flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition shadow-xs"
              title="Ensure admin account tanjosell.lpt@gmail.com is fully active"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>Verify Admin</span>
            </button>

            {pendingStudents.length > 0 && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500] animate-pulse"></span>
                <span className="text-xs font-semibold text-white">{pendingStudents.length} Pending</span>
                <button
                  onClick={handleApproveAll}
                  className="apple-tap ml-1 px-3 py-1 rounded-xl bg-[#FF9500] hover:bg-[#e08500] text-slate-950 text-xs font-bold transition shadow-xs"
                >
                  Approve All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Notification Alert (iOS Dynamic Banner) */}
      {actionSuccess && (
        <div className="apple-glass p-3.5 rounded-2xl border border-emerald-500/20 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Apple / iPad Style Metric Tiles with Squircle Icons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div 
          onClick={() => setActiveTab('pending')}
          className={`apple-glass p-4 rounded-3xl cursor-pointer transition apple-tap ${
            activeTab === 'pending'
              ? 'ring-2 ring-[#FF9500] bg-white'
              : 'hover:bg-white/90'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Pending</span>
            <div className="w-8 h-8 rounded-xl bg-[#FF9500]/15 text-[#FF9500] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {pendingStudents.length}
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('students')}
          className={`apple-glass p-4 rounded-3xl cursor-pointer transition apple-tap ${
            activeTab === 'students'
              ? 'ring-2 ring-[#007AFF] bg-white'
              : 'hover:bg-white/90'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Learners</span>
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/15 text-[#007AFF] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {users.filter((u) => u.role === 'student').length}
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('teachers')}
          className={`apple-glass p-4 rounded-3xl cursor-pointer transition apple-tap ${
            activeTab === 'teachers'
              ? 'ring-2 ring-[#5856D6] bg-white'
              : 'hover:bg-white/90'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Faculty</span>
            <div className="w-8 h-8 rounded-xl bg-[#5856D6]/15 text-[#5856D6] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {teacherUsers.length}
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('scoreboards')}
          className={`apple-glass p-4 rounded-3xl cursor-pointer transition apple-tap ${
            activeTab === 'scoreboards'
              ? 'ring-2 ring-[#34C759] bg-white'
              : 'hover:bg-white/90'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Score Records</span>
            <div className="w-8 h-8 rounded-xl bg-[#34C759]/15 text-[#34C759] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {scoreboards.length}
          </div>
        </div>
      </div>

      {/* iOS / iPad Segmented Control Tab Switcher */}
      <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1 backdrop-blur-xl border border-black/[0.04] overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`apple-tap px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Pending Approvals</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            (pendingUsers.length + pendingEnrollments.length) > 0
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {pendingUsers.length + pendingEnrollments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`apple-tap px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'students'
              ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Learners Directory
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`apple-tap px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'teachers'
              ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Faculty
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`apple-tap px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'classes'
              ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Class Sections ({classes.length})
        </button>

        <button
          onClick={() => setActiveTab('scoreboards')}
          className={`apple-tap px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'scoreboards'
              ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Score Board Fixer
        </button>
      </div>

      {/* TAB 1: PENDING APPROVALS (User Registrations + Subject Enrollment Requests) */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* SECTION 1: USER REGISTRATIONS (Students & Faculty) */}
          <div className="apple-glass rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Account Registration Requests ({pendingUsers.length})
                </h3>
                <p className="text-xs text-slate-500">
                  New student and faculty registrations awaiting Administrator verification
                </p>
              </div>

              {pendingUsers.length > 0 && (
                <button
                  onClick={handleApproveAll}
                  className="apple-tap px-4 py-1.5 rounded-xl bg-[#FF9500] hover:bg-[#e08500] text-slate-950 font-bold text-xs shadow-xs transition"
                >
                  Approve All Accounts
                </button>
              )}
            </div>

            {pendingUsers.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-2 bg-white/40 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto" />
                <h4 className="text-xs font-semibold text-slate-700">
                  No Pending User Registrations
                </h4>
                <p className="text-[11px] text-slate-400">
                  All student and teacher accounts have been verified.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/60 text-xs">
                  <thead className="text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Full Name</th>
                      <th className="px-3 py-3 text-left">LRN / ID</th>
                      <th className="px-4 py-3 text-left">Email Address</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/50">
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/80 transition">
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            u.role === 'teacher'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}>
                            {u.role === 'teacher' ? 'Faculty Teacher' : 'Student'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-300 bg-white shrink-0 shadow-xs">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#0b3b60] text-amber-300 flex items-center justify-center font-bold text-xs">
                                  {u.displayName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="font-semibold text-slate-900">{u.displayName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono font-medium text-slate-700">
                          {u.lrn || u.studentNumber || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {u.email}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="apple-tap px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleApprove(u)}
                              className="apple-tap px-3 py-1.5 rounded-lg bg-[#34C759] hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(u)}
                              className="apple-tap px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-medium text-xs transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: SUBJECT ENROLLMENT REQUESTS */}
          <div className="apple-glass rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Subject Enrollment Requests ({pendingEnrollments.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Learners who entered class codes to join specific subjects across all departments
                </p>
              </div>
            </div>

            {pendingEnrollments.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-2 bg-white/40 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto" />
                <h4 className="text-xs font-semibold text-slate-700">
                  No Pending Subject Enrollment Requests
                </h4>
                <p className="text-[11px] text-slate-400">
                  All subject join requests have been processed.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/60 text-xs">
                  <thead className="text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left">Learner</th>
                      <th className="px-3 py-3 text-left">LRN</th>
                      <th className="px-4 py-3 text-left">Subject & Section</th>
                      <th className="px-3 py-3 text-left">Class Code</th>
                      <th className="px-3 py-3 text-left">Assigned Teacher</th>
                      <th className="px-3 py-3 text-left">Requested</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/50">
                    {pendingEnrollments.map((enr) => (
                      <tr key={enr.id} className="hover:bg-white/80 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-300 bg-white shrink-0 shadow-xs">
                              {enr.avatar ? (
                                <img src={enr.avatar} alt={enr.studentName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#0b3b60] text-amber-300 flex items-center justify-center font-bold text-xs">
                                  {enr.studentName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{enr.studentName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{enr.studentEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono font-medium text-slate-700">
                          {enr.lrn || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#0b3b60]">{enr.subjectName}</div>
                          <div className="text-[10px] text-slate-400">{enr.section} • {enr.term || 'Term 1'}</div>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-[#007AFF]">
                          {enr.classCode}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-700">
                          {enr.teacherName || 'Assigned Faculty'}
                        </td>
                        <td className="px-3 py-3 text-slate-500 text-[11px]">
                          {new Date(enr.requestedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveEnrollment(enr)}
                              className="apple-tap px-3 py-1.5 rounded-lg bg-[#34C759] hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectEnrollment(enr.id, enr.studentName)}
                              className="apple-tap px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-medium text-xs transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LEARNERS DIRECTORY */}
      {activeTab === 'students' && (
        <div className="apple-glass rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-slate-900">
              Learners Directory ({sortedStudents.length})
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Sort learners directory"
                  value={studentSort}
                  onChange={(e) => setStudentSort(e.target.value as DirectorySortOption)}
                  className="pl-8 pr-7 py-1.5 rounded-xl text-xs font-medium bg-white/80 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF] cursor-pointer"
                >
                  <option value="first-asc">Sort: Name (A → Z)</option>
                  <option value="first-desc">Sort: Name (Z → A)</option>
                  <option value="last-asc">Sort: Last Name (A → Z)</option>
                  <option value="last-desc">Sort: Last Name (Z → A)</option>
                  <option value="newest">Sort: Newest Registered</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white/80 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/60 text-xs">
              <thead className="text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Learner Name</th>
                  <th className="px-3 py-3 text-left">LRN</th>
                  <th className="px-4 py-3 text-left">Email Address</th>
                  <th className="px-3 py-3 text-left">Class Code</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/50">
                {sortedStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-white/80 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0">
                            {st.avatar ? (
                              <img src={st.avatar} alt={st.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-xs">
                                {st.displayName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span>{st.displayName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-700">
                        {st.lrn || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {st.email}
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-[#007AFF]">
                        {st.classCode || 'SKI-10A'}
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-700 font-medium">
                        {st.status}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(st)}
                            className="apple-tap px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(st)}
                            className="apple-tap p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FACULTY & TEACHERS */}
      {activeTab === 'teachers' && (
        <div className="apple-glass rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-slate-900">
              Faculty Members ({filteredTeachers.length})
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Sort faculty directory"
                  value={teacherSort}
                  onChange={(e) => setTeacherSort(e.target.value as DirectorySortOption)}
                  className="pl-8 pr-7 py-1.5 rounded-xl text-xs font-medium bg-white/80 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF] cursor-pointer"
                >
                  <option value="first-asc">Sort: Name (A → Z)</option>
                  <option value="first-desc">Sort: Name (Z → A)</option>
                  <option value="last-asc">Sort: Last Name (A → Z)</option>
                  <option value="last-desc">Sort: Last Name (Z → A)</option>
                  <option value="newest">Sort: Newest Registered</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search faculty..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white/80 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <button
                onClick={() => setIsAddTeacherOpen(true)}
                className="apple-tap inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white font-semibold text-xs shadow-md transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Teacher</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTeachers.map((teacher) => (
              <div 
                key={teacher.id}
                className="p-4 rounded-2xl bg-white/70 border border-slate-200/60 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center">
                    {teacher.avatar ? (
                      <img src={teacher.avatar} alt={teacher.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#5856D6] text-white flex items-center justify-center font-bold text-sm">
                        {teacher.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">
                      {teacher.displayName}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {teacher.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingUser(teacher)}
                    className="apple-tap p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition"
                    title="Edit Teacher"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(teacher)}
                    className="apple-tap p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CLASS SECTIONS & CODES */}
      {activeTab === 'classes' && (
        <div className="apple-glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Class Sections
            </h3>

            <button
              onClick={() => setIsAddClassOpen(true)}
              className="apple-tap inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white font-semibold text-xs shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Class</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {classes.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-white/70 border border-slate-200/60 text-xs space-y-2 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{c.subjectName}</h4>
                    <p className="text-slate-500">{c.section}</p>
                  </div>
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800">
                    {c.classCode}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>Instructor: {c.teacherName}</span>
                  <span className="text-slate-400">{c.schedule || 'Regular'}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setEditingClass(c)}
                    className="apple-tap px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClass(c)}
                    className="apple-tap p-1.5 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SCOREBOARD FIXER & EDITOR */}
      {activeTab === 'scoreboards' && (
        <div className="apple-glass rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-slate-900">
              Score Board Editor ({sortedScoreboards.length})
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Sort scoreboard directory"
                  value={scoreboardSort}
                  onChange={(e) => setScoreboardSort(e.target.value as DirectorySortOption)}
                  className="pl-8 pr-7 py-1.5 rounded-xl text-xs font-medium bg-white/80 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF] cursor-pointer"
                >
                  <option value="first-asc">Sort: Name (A → Z)</option>
                  <option value="first-desc">Sort: Name (Z → A)</option>
                  <option value="last-asc">Sort: Last Name (A → Z)</option>
                  <option value="last-desc">Sort: Last Name (Z → A)</option>
                  <option value="newest">Sort: Newest Registered</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white/80 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/60 text-xs">
              <thead className="text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Learner Name</th>
                  <th className="px-4 py-3 text-left">Class Code</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-center">Written (20%)</th>
                  <th className="px-4 py-3 text-center">Tasks (50%)</th>
                  <th className="px-4 py-3 text-center">Exams (30%)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/50">
                {sortedScoreboards.map((sb) => {
                    const totals = calculateScoreBoardTotals(sb);
                    return (
                      <tr key={sb.id} className="hover:bg-white/80 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {sb.studentName}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-700">
                          {sb.classCode}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {sb.subjectName}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-slate-800">
                          {totals.wwTotal}/{totals.wwMax}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-[#34C759]">
                          {totals.ptTotal}/{totals.ptMax}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-[#FF9500]">
                          {totals.examTotal}/{totals.examMax}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingScoreboard(sb)}
                              className="apple-tap px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs transition"
                            >
                              Edit Scores
                            </button>
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Delete Scoreboard Record',
                                  message: `Permanently delete the scoreboard for ${sb.studentName} (${sb.classCode})?`,
                                  confirmLabel: 'Delete Scoreboard',
                                  variant: 'danger',
                                  onConfirm: async () => {
                                    await deleteScoreBoard(sb.id);
                                    setActionSuccess(`Deleted scoreboard for ${sb.studentName}`);
                                    setTimeout(() => setActionSuccess(null), 2500);
                                  },
                                });
                              }}
                              className="apple-tap p-1.5 text-slate-400 hover:text-rose-600 transition"
                              title="Delete Scoreboard"
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
        </div>
      )}

      {/* MODAL 1: Admin Edit User */}
      {editingUser && (
        <AdminEditUserModal
          user={editingUser}
          classes={classes}
          onClose={() => setEditingUser(null)}
          onSave={async (updated) => {
            await saveUserAccount(updated);
            setActionSuccess(`Updated user profile`);
            setTimeout(() => setActionSuccess(null), 3000);
            setEditingUser(null);
          }}
        />
      )}

      {/* MODAL 2: Admin Edit Scoreboard */}
      {editingScoreboard && (
        <AdminEditScoreboardModal
          scoreboard={editingScoreboard}
          onClose={() => setEditingScoreboard(null)}
          onSave={async (updated) => {
            await saveScoreBoard(updated);
            setActionSuccess(`Scoreboard updated`);
            setTimeout(() => setActionSuccess(null), 3000);
            setEditingScoreboard(null);
          }}
        />
      )}

      {/* MODAL 3: Admin Edit Class */}
      {editingClass && (
        <AdminEditClassModal
          classObj={editingClass}
          teachers={teacherUsers}
          onClose={() => setEditingClass(null)}
          onSave={async (updated) => {
            await saveClassSubject(updated);
            setActionSuccess(`Class updated`);
            setTimeout(() => setActionSuccess(null), 3000);
            setEditingClass(null);
          }}
        />
      )}

      {/* MODAL 4: Admin Add Teacher */}
      {isAddTeacherOpen && (
        <AddTeacherModal
          onClose={() => setIsAddTeacherOpen(false)}
          onSave={async (teacherData) => {
            const res = await signUpTeacher(teacherData);
            if (res.success && res.user) {
              setActionSuccess(`Added teacher ${res.user.displayName}`);
              setTimeout(() => setActionSuccess(null), 3000);
              setIsAddTeacherOpen(false);
            }
            return { success: res.success, message: res.message };
          }}
        />
      )}

      {/* MODAL 5: Admin Create Class */}
      {isAddClassOpen && (
        <AdminCreateClassModal
          teachers={teacherUsers}
          onClose={() => setIsAddClassOpen(false)}
          onSave={async (newClass) => {
            await saveClassSubject(newClass);
            setActionSuccess(`Created class ${newClass.classCode}`);
            setTimeout(() => setActionSuccess(null), 3000);
            setIsAddClassOpen(false);
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        variant={confirmDialog?.variant || 'danger'}
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

// ==========================================
// APPLE-STYLED MODAL COMPONENTS
// ==========================================

const AdminEditUserModal: React.FC<{
  user: UserAccount;
  classes: ClassSubject[];
  onClose: () => void;
  onSave: (updated: UserAccount) => Promise<void>;
}> = ({ user, classes, onClose, onSave }) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [middleName, setMiddleName] = useState(user.middleName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [email, setEmail] = useState(user.email || '');
  const [lrn, setLrn] = useState(user.lrn || '');
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<ApprovalStatus>(user.status);
  const [classCode, setClassCode] = useState(user.classCode || 'SKI-10A');
  const [studentNumber, setStudentNumber] = useState(user.studentNumber || '');
  const [password, setPassword] = useState(user.password || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const displayName = `${firstName.trim()} ${middleName.trim() ? middleName.trim() + ' ' : ''}${lastName.trim()}`;
    const updated: UserAccount = {
      ...user,
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      displayName,
      email: email.trim().toLowerCase(),
      lrn: lrn.trim() || undefined,
      role,
      status,
      classCode: classCode.trim().toUpperCase(),
      studentNumber: studentNumber.trim() || undefined,
      password: password || user.password,
    };

    await onSave(updated);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/60 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
          <h3 className="font-bold text-sm text-slate-900">
            Edit User: {user.displayName}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">LRN</label>
              <input
                type="text"
                value={lrn}
                onChange={(e) => setLrn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">ID Number</label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher / Faculty</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApprovalStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Class Code</label>
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-semibold"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onClose}
              className="apple-tap px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-tap px-4 py-1.5 rounded-xl bg-[#007AFF] text-white font-semibold"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminEditScoreboardModal: React.FC<{
  scoreboard: StudentScoreBoard;
  onClose: () => void;
  onSave: (updated: StudentScoreBoard) => Promise<void>;
}> = ({ scoreboard, onClose, onSave }) => {
  const [studentName, setStudentName] = useState(scoreboard.studentName);
  const [lrn, setLrn] = useState(scoreboard.lrn || '');
  const [classCode, setClassCode] = useState(scoreboard.classCode);
  const [subjectName, setSubjectName] = useState(scoreboard.subjectName);
  const [ww, setWw] = useState<ScoreItem[]>(scoreboard.writtenWorks || []);
  const [pt, setPt] = useState<ScoreItem[]>(scoreboard.performanceTasks || []);
  const [st, setSt] = useState<ScoreItem[]>(scoreboard.summativeTests || []);
  const [term, setTerm] = useState<ScoreItem>(scoreboard.termExam || { id: 'term', title: 'Term Exam', score: 50, maxScore: 60 });
  const [remarks, setRemarks] = useState(scoreboard.remarks || '');
  const [loading, setLoading] = useState(false);

  const addWw = () => {
    if (ww.length < 5) {
      setWw([...ww, { id: `ww-${ww.length + 1}`, title: `Written Work ${ww.length + 1}`, score: 20, maxScore: 25 }]);
    }
  };

  const removeWw = (idx: number) => {
    if (ww.length > 2) {
      setWw(ww.filter((_, i) => i !== idx));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updated: StudentScoreBoard = {
      ...scoreboard,
      studentName: studentName.trim(),
      lrn: lrn.trim() || undefined,
      classCode: classCode.trim().toUpperCase(),
      subjectName: subjectName.trim(),
      writtenWorks: ww,
      performanceTasks: pt,
      summativeTests: st,
      termExam: term,
      remarks: remarks.trim(),
      updatedAt: new Date().toISOString(),
    };

    await onSave(updated);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-white/60 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
          <h3 className="font-bold text-sm text-slate-900">
            Edit Scores: {scoreboard.studentName}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Student Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">LRN</label>
              <input
                type="text"
                value={lrn}
                onChange={(e) => setLrn(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Class Code</label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-semibold"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
                required
              />
            </div>
          </div>

          {/* 1. Written Works */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                1. Written / Oral Works (20%)
              </span>
              {ww.length < 5 && (
                <button
                  type="button"
                  onClick={addWw}
                  className="text-xs text-[#007AFF] font-medium"
                >
                  + Add Item
                </button>
              )}
            </div>
            {ww.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-100/70 p-2 rounded-xl">
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
                <input
                  type="number"
                  value={item.score}
                  onChange={(e) => {
                    const next = [...ww];
                    next[idx].score = Number(e.target.value);
                    setWw(next);
                  }}
                  className="col-span-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-right"
                />
                <input
                  type="number"
                  value={item.maxScore}
                  onChange={(e) => {
                    const next = [...ww];
                    next[idx].maxScore = Number(e.target.value);
                    setWw(next);
                  }}
                  className="col-span-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 text-right"
                />
                <div className="col-span-2 text-right">
                  {ww.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeWw(idx)}
                      className="text-rose-500 text-xs"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 2. Performance Tasks */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-900">
              2. Product / Performance Tasks (50%)
            </span>
            {pt.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-100/70 p-2 rounded-xl">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...pt];
                    next[idx].title = e.target.value;
                    setPt(next);
                  }}
                  className="col-span-6 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                />
                <input
                  type="number"
                  value={item.score}
                  onChange={(e) => {
                    const next = [...pt];
                    next[idx].score = Number(e.target.value);
                    setPt(next);
                  }}
                  className="col-span-3 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-right text-[#34C759]"
                />
                <input
                  type="number"
                  value={item.maxScore}
                  onChange={(e) => {
                    const next = [...pt];
                    next[idx].maxScore = Number(e.target.value);
                    setPt(next);
                  }}
                  className="col-span-3 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 text-right"
                />
              </div>
            ))}
          </div>

          {/* 3. Exams */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-900">
              3. Examinations (30%)
            </span>
            {st.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-100/70 p-2 rounded-xl">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...st];
                    next[idx].title = e.target.value;
                    setSt(next);
                  }}
                  className="col-span-6 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                />
                <input
                  type="number"
                  value={item.score}
                  onChange={(e) => {
                    const next = [...st];
                    next[idx].score = Number(e.target.value);
                    setSt(next);
                  }}
                  className="col-span-3 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-right text-[#FF9500]"
                />
                <input
                  type="number"
                  value={item.maxScore}
                  onChange={(e) => {
                    const next = [...st];
                    next[idx].maxScore = Number(e.target.value);
                    setSt(next);
                  }}
                  className="col-span-3 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 text-right"
                />
              </div>
            ))}

            <div className="grid grid-cols-12 gap-2 items-center bg-slate-100/70 p-2 rounded-xl">
              <input
                type="text"
                value={term.title}
                onChange={(e) => setTerm({ ...term, title: e.target.value })}
                className="col-span-6 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
              />
              <input
                type="number"
                value={term.score}
                onChange={(e) => setTerm({ ...term, score: Number(e.target.value) })}
                className="col-span-3 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-right text-[#007AFF]"
              />
              <input
                type="number"
                value={term.maxScore}
                onChange={(e) => setTerm({ ...term, maxScore: Number(e.target.value) })}
                className="col-span-3 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 text-right"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onClose}
              className="apple-tap px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-tap px-4 py-1.5 rounded-xl bg-[#007AFF] text-white font-semibold"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminEditClassModal: React.FC<{
  classObj: ClassSubject;
  teachers: UserAccount[];
  onClose: () => void;
  onSave: (updated: ClassSubject) => Promise<void>;
}> = ({ classObj, onClose, onSave }) => {
  const [subjectName, setSubjectName] = useState(classObj.subjectName);
  const [section, setSection] = useState(classObj.section);
  const [classCode, setClassCode] = useState(classObj.classCode);
  const [teacherName, setTeacherName] = useState(classObj.teacherName);
  const [schedule, setSchedule] = useState(classObj.schedule || '');
  const [room, setRoom] = useState(classObj.room || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updated: ClassSubject = {
      ...classObj,
      subjectName: subjectName.trim(),
      section: section.trim(),
      classCode: classCode.trim().toUpperCase(),
      teacherName: teacherName.trim(),
      schedule: schedule.trim() || undefined,
      room: room.trim() || undefined,
    };

    await onSave(updated);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/60 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <h3 className="font-bold text-sm text-slate-900">
            Edit Class: {classObj.classCode}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Subject Name *</label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Section *</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Class Code *</label>
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-semibold"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Assigned Teacher</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Schedule</label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Room</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onClose}
              className="apple-tap px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-tap px-4 py-1.5 rounded-xl bg-[#007AFF] text-white font-semibold"
            >
              {loading ? 'Saving...' : 'Update Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddTeacherModal: React.FC<{
  onClose: () => void;
  onSave: (data: { name: string; email: string; password?: string; avatar?: string }) => Promise<{ success: boolean; message?: string }>;
}> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('teacher123');
  const [photo, setPhoto] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setErrorMsg(null);
    setLoading(true);
    const res = await onSave({
      name: name.trim(),
      email: email.trim(),
      password,
      avatar: photo || undefined,
    });
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.message || 'This email address is already registered.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/60 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <h3 className="font-bold text-sm text-slate-900">
            Add Faculty Teacher
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-100/70 border border-slate-200">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center">
              {photo ? (
                <img src={photo} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>

            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="apple-tap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>{photo ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Maria Santos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              placeholder="e.g. maria.santos@aski-ski.edu.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onClose}
              className="apple-tap px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-tap px-4 py-1.5 rounded-xl bg-[#007AFF] text-white font-semibold"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminCreateClassModal: React.FC<{
  teachers: UserAccount[];
  onClose: () => void;
  onSave: (cls: ClassSubject) => Promise<void>;
}> = ({ teachers, onClose, onSave }) => {
  const [subjectName, setSubjectName] = useState('');
  const [section, setSection] = useState('');
  const [teacherName, setTeacherName] = useState(teachers[0]?.displayName || 'Prof. Tanjosell');
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
      teacherId: 'teacher-admin',
      teacherName: teacherName.trim(),
      schedule: schedule.trim() || undefined,
      room: room.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/60 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <h3 className="font-bold text-sm text-slate-900">
            Create Class Section
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Subject Name *</label>
            <input
              type="text"
              placeholder="e.g. Science 10"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Section *</label>
            <input
              type="text"
              placeholder="e.g. Grade 10 - St. Luke"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              required
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600">Generated Code:</span>
            <span className="font-mono font-bold text-[#007AFF]">{generatedCode}</span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Assign Teacher</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onClose}
              className="apple-tap px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="apple-tap px-4 py-1.5 rounded-xl bg-[#007AFF] text-white font-semibold"
            >
              Create Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
