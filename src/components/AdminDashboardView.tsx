import React, { useState, useMemo, useRef } from 'react';
import { 
  UserAccount, 
  ClassSubject, 
  StudentScoreBoard, 
  ScoreItem,
  UserRole,
  ApprovalStatus,
  calculateScoreBoardTotals 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { AskiLogo } from './AskiLogo';
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
  Sliders
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

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  users,
  classes,
  scoreboards,
}) => {
  const { signUpTeacher, ensureAdminRestored } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'students' | 'teachers' | 'classes' | 'scoreboards'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit Modals
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editingScoreboard, setEditingScoreboard] = useState<StudentScoreBoard | null>(null);
  const [editingClass, setEditingClass] = useState<ClassSubject | null>(null);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);

  const pendingStudents = useMemo(() => {
    return users.filter((u) => u.role === 'student' && u.status === 'pending');
  }, [users]);

  const teacherUsers = useMemo(() => {
    return users.filter((u) => u.role === 'teacher');
  }, [users]);

  const handleApprove = async (user: UserAccount) => {
    await updateUserStatus(user.id, 'approved');
    await addNotification({
      id: `notif-${Date.now()}`,
      recipientId: user.id,
      recipientRole: 'student',
      title: 'Registration Approved',
      message: `Your account for Class Code ${user.classCode || 'SKI-10A'} has been accepted. You can now view your score board!`,
      type: 'approval',
      read: false,
      createdAt: new Date().toISOString(),
    });
    setActionSuccess(`Approved ${user.displayName}`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleApproveAll = async () => {
    if (window.confirm(`Approve all ${pendingStudents.length} pending student registrations?`)) {
      for (const student of pendingStudents) {
        await updateUserStatus(student.id, 'approved');
      }
      setActionSuccess(`All ${pendingStudents.length} registrations approved`);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleReject = async (user: UserAccount) => {
    if (window.confirm(`Reject registration request for ${user.displayName}?`)) {
      await updateUserStatus(user.id, 'rejected');
      setActionSuccess(`Registration for ${user.displayName} rejected`);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (window.confirm(`Permanently delete account for ${user.displayName}?`)) {
      await deleteUserAccount(user.id);
      setActionSuccess(`Account for ${user.displayName} deleted`);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleDeleteClass = async (cls: ClassSubject) => {
    if (window.confirm(`Delete class ${cls.subjectName} (${cls.classCode})?`)) {
      await deleteClassSubject(cls.id);
      setActionSuccess(`Class ${cls.classCode} deleted`);
      setTimeout(() => setActionSuccess(null), 3000);
    }
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
          className={`apple-tap px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pending ({pendingStudents.length})
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

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="apple-glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Pending Registrations
            </h3>

            {pendingStudents.length > 0 && (
              <button
                onClick={handleApproveAll}
                className="apple-tap px-4 py-1.5 rounded-xl bg-[#FF9500] hover:bg-[#e08500] text-slate-950 font-bold text-xs shadow-xs transition"
              >
                Approve All
              </button>
            )}
          </div>

          {pendingStudents.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#34C759] mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">
                No Pending Registrations
              </h4>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/60 text-xs">
                <thead className="text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left">Learner Name</th>
                    <th className="px-3 py-3 text-left">LRN</th>
                    <th className="px-4 py-3 text-left">Email Address</th>
                    <th className="px-3 py-3 text-left">Class Code</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/50">
                  {pendingStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-white/80 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-300 bg-white shrink-0">
                            {st.avatar ? (
                              <img src={st.avatar} alt={st.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-[#0b3b60] text-amber-300 flex items-center justify-center font-bold text-xs">
                                {st.displayName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-slate-900">{st.displayName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono font-medium text-slate-700">
                        {st.lrn || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {st.email}
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-[#007AFF]">
                        {st.classCode || 'SKI-10A'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(st)}
                            className="apple-tap px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleApprove(st)}
                            className="apple-tap px-3 py-1.5 rounded-lg bg-[#34C759] hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(st)}
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
      )}

      {/* TAB 2: LEARNERS DIRECTORY */}
      {activeTab === 'students' && (
        <div className="apple-glass rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-slate-900">
              Learners Directory
            </h3>

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
                {users
                  .filter((u) => u.role === 'student')
                  .filter((u) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return u.displayName.toLowerCase().includes(q) || (u.lrn && u.lrn.includes(q)) || u.email.toLowerCase().includes(q);
                  })
                  .map((st) => (
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
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Faculty Members
            </h3>

            <button
              onClick={() => setIsAddTeacherOpen(true)}
              className="apple-tap inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white font-semibold text-xs shadow-md transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Teacher</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {teacherUsers.map((teacher) => (
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
              Score Board Editor
            </h3>

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
                {scoreboards
                  .filter((sb) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return sb.studentName.toLowerCase().includes(q) || sb.classCode.toLowerCase().includes(q) || sb.subjectName.toLowerCase().includes(q);
                  })
                  .map((sb) => {
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
                              onClick={async () => {
                                if (window.confirm(`Delete scoreboard for ${sb.studentName}?`)) {
                                  await deleteScoreBoard(sb.id);
                                  setActionSuccess(`Deleted scoreboard for ${sb.studentName}`);
                                  setTimeout(() => setActionSuccess(null), 2500);
                                }
                              }}
                              className="apple-tap p-1.5 text-slate-400 hover:text-rose-600 transition"
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
            }
            setIsAddTeacherOpen(false);
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
  onSave: (data: { name: string; email: string; password?: string; avatar?: string }) => Promise<void>;
}> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('teacher123');
  const [photo, setPhoto] = useState<string>('');
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    await onSave({
      name: name.trim(),
      email: email.trim(),
      password,
      avatar: photo || undefined,
    });
    setLoading(false);
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
