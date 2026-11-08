import React, { useState, useRef } from 'react';
import {
  Home,
  Hash,
  Bookmark,
  MessageSquare,
  User as UserIcon,
  Feather,
  LogOut,
  LogIn,
  UserPlus,
  CalendarClock,
  Bell,
  Settings,
} from 'lucide-react';
import { User } from '../types';

export type NavTab = 'home' | 'explore' | 'notifications' | 'messages' | 'bookmarks' | 'profile' | 'settings';

interface NavbarProps {
  currentUser: User | null;
  activeNav: NavTab;
  unreadCount?: number;
  unreadNotificationsCount?: number;
  scheduledCount?: number;
  onNavChange: (nav: NavTab) => void;
  onOpenAuth: (initialTab: 'login' | 'signup') => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile: (handle: string) => void;
  onRequestNewPost: () => void;
  onOpenScheduledModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeNav,
  unreadCount = 0,
  unreadNotificationsCount = 0,
  scheduledCount = 0,
  onNavChange,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  onOpenProfile,
  onRequestNewPost,
  onOpenScheduledModal,
}) => {
  const logoClicksRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [logoPinging, setLogoPinging] = useState(false);

  const handleLogoSecretClick = () => {
    logoClicksRef.current += 1;
    if (logoClicksRef.current >= 3) {
      logoClicksRef.current = 0;
      setLogoPinging(false);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (onOpenAdmin) onOpenAdmin();
      return;
    }

    setLogoPinging(true);
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      logoClicksRef.current = 0;
      setLogoPinging(false);
    }, 1800);
  };

  return (
    <>
      {/* Desktop Left Navigation Rail */}
      <nav className="w-64 shrink-0 hidden md:flex flex-col justify-between h-screen sticky top-0 py-5 px-3 border-r border-slate-800/80 bg-slate-950/70 select-none">
        <div className="space-y-6">
          {/* Brand Logo - Secret 3-click trigger to access Admin */}
          <div
            onClick={handleLogoSecretClick}
            className="flex items-center gap-3 px-3 cursor-pointer group select-none"
            title="PulseX Decentral Network"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 active:scale-95 transition-transform relative">
              ⚡
              {logoPinging && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">PulseX</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                Decentral Network
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <button
              onClick={() => onNavChange('home')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                activeNav === 'home'
                  ? 'bg-blue-600/15 text-blue-400 font-bold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home Feed</span>
            </button>

            <button
              onClick={() => onNavChange('explore')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                activeNav === 'explore'
                  ? 'bg-blue-600/15 text-blue-400 font-bold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Hash className="w-5 h-5" />
              <span>Explore &amp; Tags</span>
            </button>

            <button
              onClick={() => onNavChange('notifications')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                activeNav === 'notifications'
                  ? 'bg-blue-600/15 text-blue-400 font-bold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-slate-950 animate-pulse" />
                  )}
                </div>
                <span>Notifications</span>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-indigo-600 text-white rounded-full shadow-sm shadow-indigo-600/40">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavChange('bookmarks')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                activeNav === 'bookmarks'
                  ? 'bg-blue-600/15 text-blue-400 font-bold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Bookmark className="w-5 h-5" />
              <span>Bookmarks</span>
            </button>

            <button
              onClick={() => onNavChange('messages')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                activeNav === 'messages'
                  ? 'bg-blue-600/15 text-blue-400 font-bold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <MessageSquare className="w-5 h-5" />
                <span>Messages</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-blue-600 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {currentUser && (
              <button
                onClick={() => onNavChange('profile')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                  activeNav === 'profile'
                    ? 'bg-blue-600/15 text-blue-400 font-bold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <UserIcon className="w-5 h-5" />
                <span>Full Profile</span>
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => onNavChange('settings')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                  activeNav === 'settings'
                    ? 'bg-blue-600/15 text-blue-400 font-bold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
            )}

            {currentUser && onOpenScheduledModal && (
              <button
                onClick={onOpenScheduledModal}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <CalendarClock className="w-5 h-5 text-indigo-400 group-hover:scale-105 transition-transform" />
                  <span>Scheduled</span>
                </div>
                {scheduledCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-full">
                    {scheduledCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* New Post Primary Button */}
          <button
            onClick={onRequestNewPost}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 transition-all text-sm flex items-center justify-center gap-2 active:scale-98"
          >
            <Feather className="w-4 h-4" />
            <span>Publish Post</span>
          </button>
        </div>

        {/* User Card or Auth CTA */}
        <div className="pt-4 border-t border-slate-800/80">
          {currentUser ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <button
                onClick={() => onNavChange('profile')}
                className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <img
                  src={currentUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                  alt={currentUser.fullName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                />
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">{currentUser.fullName}</div>
                  <div className="text-[11px] text-blue-400 font-mono truncate">{currentUser.nickName}</div>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => onOpenAuth('signup')}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </button>
              <button
                onClick={() => onOpenAuth('login')}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => onNavChange('home')}
          className={`p-2.5 rounded-xl ${activeNav === 'home' ? 'text-blue-400' : 'text-slate-400'}`}
        >
          <Home className="w-5 h-5" />
        </button>

        <button
          onClick={() => onNavChange('explore')}
          className={`p-2.5 rounded-xl ${activeNav === 'explore' ? 'text-blue-400' : 'text-slate-400'}`}
          title="Explore"
        >
          <Hash className="w-5 h-5" />
        </button>

        <button
          onClick={() => onNavChange('notifications')}
          className={`p-2.5 rounded-xl relative ${activeNav === 'notifications' ? 'text-blue-400' : 'text-slate-400'}`}
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-slate-950 animate-pulse" />
          )}
        </button>

        <button
          onClick={onRequestNewPost}
          className="p-3 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 -translate-y-2"
        >
          <Feather className="w-5 h-5" />
        </button>

        <button
          onClick={() => onNavChange('messages')}
          className={`p-2.5 rounded-xl relative ${activeNav === 'messages' ? 'text-blue-400' : 'text-slate-400'}`}
          title="Messages"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>

        {currentUser && (
          <button
            onClick={() => onNavChange('profile')}
            className={`p-2.5 rounded-xl ${activeNav === 'profile' ? 'text-blue-400' : 'text-slate-400'}`}
            title="Full Profile"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        )}

        {currentUser && (
          <button
            onClick={() => onNavChange('settings')}
            className={`p-2.5 rounded-xl ${activeNav === 'settings' ? 'text-blue-400' : 'text-slate-400'}`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );
};
