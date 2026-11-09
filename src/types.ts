export type UserRole = 'student' | 'teacher' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserAccount {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  email: string;
  password?: string;
  role: UserRole;
  status: ApprovalStatus;
  classCode?: string; // used by student to join class (legacy/default)
  enrolledClassCodes?: string[]; // Multiple enrolled classes/subjects like Google Classroom
  lrn?: string; // 12-digit DepEd Learner Reference Number
  studentNumber?: string;
  createdAt: string;
  avatar?: string;
}

export interface ClassSubject {
  id: string;
  subjectName: string;
  section: string;
  classCode: string; // e.g. SKI-10A
  teacherId: string;
  teacherName: string;
  term?: 'Term 1' | 'Term 2' | 'Term 3' | string;
  schedule?: string;
  room?: string;
  createdAt: string;
}

export interface SubjectEnrollment {
  id: string; // e.g. enr-studentId-classCode
  studentId: string;
  studentName: string;
  studentEmail: string;
  lrn?: string;
  studentNumber?: string;
  avatar?: string;
  classCode: string;
  subjectName: string;
  section?: string;
  teacherId?: string;
  teacherName?: string;
  term?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ScoreItem {
  id: string;
  title: string;
  score: number;
  maxScore: number;
}

export interface StudentScoreBoard {
  id: string;
  studentId: string;
  studentNumber?: string;
  lrn?: string; // 12-digit DepEd Learner Reference Number
  studentName: string;
  studentEmail?: string;
  classCode: string;
  subjectName: string;
  section?: string;
  teacherName?: string;
  // 1. Written / Oral Work (2 to 5 items)
  writtenWorks: ScoreItem[];
  // 2. Performance / Product Tasks (required 3 items)
  performanceTasks: ScoreItem[];
  // 3. Examinations: 2 Summative Tests + 1 Term Examination
  summativeTests: ScoreItem[];
  termExam: ScoreItem;
  // Calculated stats
  totalRawScore?: number;
  totalMaxScore?: number;
  computedPercentage?: number;
  transmutedGrade?: number;
  remarks?: string;
  updatedAt: string;
}

export interface BroadcastNote {
  id: string;
  classCode: string;
  subjectName: string;
  title: string;
  message: string;
  teacherName: string;
  teacherId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipientId?: string; // if targeted, or undefined for role broadcast
  recipientRole?: UserRole | 'all';
  title: string;
  message: string;
  type: 'approval' | 'score' | 'broadcast' | 'system';
  read: boolean;
  createdAt: string;
}

// Philippine DepEd Standard Grade Transmutation Table helper
export function computeTransmutedGrade(percentage: number): {
  transmuted: number;
  descriptor: string;
  remarks: 'Passed' | 'Failed';
  color: string;
  badgeBg: string;
} {
  const p = Math.round(percentage * 10) / 10;
  let transmuted = 75;

  if (p >= 100) transmuted = 100;
  else if (p >= 98.4) transmuted = 99;
  else if (p >= 96.8) transmuted = 98;
  else if (p >= 95.2) transmuted = 97;
  else if (p >= 93.6) transmuted = 96;
  else if (p >= 92.0) transmuted = 95;
  else if (p >= 90.4) transmuted = 94;
  else if (p >= 88.8) transmuted = 93;
  else if (p >= 87.2) transmuted = 92;
  else if (p >= 85.6) transmuted = 91;
  else if (p >= 84.0) transmuted = 90;
  else if (p >= 82.4) transmuted = 89;
  else if (p >= 80.8) transmuted = 88;
  else if (p >= 79.2) transmuted = 87;
  else if (p >= 77.6) transmuted = 86;
  else if (p >= 76.0) transmuted = 85;
  else if (p >= 74.4) transmuted = 84;
  else if (p >= 72.8) transmuted = 83;
  else if (p >= 71.2) transmuted = 82;
  else if (p >= 69.6) transmuted = 81;
  else if (p >= 68.0) transmuted = 80;
  else if (p >= 66.4) transmuted = 79;
  else if (p >= 64.8) transmuted = 78;
  else if (p >= 63.2) transmuted = 77;
  else if (p >= 61.6) transmuted = 76;
  else if (p >= 60.0) transmuted = 75;
  else if (p >= 56.0) transmuted = 74;
  else if (p >= 52.0) transmuted = 73;
  else if (p >= 48.0) transmuted = 72;
  else if (p >= 44.0) transmuted = 71;
  else if (p >= 40.0) transmuted = 70;
  else transmuted = Math.max(60, Math.round(p));

  let descriptor = 'Outstanding';
  let remarks: 'Passed' | 'Failed' = 'Passed';
  let color = 'text-emerald-700';
  let badgeBg = 'bg-emerald-100 text-emerald-800';

  if (transmuted >= 90) {
    descriptor = 'Outstanding';
    remarks = 'Passed';
    color = 'text-emerald-700';
    badgeBg = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
  } else if (transmuted >= 85) {
    descriptor = 'Very Satisfactory';
    remarks = 'Passed';
    color = 'text-blue-700';
    badgeBg = 'bg-blue-100 text-blue-800 border border-blue-300';
  } else if (transmuted >= 80) {
    descriptor = 'Satisfactory';
    remarks = 'Passed';
    color = 'text-cyan-700';
    badgeBg = 'bg-cyan-100 text-cyan-800 border border-cyan-300';
  } else if (transmuted >= 75) {
    descriptor = 'Fairly Satisfactory';
    remarks = 'Passed';
    color = 'text-amber-700';
    badgeBg = 'bg-amber-100 text-amber-800 border border-amber-300';
  } else {
    descriptor = 'Did Not Meet Expectations';
    remarks = 'Failed';
    color = 'text-rose-700';
    badgeBg = 'bg-rose-100 text-rose-800 border border-rose-300';
  }

  return { transmuted, descriptor, remarks, color, badgeBg };
}

// Calculate scoreboard summary
export function calculateScoreBoardTotals(sb: StudentScoreBoard): {
  wwTotal: number;
  wwMax: number;
  wwPct: number;
  ptTotal: number;
  ptMax: number;
  ptPct: number;
  examTotal: number;
  examMax: number;
  examPct: number;
  initialGrade: number;
  transmuted: number;
  descriptor: string;
  remarks: 'Passed' | 'Failed';
} {
  // Written works total
  const wwTotal = (sb.writtenWorks || []).reduce((sum, item) => sum + (Number(item.score) || 0), 0);
  const wwMax = Math.max((sb.writtenWorks || []).reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0), 1);
  const wwPct = (wwTotal / wwMax) * 100;

