import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  UserAccount, 
  ClassSubject, 
  StudentScoreBoard, 
  BroadcastNote, 
  AppNotification,
  SubjectEnrollment 
} from '../types';
import { 
  INITIAL_CLASSES, 
  INITIAL_USERS, 
  INITIAL_SCOREBOARDS, 
  INITIAL_BROADCASTS, 
  INITIAL_NOTIFICATIONS 
} from '../data/mockData';

const USERS_COL = 'users';
const CLASSES_COL = 'classes';
const SCOREBOARDS_COL = 'studentScores';
const BROADCASTS_COL = 'broadcasts';
const NOTIFICATIONS_COL = 'notifications';
const ENROLLMENTS_COL = 'subjectEnrollments';

/**
 * Recursively strips undefined fields so Firestore setDoc / updateDoc never throws Unsupported field value: undefined.
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        cleaned[key] = cleanFirestoreData(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

// --- Users (Auth / Directory / Approvals) ---
export function subscribeToUsers(
  onData: (users: UserAccount[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, USERS_COL),
    (snapshot) => {
      const items: UserAccount[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as UserAccount);
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, USERS_COL);
      } catch (e) {
        if (onError) onError(e);
      }
    }
  );
}

export async function saveUserAccount(user: UserAccount): Promise<void> {
  try {
    const docRef = doc(db, USERS_COL, user.id);
    const cleaned = cleanFirestoreData(user);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COL}/${user.id}`);
  }
}

export async function updateUserStatus(userId: string, status: 'approved' | 'rejected'): Promise<void> {
  try {
    const docRef = doc(db, USERS_COL, userId);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COL, userId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${USERS_COL}/${userId}`);
  }
}

// --- Classes / Subjects ---
export function subscribeToClasses(
  onData: (classes: ClassSubject[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, CLASSES_COL),
    (snapshot) => {
      const items: ClassSubject[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as ClassSubject);
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, CLASSES_COL);
      } catch (e) {
        if (onError) onError(e);
      }
    }
  );
}

export async function saveClassSubject(classObj: ClassSubject): Promise<void> {
  try {
    const docRef = doc(db, CLASSES_COL, classObj.id);
    const cleaned = cleanFirestoreData(classObj);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CLASSES_COL}/${classObj.id}`);
  }
}

export async function deleteClassSubject(classId: string): Promise<void> {
  try {
    const docRef = doc(db, CLASSES_COL, classId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CLASSES_COL}/${classId}`);
  }
}

// --- Student Score Boards ---
export function subscribeToScoreBoards(
  onData: (scoreboards: StudentScoreBoard[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, SCOREBOARDS_COL),
    (snapshot) => {
      const items: StudentScoreBoard[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as StudentScoreBoard);
      });
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, SCOREBOARDS_COL);
      } catch (e) {
        if (onError) onError(e);
      }
    }
  );
}

export async function saveScoreBoard(scoreBoard: StudentScoreBoard): Promise<void> {
  try {
    const docRef = doc(db, SCOREBOARDS_COL, scoreBoard.id);
    const cleaned = cleanFirestoreData(scoreBoard);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SCOREBOARDS_COL}/${scoreBoard.id}`);
  }
}

export async function saveBatchScoreBoards(scoreboards: StudentScoreBoard[]): Promise<void> {
  if (scoreboards.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const sb of scoreboards) {
      const docRef = doc(db, SCOREBOARDS_COL, sb.id);
      batch.set(docRef, cleanFirestoreData(sb), { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SCOREBOARDS_COL);
  }
}

export async function deleteScoreBoard(id: string): Promise<void> {
  try {
    const docRef = doc(db, SCOREBOARDS_COL, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SCOREBOARDS_COL}/${id}`);
  }
}

// --- Broadcasts ---
export function subscribeToBroadcasts(
  onData: (broadcasts: BroadcastNote[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, BROADCASTS_COL),
    (snapshot) => {
      const items: BroadcastNote[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as BroadcastNote);
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, BROADCASTS_COL);
      } catch (e) {
        if (onError) onError(e);
      }
    }
  );
}

export async function saveBroadcast(broadcast: BroadcastNote): Promise<void> {
  try {
    const docRef = doc(db, BROADCASTS_COL, broadcast.id);
    const cleaned = cleanFirestoreData(broadcast);
    await setDoc(docRef, cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BROADCASTS_COL}/${broadcast.id}`);
  }
}

export async function deleteBroadcast(broadcastId: string): Promise<void> {
  try {
    const docRef = doc(db, BROADCASTS_COL, broadcastId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BROADCASTS_COL}/${broadcastId}`);
  }
}

// --- Notifications ---
export function subscribeToNotifications(
  onData: (notifications: AppNotification[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, NOTIFICATIONS_COL),
    (snapshot) => {
      const items: AppNotification[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as AppNotification);
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, NOTIFICATIONS_COL);
      } catch (e) {
        if (onError) onError(e);
      }
    }
  );
}

export async function addNotification(notification: AppNotification): Promise<void> {
  try {
    const docRef = doc(db, NOTIFICATIONS_COL, notification.id);
    const cleaned = cleanFirestoreData(notification);
    await setDoc(docRef, cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${NOTIFICATIONS_COL}/${notification.id}`);
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, NOTIFICATIONS_COL, notificationId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${NOTIFICATIONS_COL}/${notificationId}`);
  }
}

// --- Subject Enrollments (Class Joining & Approvals) ---
export function subscribeToEnrollments(
  onData: (enrollments: SubjectEnrollment[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, ENROLLMENTS_COL),
    (snapshot) => {
      const items: SubjectEnrollment[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as SubjectEnrollment);
      });
      items.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, ENROLLMENTS_COL);
      } catch (e) {
        if (onError) onError(e);
      }
    }
  );
}

export async function saveSubjectEnrollment(enrollment: SubjectEnrollment): Promise<void> {
  try {
    const docRef = doc(db, ENROLLMENTS_COL, enrollment.id);
    const cleaned = cleanFirestoreData(enrollment);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ENROLLMENTS_COL}/${enrollment.id}`);
  }
}

export async function updateEnrollmentStatus(
  enrollmentId: string, 
  status: 'approved' | 'rejected',
  reviewerName?: string
): Promise<void> {
  try {
    const docRef = doc(db, ENROLLMENTS_COL, enrollmentId);
    await updateDoc(docRef, { 
      status, 
      reviewedAt: new Date().toISOString(),
      ...(reviewerName ? { reviewedBy: reviewerName } : {})
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ENROLLMENTS_COL}/${enrollmentId}`);
  }
}

export async function deleteSubjectEnrollment(enrollmentId: string): Promise<void> {
  try {
    const docRef = doc(db, ENROLLMENTS_COL, enrollmentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ENROLLMENTS_COL}/${enrollmentId}`);
  }
}

// --- Initial Database Seeding ---
export async function seedInitialDatabaseIfEmpty(): Promise<boolean> {
  try {
    const usersSnap = await getDocs(collection(db, USERS_COL));
    if (!usersSnap.empty) {
      return false; // already populated
    }

    const batch = writeBatch(db);

    for (const u of INITIAL_USERS) {
      batch.set(doc(db, USERS_COL, u.id), u);
    }
    for (const c of INITIAL_CLASSES) {
      batch.set(doc(db, CLASSES_COL, c.id), c);
    }
    for (const sb of INITIAL_SCOREBOARDS) {
      batch.set(doc(db, SCOREBOARDS_COL, sb.id), sb);
    }
    for (const b of INITIAL_BROADCASTS) {
      batch.set(doc(db, BROADCASTS_COL, b.id), b);
    }
    for (const n of INITIAL_NOTIFICATIONS) {
      batch.set(doc(db, NOTIFICATIONS_COL, n.id), n);
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Initial seeding note:', error);
    return false;
  }
}

export async function ensureAdminAccount(adminEmail = 'tanjosell.lpt@gmail.com'): Promise<void> {
  try {
    const snap = await getDocs(collection(db, USERS_COL));
    let found = false;
    for (const d of snap.docs) {
      const data = d.data() as UserAccount;
      if (data.email?.toLowerCase() === adminEmail.toLowerCase()) {
        found = true;
        // Fix account to be Admin and Approved
        if (data.role !== 'admin' || data.status !== 'approved') {
          await updateDoc(doc(db, USERS_COL, d.id), {
            role: 'admin',
            status: 'approved',
          });
        }
      }
    }
    if (!found) {
      const adminUser: UserAccount = {
        id: 'user-admin-1',
        firstName: 'Portal',
        middleName: 'System',
        lastName: 'Admin',
        displayName: 'Portal Administrator',
        email: adminEmail,
        role: 'admin',
        status: 'approved',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, USERS_COL, adminUser.id), adminUser);
    }
  } catch (err) {
    console.warn('ensureAdminAccount notice:', err);
  }
}
