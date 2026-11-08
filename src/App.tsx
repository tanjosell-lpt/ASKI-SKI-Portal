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

  const [classes, setClasses] = useState<ClassSubject[]>(INITIAL_CLASSES);
  const [scoreboards, setScoreboards] = useState<StudentScoreBoard[]>(INITIAL_SCOREBOARDS);
  const [broadcasts, setBroadcasts] = useState<BroadcastNote[]>(INITIAL_BROADCASTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadClassCode, setUploadClassCode] = useState('SKI-10A');
  const [uploadSubjectName, setUploadSubjectName] = useState('Mathematics 10');
  const [uploadScope, setUploadScope] = useState<any>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Seed initial database if empty in Firestore
    seedInitialDatabaseIfEmpty();

    // 2. Real-time listeners
    const unsubClasses = subscribeToClasses((live) => {
      if (live.length > 0) setClasses(live);
    });

    const unsubScoreboards = subscribeToScoreBoards((live) => {
      if (live.length > 0) setScoreboards(live);
    });

    const unsubBroadcasts = subscribeToBroadcasts((live) => {
      if (live.length > 0) setBroadcasts(live);
    });

    const unsubNotifications = subscribeToNotifications((live) => {
      if (live.length > 0) setNotifications(live);
    });

    return () => {
      unsubClasses();
      unsubScoreboards();
      unsubBroadcasts();
      unsubNotifications();
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
