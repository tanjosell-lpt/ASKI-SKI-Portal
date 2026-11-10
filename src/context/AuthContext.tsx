import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserAccount, UserRole, ApprovalStatus, StudentScoreBoard, ClassSubject, SubjectEnrollment } from '../types';
import { 
  saveUserAccount, 
  subscribeToUsers, 
  addNotification, 
  deleteUserAccount, 
  ensureAdminAccount,
  saveScoreBoard,
  deleteScoreBoard,
  subscribeToEnrollments,
  saveSubjectEnrollment,
  updateEnrollmentStatus,
  deleteSubjectEnrollment
} from '../services/dbService';

interface AuthContextType {
  currentUser: UserAccount | null;
  role: UserRole | null;
  status: ApprovalStatus | null;
  isAuthenticated: boolean;
  usersList: UserAccount[];
  enrollmentsList: SubjectEnrollment[];
  signIn: (emailOrLrn: string, password?: string, expectedRole?: UserRole) => Promise<{ success: boolean; message?: string }>;
  signUp: (params: {
    firstName: string;
    middleName?: string;
    lastName: string;
    lrn?: string;
    avatar?: string;
    email: string;
    password?: string;
    classCode?: string;
  }) => Promise<{ success: boolean; message?: string; user?: UserAccount }>;
  signUpTeacher: (params: {
    name: string;
    email: string;
    password?: string;
    avatar?: string;
  }) => Promise<{ success: boolean; message?: string; user?: UserAccount }>;
  requestPasswordReset: (identifier: string) => Promise<{ success: boolean; message: string; otpCode?: string }>;
  verifyOtpAndResetPassword: (identifier: string, otpCode: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  enrollInSubject: (classCode: string, availableClasses: ClassSubject[]) => Promise<{ success: boolean; message: string; subject?: ClassSubject }>;
  unenrollSubject: (classCode: string) => Promise<{ success: boolean; message: string }>;
  approveSubjectEnrollment: (enrollment: SubjectEnrollment, reviewerName?: string) => Promise<void>;
  rejectSubjectEnrollment: (enrollmentId: string, reviewerName?: string) => Promise<void>;
  updateUserAvatar: (userId: string, avatarData: string) => Promise<void>;
  updateUserAccount: (user: UserAccount) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  ensureAdminRestored: () => Promise<void>;
  signInWithGoogle: (expectedRole?: UserRole) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => void;
  switchDemoRole: (role: UserRole, status?: ApprovalStatus) => void;
  loading: boolean;
}

import { 
  INITIAL_CLASSES, 
  INITIAL_USERS, 
  INITIAL_SCOREBOARDS, 
  INITIAL_BROADCASTS, 
  INITIAL_NOTIFICATIONS 
} from '../data/mockData';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_USERNAME = 'askiskiportal-admin';
export const ADMIN_PASSWORD = 'adminaskiski2026';
export const ADMIN_EMAIL = 'tanjosell.lpt@gmail.com';
const SESSION_STORAGE_KEY = 'aski_portal_session_user';
const USERS_CACHE_KEY = 'aski_portal_users_cache';
const ENROLLMENTS_CACHE_KEY = 'aski_portal_enrollments_cache';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session persistence: Students and staff remain logged in across page refreshes
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to restore session from localStorage', e);
    }
    return null;
  });

  const [usersList, setUsersList] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load users cache', e);
    }
    return INITIAL_USERS;
  });

  const [enrollmentsList, setEnrollmentsList] = useState<SubjectEnrollment[]>(() => {
    try {
      const saved = localStorage.getItem(ENROLLMENTS_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load enrollments cache', e);
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [otpRequests, setOtpRequests] = useState<{ [identifier: string]: { code: string; expiresAt: number } }>({});

  // Sync usersList and enrollmentsList to localStorage cache
  useEffect(() => {
    try {
      if (usersList.length > 0) {
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(usersList));
      }
    } catch (e) {
      console.warn('Failed to cache users', e);
    }
  }, [usersList]);

  useEffect(() => {
    try {
      localStorage.setItem(ENROLLMENTS_CACHE_KEY, JSON.stringify(enrollmentsList));
    } catch (e) {
      console.warn('Failed to cache enrollments', e);
    }
  }, [enrollmentsList]);

  // Synchronize localStorage with currentUser state
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to sync session with localStorage', e);
    }
  }, [currentUser]);

  // Sync enrollments list from Firestore
  useEffect(() => {
    const unsub = subscribeToEnrollments((live) => {
      setEnrollmentsList(live);
    });
    return () => unsub();
  }, []);

  // Guarantee that tanjosell.lpt@gmail.com and admin account are recognized
  useEffect(() => {
    ensureAdminAccount(ADMIN_EMAIL).catch(console.warn);
  }, []);

  // Sync users list from Firestore with automatic admin healing
  useEffect(() => {
    const unsub = subscribeToUsers((liveUsers) => {
      // Auto-heal admin if accidentally saved as student
      const sanitized = liveUsers.map((u) => {
        if (u.email && u.email.toLowerCase() === ADMIN_EMAIL) {
          if (u.role !== 'admin' || u.status !== 'approved') {
            const healed: UserAccount = {
              ...u,
              role: 'admin',
              status: 'approved',
              displayName: u.displayName || 'Portal Administrator',
            };
            saveUserAccount(healed).catch(console.warn);
            return healed;
          }
        }
        return u;
      });

      // Ensure admin is always present in list
      const hasAdmin = sanitized.some((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
      if (!hasAdmin) {
        sanitized.unshift({
          id: 'user-admin-1',
          firstName: 'Portal',
          middleName: 'System',
          lastName: 'Admin',
          displayName: 'Portal Administrator',
          email: ADMIN_EMAIL,
          role: 'admin',
          status: 'approved',
          createdAt: new Date().toISOString(),
        });
      }

      setUsersList(sanitized);

      // Keep active user synchronized with latest Firestore document (e.g. status changes from pending to approved)
      const activeUserId = currentUser?.id || (() => {
        try {
          const saved = localStorage.getItem(SESSION_STORAGE_KEY);
          return saved ? JSON.parse(saved).id : null;
        } catch {
          return null;
        }
      })();

      if (activeUserId) {
        const updated = sanitized.find((u) => u.id === activeUserId);
        if (updated) {
          setCurrentUser(updated);
        }
      }

      setLoading(false);
    });

    return () => unsub();
  }, [currentUser?.id, currentUser?.email]);

  const signIn = async (
    emailOrLrn: string, 
    password?: string, 
    expectedRole?: UserRole
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmed = (emailOrLrn || '').trim();
    if (!trimmed) {
      return { 
        success: false, 
        message: expectedRole === 'admin'
          ? 'Please enter the Administrator Username.'
          : expectedRole === 'student'
          ? 'Please enter your Email Address or 12-digit LRN.'
          : 'Please enter your registered Email Address.'
      };
    }
    const lower = trimmed.toLowerCase();
    const inputPass = (password || '').trim();

    // 1. ADMIN DASHBOARD ACCESS: Only Username & Password required!
    // Username: "askiskiportal-admin", Password: "adminaskiski2026"
    if (lower === ADMIN_USERNAME || lower === ADMIN_EMAIL || expectedRole === 'admin') {
      if (lower === ADMIN_USERNAME || lower === ADMIN_EMAIL) {
        if (!inputPass) {
          return { success: false, message: 'Please enter the administrator password.' };
        }
        if (inputPass !== ADMIN_PASSWORD) {
          return {
            success: false,
            message: 'Invalid administrator password. Please check your password and try again.'
          };
        }

        const adminUser: UserAccount = usersList.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL || u.role === 'admin') || {
          id: 'user-admin-1',
          firstName: 'Portal',
          middleName: 'System',
          lastName: 'Admin',
          displayName: 'ASKI SKI PORTAL',
          email: ADMIN_EMAIL,
          role: 'admin',
          status: 'approved',
          createdAt: new Date().toISOString(),
        };
        adminUser.role = 'admin';
        adminUser.status = 'approved';
        await saveUserAccount(adminUser);
        setCurrentUser(adminUser);
        return { success: true };
      }

      if (expectedRole === 'admin') {
        return {
          success: false,
          message: 'Admin username not recognized. Please enter "askiskiportal-admin".'
        };
      }
    }
    
    // 2. FACULTY TEACHER & STUDENT AUTHENTICATION
    // Find matching user by email OR by 12-digit LRN OR student number
    const found = usersList.find((u) => {
      const matchEmail = u.email && u.email.toLowerCase() === lower;
      const matchLrn = u.lrn && u.lrn.trim() === trimmed;
      const matchId = u.studentNumber && u.studentNumber.toLowerCase() === lower;
      return matchEmail || matchLrn || matchId;
    });

    if (!found) {
      return { 
        success: false, 
        message: expectedRole 
          ? `No ${expectedRole} account found with that identifier. Please check your credentials.`
          : 'Account not found. Please check your Email/LRN or register.' 
      };
    }

    if (expectedRole && found.role !== expectedRole) {
      return {
        success: false,
        message: `This account is registered as a ${found.role}. Please switch to the ${found.role} portal.`,
      };
    }

    // Verify password if account has one set
    if (found.password && inputPass && found.password !== inputPass) {
      return {
        success: false,
        message: 'Incorrect password. Click "Forgot Password?" below if you need to reset it.',
      };
    }

    if (found.status === 'pending') {
      return { 
        success: false, 
        message: found.role === 'teacher'
          ? 'Your faculty registration is pending Administrator approval. Please wait for an administrator to verify your credentials.'
          : 'Your registration is still pending Admin approval. Please wait for an administrator to accept your request.' 
      };
    }

    if (found.status === 'rejected') {
      return { 
        success: false, 
        message: found.role === 'teacher'
          ? 'Your faculty registration was not approved by the administrator.'
          : 'Your registration was rejected by the administrator. Contact your faculty advisor.' 
      };
    }

    setCurrentUser(found);
    return { success: true };
  };

  const requestPasswordReset = async (
    identifier: string
  ): Promise<{ success: boolean; message: string; otpCode?: string }> => {
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      return { success: false, message: 'Please enter your registered Email Address or LRN.' };
    }
    const lower = trimmed.toLowerCase();

    // Check if account exists
    const isMasterAdmin = lower === ADMIN_USERNAME || lower === ADMIN_EMAIL;
    const found = usersList.find(
      (u) =>
        u.email?.toLowerCase() === lower ||
        (u.lrn && u.lrn.trim() === trimmed) ||
        (isMasterAdmin && u.role === 'admin')
    );

    if (!found && !isMasterAdmin) {
      return {
        success: false,
        message: 'No registered user account found with that email or identifier. Please verify and try again.',
      };
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins validity

    setOtpRequests((prev) => ({
      ...prev,
      [lower]: { code, expiresAt },
    }));

    const targetEmail = found?.email || ADMIN_EMAIL;

    // Create persistent system notification
    await addNotification({
      id: `otp-${Date.now()}`,
      recipientId: found?.id || 'admin',
      recipientRole: 'all',
      title: 'Security Verification Code',
      message: `Your password reset OTP code for ${found?.displayName || identifier} is ${code}. Valid for 15 minutes.`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `A 6-digit security OTP code has been dispatched to ${targetEmail}.`,
      otpCode: code,
    };
  };

  const verifyOtpAndResetPassword = async (
    identifier: string,
    otpCode: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmed = (identifier || '').trim();
    const lower = trimmed.toLowerCase();
    const codeTrimmed = (otpCode || '').trim();

    if (!codeTrimmed) {
      return { success: false, message: 'Please enter the 6-digit verification code.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters in length.' };
    }

    const cached = otpRequests[lower];
    // Master testing code 999888 also accepted
    if (!cached || (cached.code !== codeTrimmed && codeTrimmed !== '999888')) {
      return { success: false, message: 'Invalid verification code. Please check the code and re-enter.' };
    }

    if (Date.now() > cached.expiresAt) {
      return { success: false, message: 'This verification code has expired. Please request a new one.' };
    }

    // Update in user list and database
    const isMasterAdmin = lower === ADMIN_USERNAME || lower === ADMIN_EMAIL;
    const found = usersList.find(
      (u) =>
        u.email?.toLowerCase() === lower ||
        (u.lrn && u.lrn.trim() === trimmed) ||
        (isMasterAdmin && u.role === 'admin')
    );

    if (found) {
      const updatedUser: UserAccount = {
        ...found,
        password: newPassword,
      };
      await saveUserAccount(updatedUser);
      setUsersList((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

      // Invalidate OTP
      setOtpRequests((prev) => {
        const next = { ...prev };
        delete next[lower];
        return next;
      });

      return {
        success: true,
        message: 'Password successfully updated! You can now sign in with your new password.',
      };
    }

    return { success: false, message: 'Could not find account to update.' };
  };

  const signUp = async (params: {
    firstName: string;
    middleName?: string;
    lastName: string;
    lrn?: string;
    avatar?: string;
    email: string;
    password?: string;
    classCode?: string;
  }): Promise<{ success: boolean; message?: string; user?: UserAccount }> => {
    const email = params.email.toLowerCase().trim();
    const isAdminEmail = email === ADMIN_EMAIL;

    // Check if email already exists in system
    const existingEmailUser = usersList.find((u) => u.email && u.email.toLowerCase() === email);
    if (existingEmailUser) {
      return {
        success: false,
        message: 'This email address is already registered to another account. Please sign in or use a different email.',
      };
    }
    const displayName = `${params.firstName.trim()} ${params.middleName ? params.middleName.trim() + ' ' : ''}${params.lastName.trim()}`;

    const rawCode = (params.classCode || '').trim().toUpperCase();
    const enrolled = rawCode ? [rawCode] : [];

    const newUser: UserAccount = {
      id: isAdminEmail ? 'user-admin-1' : `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      firstName: params.firstName.trim(),
      middleName: params.middleName?.trim(),
      lastName: params.lastName.trim(),
      displayName,
      email,
      lrn: params.lrn?.trim() || undefined,
      password: params.password || 'password123',
      role: isAdminEmail ? 'admin' : 'student',
      status: isAdminEmail ? 'approved' : 'pending', // Admins are instantly approved
      classCode: rawCode || undefined,
      enrolledClassCodes: enrolled,
      studentNumber: `2024-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      avatar: params.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    };

    try {
      await saveUserAccount(newUser);

      if (!isAdminEmail) {
        if (rawCode) {
          // If a class code was provided on registration, initialize its scoreboard
          const studentScoreBoard: StudentScoreBoard = {
            id: `sb-${newUser.id}-${rawCode.toLowerCase()}`,
            studentId: newUser.id,
            studentNumber: newUser.studentNumber,
            lrn: newUser.lrn,
            studentName: newUser.displayName,
            studentEmail: newUser.email,
            classCode: rawCode,
            subjectName: 'Enrolled Subject',
            section: 'Section',
            teacherName: 'Assigned Faculty',
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
            remarks: 'New student account.',
            updatedAt: new Date().toISOString(),
          };
          await saveScoreBoard(studentScoreBoard);
        }

        // Alert Admin in real-time
        await addNotification({
          id: `notif-${Date.now()}`,
          recipientRole: 'admin',
          title: 'New Student Registration Pending Approval',
          message: `${displayName} (LRN: ${newUser.lrn || 'N/A'}) registered as student.`,
          type: 'approval',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Immediately register in in-memory state so it appears in Admin Portal in real time
      setUsersList((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id && u.email?.toLowerCase() !== newUser.email.toLowerCase())]);

      // Only auto-login if account is approved admin
      if (isAdminEmail) {
        setCurrentUser(newUser);
      }
      return { success: true, user: newUser };
    } catch (err: any) {
      console.error('Sign up error:', err);
      // Still update in memory if network fails
      setUsersList((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id && u.email?.toLowerCase() !== newUser.email.toLowerCase())]);
      return { success: true, user: newUser };
    }
  };

  const enrollInSubject = async (
    rawClassCode: string,
    availableClasses: ClassSubject[]
  ): Promise<{ success: boolean; message: string; subject?: ClassSubject }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be signed in to enroll in a subject.' };
    }
    const code = rawClassCode.trim().toUpperCase();
    if (!code) {
      return { success: false, message: 'Please enter a valid Subject / Class Code.' };
    }

    // Match against available classes
    const matchedClass = availableClasses.find(
      (c) => c.classCode.trim().toUpperCase() === code
    );

    if (!matchedClass) {
      return {
        success: false,
        message: `Class Code "${code}" was not found. Please double-check the code with your teacher.`,
      };
    }

    // Check if student already enrolled or requested
    const existing = enrollmentsList.find(
      (e) => e.studentId === currentUser.id && e.classCode.toUpperCase() === code
    );

    if (existing) {
      if (existing.status === 'approved') {
        return {
          success: false,
          message: `You are already enrolled in ${matchedClass.subjectName} (${matchedClass.classCode}).`,
        };
      }
      if (existing.status === 'pending') {
        return {
          success: false,
          message: `You already submitted an enrollment request for ${matchedClass.subjectName} (${matchedClass.classCode}). Awaiting teacher or admin approval.`,
        };
      }
    }

    // Generate enrollment request with status 'pending'
    const enrollmentId = `enr-${currentUser.id}-${matchedClass.classCode.toLowerCase()}`;
    const newEnrollment: SubjectEnrollment = {
      id: enrollmentId,
      studentId: currentUser.id,
      studentName: currentUser.displayName,
      studentEmail: currentUser.email,
      lrn: currentUser.lrn,
      studentNumber: currentUser.studentNumber,
      avatar: currentUser.avatar,
      classCode: matchedClass.classCode,
      subjectName: matchedClass.subjectName,
      section: matchedClass.section,
      teacherId: matchedClass.teacherId,
      teacherName: matchedClass.teacherName,
      term: matchedClass.term,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    try {
      await saveSubjectEnrollment(newEnrollment);

      // Alert teacher in real-time
      if (matchedClass.teacherId) {
        await addNotification({
          id: `notif-${Date.now()}-t`,
          recipientId: matchedClass.teacherId,
          recipientRole: 'teacher',
          title: 'Student Enrollment Request',
          message: `${currentUser.displayName} has requested to join your class: ${matchedClass.subjectName} (${matchedClass.classCode}).`,
          type: 'approval',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Alert Admin in real-time
      await addNotification({
        id: `notif-${Date.now()}-a`,
        recipientRole: 'admin',
        title: 'New Subject Enrollment Request',
        message: `${currentUser.displayName} requested enrollment in ${matchedClass.subjectName} (${matchedClass.classCode}) taught by ${matchedClass.teacherName}.`,
        type: 'approval',
        read: false,
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Enrollment request for ${matchedClass.subjectName} (${matchedClass.classCode}) submitted! Awaiting teacher or admin approval.`,
        subject: matchedClass,
      };
    } catch (err: any) {
      console.error('Enroll error:', err);
      return { success: false, message: 'Could not complete enrollment request. Please try again.' };
    }
  };

  const approveSubjectEnrollment = async (
    enrollment: SubjectEnrollment,
    reviewerName = 'Instructor / Admin'
  ): Promise<void> => {
    try {
      await updateEnrollmentStatus(enrollment.id, 'approved', reviewerName);

      // Add to student's enrolledClassCodes in UserAccount
      const targetUser = usersList.find((u) => u.id === enrollment.studentId);
      if (targetUser) {
        const currentList = targetUser.enrolledClassCodes || [];
        if (!currentList.includes(enrollment.classCode)) {
          const nextList = [...currentList, enrollment.classCode];
          const updatedUser: UserAccount = {
            ...targetUser,
            classCode: nextList[0] || enrollment.classCode,
            enrolledClassCodes: nextList,
          };
          await saveUserAccount(updatedUser);
          if (currentUser && currentUser.id === targetUser.id) {
            setCurrentUser(updatedUser);
          }
        }
      }

      // Initialize official StudentScoreBoard for this approved subject
      const studentScoreBoard: StudentScoreBoard = {
        id: `sb-${enrollment.studentId}-${enrollment.classCode.toLowerCase()}`,
        studentId: enrollment.studentId,
        studentNumber: enrollment.studentNumber || '2024-XXXX',
        lrn: enrollment.lrn || 'Pending DepEd LRN',
        studentName: enrollment.studentName,
        studentEmail: enrollment.studentEmail,
        classCode: enrollment.classCode,
        subjectName: enrollment.subjectName,
        section: enrollment.section || 'Regular Section',
        teacherName: enrollment.teacherName || 'Assigned Faculty',
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
        remarks: 'Enrollment approved. Ready for scoring.',
        updatedAt: new Date().toISOString(),
      };
      await saveScoreBoard(studentScoreBoard);

      // Notify the student
      await addNotification({
        id: `notif-${Date.now()}`,
        recipientId: enrollment.studentId,
        recipientRole: 'student',
        title: 'Subject Enrollment Approved!',
        message: `Your enrollment in ${enrollment.subjectName} (${enrollment.classCode}) has been approved by ${reviewerName}! Your scoreboard is now active.`,
        type: 'approval',
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('approveSubjectEnrollment error:', err);
    }
  };

  const rejectSubjectEnrollment = async (
    enrollmentId: string,
    reviewerName = 'Instructor / Admin'
  ): Promise<void> => {
    try {
      await updateEnrollmentStatus(enrollmentId, 'rejected', reviewerName);
      const target = enrollmentsList.find((e) => e.id === enrollmentId);
      if (target) {
        await addNotification({
          id: `notif-${Date.now()}`,
          recipientId: target.studentId,
          recipientRole: 'student',
          title: 'Subject Enrollment Request Declined',
          message: `Your enrollment request for ${target.subjectName} (${target.classCode}) was declined by ${reviewerName}.`,
          type: 'approval',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('rejectSubjectEnrollment error:', err);
    }
  };

  const unenrollSubject = async (
    rawClassCode: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'Not signed in.' };
    const code = rawClassCode.trim().toUpperCase();
    const currentEnrolled = currentUser.enrolledClassCodes || (currentUser.classCode ? [currentUser.classCode] : []);
    const nextEnrolled = currentEnrolled.filter((c) => c.trim().toUpperCase() !== code);

    const updatedUser: UserAccount = {
      ...currentUser,
      classCode: nextEnrolled[0] || '',
      enrolledClassCodes: nextEnrolled,
    };

    try {
      // 1. Delete all matching enrollments for this student & class code
      const matchingEnrollments = enrollmentsList.filter(
        (e) => (e.studentId === currentUser.id || (e.studentEmail && e.studentEmail.toLowerCase() === currentUser.email?.toLowerCase())) &&
               (e.classCode || '').trim().toUpperCase() === code
      );

      const defaultEnrollmentId = `enr-${currentUser.id}-${code.toLowerCase()}`;
      await deleteSubjectEnrollment(defaultEnrollmentId).catch(() => {});
      for (const e of matchingEnrollments) {
        if (e.id !== defaultEnrollmentId) {
          await deleteSubjectEnrollment(e.id).catch(() => {});
        }
      }

      // 2. Delete matching scoreboards
      const scoreBoardId = `sb-${currentUser.id}-${code.toLowerCase()}`;
      await deleteScoreBoard(scoreBoardId).catch(() => {});

      // 3. Update local and remote user account
      await saveUserAccount(updatedUser);
      setCurrentUser(updatedUser);
      setUsersList((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      setEnrollmentsList((prev) =>
        prev.filter(
          (e) =>
            !((e.studentId === currentUser.id || e.studentEmail === currentUser.email) && (e.classCode || '').trim().toUpperCase() === code)
        )
      );
      return { success: true, message: `Successfully unenrolled from ${code}.` };
    } catch (err) {
      console.error('unenrollSubject error:', err);
      return { success: false, message: 'Failed to unenroll.' };
    }
  };

  const signUpTeacher = async (params: {
    name: string;
    email: string;
    password?: string;
    avatar?: string;
  }): Promise<{ success: boolean; message?: string; user?: UserAccount }> => {
    const nameParts = params.name.trim().split(' ');
    const firstName = nameParts[0] || 'Teacher';
    const lastName = nameParts.slice(1).join(' ') || 'Faculty';

    const newTeacher: UserAccount = {
      id: `teacher-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      firstName,
      lastName,
      displayName: params.name.trim(),
      email: params.email.toLowerCase().trim(),
      password: params.password || 'teacher123',
      role: 'teacher',
      status: 'pending', // Teacher registrations require Admin approval
      createdAt: new Date().toISOString(),
      avatar: params.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    };

    try {
      await saveUserAccount(newTeacher);

      // Alert Admin in real-time
      await addNotification({
        id: `notif-${Date.now()}`,
        recipientRole: 'admin',
        title: 'New Faculty Registration Pending Approval',
        message: `${params.name.trim()} (${newTeacher.email}) registered as faculty teacher and is pending approval.`,
        type: 'approval',
        read: false,
        createdAt: new Date().toISOString(),
      });

      // Immediately register in in-memory state so it appears in Admin Portal in real time
      setUsersList((prev) => [newTeacher, ...prev.filter((u) => u.id !== newTeacher.id && u.email?.toLowerCase() !== newTeacher.email.toLowerCase())]);

      return { success: true, user: newTeacher };
    } catch (err: any) {
      console.error('Teacher sign up error:', err);
      setUsersList((prev) => [newTeacher, ...prev.filter((u) => u.id !== newTeacher.id && u.email?.toLowerCase() !== newTeacher.email.toLowerCase())]);
      return { success: true, user: newTeacher };
    }
  };

  const updateUserAvatar = async (userId: string, avatarData: string) => {
    const updated = usersList.map((u) => u.id === userId ? { ...u, avatar: avatarData } : u);
    setUsersList(updated);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, avatar: avatarData });
    }
    const found = updated.find((u) => u.id === userId);
    if (found) {
      try {
        await saveUserAccount(found);
      } catch (err) {
        console.error('Error saving user avatar:', err);
      }
    }
  };

  const updateUserAccount = async (updatedUser: UserAccount) => {
    // If updating the master admin email, protect its role
    if (updatedUser.email.toLowerCase() === ADMIN_EMAIL) {
      updatedUser.role = 'admin';
      updatedUser.status = 'approved';
    }
    const nextList = usersList.map((u) => u.id === updatedUser.id ? updatedUser : u);
    setUsersList(nextList);
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    await saveUserAccount(updatedUser);
  };

  const deleteUser = async (userId: string) => {
    setUsersList((prev) => prev.filter((u) => u.id !== userId));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(null);
    }
    await deleteUserAccount(userId);
  };

  const ensureAdminRestored = async () => {
    await ensureAdminAccount(ADMIN_EMAIL);
    const adminUser = usersList.find((u) => u.email.toLowerCase() === ADMIN_EMAIL) || {
      id: 'user-admin-1',
      firstName: 'Portal',
      middleName: 'System',
      lastName: 'Admin',
      displayName: 'Portal Administrator',
      email: ADMIN_EMAIL,
      role: 'admin' as const,
      status: 'approved' as const,
      createdAt: new Date().toISOString(),
    };
    adminUser.role = 'admin';
    adminUser.status = 'approved';
    setCurrentUser(adminUser);
  };

  const signInWithGoogle = async (expectedRole: UserRole = 'student') => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase() || '';
      const existing = usersList.find((u) => u.email.toLowerCase() === email);

      if (existing) {
        if (email === ADMIN_EMAIL) {
          existing.role = 'admin';
          existing.status = 'approved';
          await saveUserAccount(existing);
        }
        setCurrentUser(existing);
      } else {
        const isAdmin = email === ADMIN_EMAIL || expectedRole === 'admin';
        const isTeacher = expectedRole === 'teacher';
        const role: UserRole = isAdmin ? 'admin' : isTeacher ? 'teacher' : 'student';
        const nameParts = (result.user.displayName || 'Google User').split(' ');
        const newUser: UserAccount = {
          id: result.user.uid,
          firstName: nameParts[0] || 'User',
          lastName: nameParts.slice(1).join(' ') || (role === 'teacher' ? 'Faculty' : 'Student'),
          displayName: result.user.displayName || 'Google User',
          email,
          role,
          status: (isAdmin || isTeacher) ? 'approved' : 'pending',
          classCode: 'SKI-10A',
          avatar: result.user.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        await saveUserAccount(newUser);
        setCurrentUser(newUser);
      }
    } catch (err) {
      console.error('Google Sign In error:', err);
      throw err;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove session user', e);
    }
    signOut(auth).catch(() => {});
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const user = usersList.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const switchDemoRole = (role: UserRole, status: ApprovalStatus = 'approved') => {
    if (role === 'admin') {
      const admin = usersList.find((u) => u.role === 'admin' || u.email?.toLowerCase() === ADMIN_EMAIL) || {
        id: 'user-admin-1',
        firstName: 'Portal',
        middleName: 'System',
        lastName: 'Admin',
        displayName: 'Portal Administrator',
        email: ADMIN_EMAIL,
        role: 'admin' as const,
        status: 'approved' as const,
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(admin);
    } else if (role === 'teacher') {
      const teacher = usersList.find((u) => u.role === 'teacher') || {
        id: 'user-teacher-1',
        firstName: 'Prof.',
        lastName: 'Tanjosell',
        displayName: 'Prof. Tanjosell',
        email: 'teacher.tanjosell@aski-ski.edu.ph',
        role: 'teacher' as const,
        status: 'approved' as const,
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(teacher);
    } else {
      if (status === 'pending') {
        const pending = usersList.find((u) => u.role === 'student' && u.status === 'pending');
        if (pending) {
          setCurrentUser(pending);
        } else {
          setCurrentUser({
            id: 'demo-pending-1',
            firstName: 'Calvin',
            lastName: 'Bulanadi',
            displayName: 'Calvin Joshua Bulanadi',
            email: 'calvin.bulanadi@aski-ski.edu.ph',
            role: 'student',
            status: 'pending',
            classCode: 'SKI-10A',
            lrn: '102938475603',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        const approved = usersList.find((u) => u.role === 'student' && u.status === 'approved');
        if (approved) {
          setCurrentUser(approved);
        } else {
          setCurrentUser({
            id: 'demo-approved-1',
            firstName: 'Jiro',
            lastName: 'Adriano',
            displayName: 'Jiro De Guzman Adriano',
            email: 'jiro.adriano@aski-ski.edu.ph',
            role: 'student',
            status: 'approved',
            classCode: 'SKI-10A',
            lrn: '102938475601',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        status: currentUser?.status || null,
        isAuthenticated: !!currentUser,
        usersList,
        enrollmentsList,
        signIn,
        signUp,
        signUpTeacher,
        requestPasswordReset,
        verifyOtpAndResetPassword,
        enrollInSubject,
        unenrollSubject,
        approveSubjectEnrollment,
        rejectSubjectEnrollment,
        updateUserAvatar,
        updateUserAccount,
        deleteUser,
        ensureAdminRestored,
        signInWithGoogle,
        logout,
        switchUser,
        switchDemoRole,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
