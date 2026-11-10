import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { AskiLogo } from './AskiLogo';
import { 
  Bell, 
  LogOut, 
  ShieldCheck, 
  BookOpen, 
  Check, 
  ChevronDown, 
  Sparkles,
  School,
  Trash2
} from 'lucide-react';
import { markNotificationAsRead, clearAllNotifications } from '../services/dbService';

interface HeaderProps {
  notifications: AppNotification[];
}

export const Header: React.FC<HeaderProps> = ({ notifications }) => {
  const { currentUser, role, logout } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Filter relevant notifications
  const userNotifications = notifications.filter((n) => {
    if (role === 'admin') return true;
    if (n.recipientId && n.recipientId === currentUser?.id) return true;
    if (n.recipientRole === 'all') return true;
    if (n.recipientRole === role) return true;
    return false;
  });

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-black/[0.06] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & School Branding */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <AskiLogo size="sm" />
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-bold text-sm sm:text-lg tracking-tight text-slate-900 truncate">
                ASKI SKI Portal
              </span>
              <span className={`text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                role === 'admin'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                  : role === 'teacher'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300/60'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300/60'
              }`}>
                {role === 'admin' ? 'ADMIN' : role === 'teacher' ? 'FACULTY' : 'STUDENT'}
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            {/* Notification Bar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition border border-slate-200"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                )}
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white"></span>
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-[#0b3b60]" />
                      <h4 className="font-bold text-xs text-slate-900">
                        Notifications ({userNotifications.length})
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {unreadCount} new
                        </span>
                      )}
                      {userNotifications.length > 0 && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Clear all notifications?')) {
                              await clearAllNotifications(currentUser?.id, role || undefined);
                            }
                          }}
                          className="apple-tap text-[10px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                          title="Clear all notifications"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear All</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {userNotifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        No notifications currently.
                      </p>
                    ) : (
                      userNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-2.5 rounded-xl cursor-pointer text-xs transition ${
                            !n.read
                              ? 'bg-blue-50/70 border border-blue-200'
                              : 'bg-slate-50 hover:bg-slate-100 border border-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[#0b3b60]">
                            <span>{n.title}</span>
                            <span className="text-[9px] text-slate-400 font-normal">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin: No profile like James Dela Cruz Tan, just simple signout */}
            {role === 'admin' ? (
              <div className="flex items-center pl-2 border-l border-slate-200">
                <button
                  onClick={logout}
                  className="apple-tap flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-bold transition border border-slate-200/70"
                  title="Sign Out of ASKI SKI PORTAL"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              /* Student & Faculty Teacher Profile */
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                {currentUser?.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0b3b60] text-amber-300 font-bold text-xs flex items-center justify-center border-2 border-amber-400">
                    {currentUser?.displayName?.charAt(0) || 'U'}
                  </div>
                )}

                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                    {currentUser?.displayName}
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="apple-tap p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                  title="Sign Out / Switch Account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
