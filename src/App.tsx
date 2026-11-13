import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { StudentScoreBoardView } from './components/StudentScoreBoardView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { SpreadsheetUploadModal } from './components/SpreadsheetUploadModal';
import { 
  ClassSubject, 
  StudentScoreBoard, 
  BroadcastNote, 
  AppNotification 
} from './types';
import { 
  subscribeToClasses, 
  subscribeToScoreBoards, 
  subscribeToBroadcasts, 
  subscribeToNotifications, 
  seedInitialDatabaseIfEmpty 
} from './services/dbService';
import { 
  INITIAL_CLASSES, 
  INITIAL_SCOREBOARDS, 
  INITIAL_BROADCASTS, 
  INITIAL_NOTIFICATIONS 
} from './data/mockData';
import { AskiLogo } from './components/AskiLogo';
import { CheckCircle2 } from 'lucide-react';

function AppContent() {
  const { currentUser, role, usersList } = useAuth();

  const [classes, setClasses] = useState<ClassSubject[]>(() => {
    try {
      const saved = localStorage.getItem('aski_portal_classes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_CLASSES;
  });

  const [scoreboards, setScoreboards] = useState<StudentScoreBoard[]>(() => {
    try {
      const saved = localStorage.getItem('aski_portal_scoreboards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_SCOREBOARDS;
  });

  const [broadcasts, setBroadcasts] = useState<BroadcastNote[]>(() => {
    try {
      const saved = localStorage.getItem('aski_portal_broadcasts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_BROADCASTS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('aski_portal_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_NOTIFICATIONS;
  });

  // Sync state to local cache
  useEffect(() => {
    try {
      localStorage.setItem('aski_portal_classes', JSON.stringify(classes));
    } catch {}
  }, [classes]);

  useEffect(() => {
    try {
      localStorage.setItem('aski_portal_scoreboards', JSON.stringify(scoreboards));
    } catch {}
  }, [scoreboards]);

  useEffect(() => {
    try {
      localStorage.setItem('aski_portal_broadcasts', JSON.stringify(broadcasts));
    } catch {}
  }, [broadcasts]);

  useEffect(() => {
    try {
      localStorage.setItem('aski_portal_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadClassCode, setUploadClassCode] = useState('SKI-10A');
  const [uploadSubjectName, setUploadSubjectName] = useState('Mathematics 10');
  const [uploadScope, setUploadScope] = useState<any>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    const handleClearLocalNotifs = (evt: any) => {
      const { userId, role: userRole } = evt?.detail || {};
      setNotifications((prev) =>
        prev.filter((n) => {
          if (userId && n.recipientId && n.recipientId === userId) return false;
          if (userRole && n.recipientRole && (n.recipientRole === userRole || n.recipientRole === 'all')) return false;
          if (!n.recipientId && (!n.recipientRole || n.recipientRole === 'all')) return false;
          return false; // clear matching notifications
        })
      );
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    window.addEventListener('clear-local-notifications', handleClearLocalNotifs as any);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuota);
      window.removeEventListener('clear-local-notifications', handleClearLocalNotifs as any);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let unsubClasses: (() => void) | undefined;
    let unsubScoreboards: (() => void) | undefined;
    let unsubBroadcasts: (() => void) | undefined;
    let unsubNotifications: (() => void) | undefined;

    const init = async () => {
      // 1. Seed initial database if empty in Firestore
      await seedInitialDatabaseIfEmpty();
      if (!active) return;

      // 2. Real-time listeners (allow empty arrays so deleting the last item syncs properly)
      unsubClasses = subscribeToClasses((live) => {
        setClasses(live);
      });

      unsubScoreboards = subscribeToScoreBoards((live) => {
        setScoreboards(live);
      });

      unsubBroadcasts = subscribeToBroadcasts((live) => {
        setBroadcasts(live);
      });

      unsubNotifications = subscribeToNotifications((live) => {
        setNotifications(live);
      });
    };

    init();

    return () => {
      active = false;
      unsubClasses?.();
      unsubScoreboards?.();
      unsubBroadcasts?.();
      unsubNotifications?.();
    };
  }, []);

  const handleOpenUploadModal = (classCode: string, subjectName: string, scope: any = 'ALL') => {
    setUploadClassCode(classCode);
    setUploadSubjectName(subjectName);
    setUploadScope(scope);
    setIsUploadOpen(true);
  };

  const handleUploadSuccess = (count: number) => {
    setToastMessage(`Successfully uploaded and synced ${count} student scoreboards in real time!`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // If user is not logged in, take them straight to the Login / Sign Up portal!
  if (!currentUser) {
    return <AuthScreen classes={classes} />;
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] text-[#1c1c1e] flex flex-col font-sans transition-colors selection:bg-[#007AFF] selection:text-white">
      {/* Quota Exceeded Warning Banner */}
      {quotaExceeded && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b border-amber-600 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <span className="font-bold uppercase tracking-wider bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-[10px]">
              Quota Exceeded
            </span>
            <span>
              Daily Firestore read units limit reached. Quota resets daily. To manage or upgrade your project quota, visit the{' '}
              <a
                href="https://console.firebase.google.com/project/gen-lang-client-0435487875/firestore/databases/ai-studio-edupulsestudenta-94f992e0-e1f1-47b2-abca-c2618bb3f4dd/data?openUpgradeDialog=true"
                target="_blank"
                rel="noreferrer"
                className="underline font-bold hover:text-slate-900"
              >
                Firebase Console Database Upgrade Settings
              </a>.
            </span>
          </div>
        </div>
      )}

      {/* Toast Notification (iOS Dynamic Pill Style) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#1c1c1e]/90 backdrop-blur-xl text-white shadow-2xl border border-white/10 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Header with notification bar */}
      <Header notifications={notifications} />

      {/* Body Content based on role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {role === 'admin' && (
          <AdminDashboardView
            users={usersList}
            classes={classes}
            scoreboards={scoreboards}
          />
        )}

        {role === 'teacher' && (
          <TeacherDashboardView
            classes={classes}
            scoreboards={scoreboards}
            broadcasts={broadcasts}
            onOpenUploadModal={handleOpenUploadModal}
          />
        )}

        {role === 'student' && (
          <StudentScoreBoardView scoreBoards={scoreboards} classes={classes} />
        )}
      </main>

      {/* Footer: Strictly only Transformation Discipline Excellence */}
      <footer className="mt-auto py-8 print:hidden select-none text-center">
        <p className="text-xs tracking-widest text-slate-400 font-medium uppercase">
          Transformation Discipline Excellence
        </p>
      </footer>

      {/* Spreadsheet Upload Modal */}
      <SpreadsheetUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
        classCode={uploadClassCode}
        subjectName={uploadSubjectName}
        teacherName={currentUser.displayName}
        existingScoreboards={scoreboards}
        initialScope={uploadScope}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