  // Performance tasks total
  const ptTotal = (sb.performanceTasks || []).reduce((sum, item) => sum + (Number(item.score) || 0), 0);
  const ptMax = Math.max((sb.performanceTasks || []).reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0), 1);
  const ptPct = (ptTotal / ptMax) * 100;

  // Examinations total (2 summative tests + 1 term exam)
  const stTotal = (sb.summativeTests || []).reduce((sum, item) => sum + (Number(item.score) || 0), 0);
  const stMax = (sb.summativeTests || []).reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0);
  const termTotal = Number(sb.termExam?.score) || 0;
  const termMax = Number(sb.termExam?.maxScore) || 50;

  const examTotal = stTotal + termTotal;
  const examMax = Math.max(stMax + termMax, 1);
  const examPct = (examTotal / examMax) * 100;

  // Standard DepEd weighting: 30% Written Work, 50% Performance Task, 20% Quarterly Exam
  const initialGrade = Math.round((wwPct * 0.30 + ptPct * 0.50 + examPct * 0.20) * 10) / 10;
  const { transmuted, descriptor, remarks } = computeTransmutedGrade(initialGrade);

  return {
    wwTotal,
    wwMax,
    wwPct: Math.round(wwPct * 10) / 10,
    ptTotal,
    ptMax,
    ptPct: Math.round(ptPct * 10) / 10,
    examTotal,
    examMax,
    examPct: Math.round(examPct * 10) / 10,
    initialGrade,
    transmuted,
    descriptor,
    remarks,
  };
}
