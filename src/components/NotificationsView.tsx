import React, { useState, useEffect } from 'react';
import {
  Bell,
  AtSign,
  CheckCheck,
  MessageCircle,
  Heart,
  ExternalLink,
  Sparkles,
  UserCheck,
  Clock,
  ArrowRight,
  Repeat2,
  Quote,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { User, NotificationItem } from '../types';
import {
  getNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/storage';
import { subscribeToNotifications } from '../services/firebaseService';

interface NotificationsViewProps {
  currentUser: User | null;
  onRequestAuth: () => void;
  onOpenProfile: (handle: string) => void;
  onSelectPost?: (postId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUser,
  onRequestAuth,
  onOpenProfile,
  onSelectPost,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'mentions'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const userNotifs = getNotificationsForUser(currentUser.id);
    setNotifications(userNotifs);
  };

  useEffect(() => {
    loadNotifications();

    if (!currentUser) return;

    // Real-time Firestore sync
    const unsub = subscribeToNotifications(currentUser.id, (cloudNotifs) => {
      if (cloudNotifs && cloudNotifs.length >= 0) {
        setNotifications(cloudNotifs);
      }
    });

    const handler = () => {
      loadNotifications();
    };

    window.addEventListener('pulsex-notification-updated', handler);

    return () => {
      unsub();
      window.removeEventListener('pulsex-notification-updated', handler);
    };
  }, [currentUser?.id]);

  const handleMarkAllRead = () => {
    if (!currentUser) return;
    markAllNotificationsAsRead(currentUser.id);
    loadNotifications();
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }
    if (notif.postId && onSelectPost) {
      onSelectPost(notif.postId);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto mb-3">
          <Bell className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Notifications Stream</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
          Sign in to view mentions, interaction alerts, and tags from other members across the network.
        </p>
        <button
          onClick={onRequestAuth}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
        >
          Sign In to View
        </button>
      </div>
    );
  }

  const filtered = notifications.filter((n) => {
    if (filterTab === 'mentions') {
      return n.type === 'mention';
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const mentionsCount = notifications.filter((n) => n.type === 'mention').length;

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="sticky top-0 z-20 bg-[#070b14]/90 backdrop-blur-md pb-3 pt-1 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Real-time activity stream for tags, mentions, and interactions.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Tab Switcher: All vs Mentions */}
        <div className="flex p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              filterTab === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-blue-400" />
            <span>All Alerts ({notifications.length})</span>
          </button>
          <button
            onClick={() => setFilterTab('mentions')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              filterTab === 'mentions'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AtSign className="w-3.5 h-3.5 text-indigo-400" />
            <span>Mentions ({mentionsCount})</span>
          </button>
        </div>
      </div>

      {/* Notifications Stream */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <AtSign className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            {filterTab === 'mentions' ? 'No mentions yet' : 'No notifications yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {filterTab === 'mentions'
              ? 'When colleagues tag your handle with @' +
                currentUser.nickName.replace(/^@/, '') +
                ' in a post or reply, you will be notified here immediately.'
              : 'Activity will appear here as users interact with your posts or mention your handle.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((notif) => {
            const isMention = notif.type === 'mention';
            const isWarning = notif.type === 'guideline_warning';

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                  isWarning
                    ? 'bg-red-950/20 border-red-500/40 hover:bg-red-950/30'
                    : notif.read
                    ? 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/70 hover:border-slate-700/80'
                    : 'bg-indigo-950/20 border-indigo-500/30 hover:bg-indigo-950/30'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Category Indicator Icon */}
                  <div className="shrink-0 mt-0.5">
                    {isWarning ? (
                      <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-sm">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    ) : isMention ? (
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                        <AtSign className="w-4 h-4" />
                      </div>
                    ) : notif.type === 'repost' ? (
                      <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                        <Repeat2 className="w-4 h-4" />
                      </div>
                    ) : notif.type === 'quote' ? (
                      <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                        <Quote className="w-4 h-4" />
                      </div>
                    ) : notif.type === 'comment' ? (
                      <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                        <Heart className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 truncate">
                        {/* Actor Avatar */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProfile(notif.actorHandle);
                          }}
                          className="shrink-0 group/avatar"
                          title={`View ${notif.actorHandle}'s profile`}
                        >
                          <img
                            src={notif.actorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                            alt={notif.actorName}
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full object-cover border border-slate-700 group-hover/avatar:border-indigo-400 transition-colors"
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProfile(notif.actorHandle);
                          }}
                          className="font-bold text-xs text-white hover:underline truncate"
                        >
                          {notif.actorName}
                        </button>
                        <span className="text-[11px] text-indigo-400 font-mono truncate">
                          {notif.actorHandle}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                        {!notif.read && (
                          <span
                            className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/30 shrink-0"
                            title="Unread notification"
                          />
                        )}
                      </div>
                    </div>

                    {/* Notification headline */}
                    <div className="text-xs text-slate-300 mb-2">
                      {isMention ? (
                        <span>
                          mentioned you in a post tagging{' '}
                          <span className="text-indigo-400 font-semibold font-mono">
                            @{currentUser.nickName.replace(/^@/, '')}
                          </span>
                        </span>
                      ) : notif.type === 'repost' ? (
                        <span className="text-emerald-400 font-medium">reposted your post</span>
                      ) : notif.type === 'quote' ? (
                        <span className="text-blue-400 font-medium">quoted your post</span>
                      ) : notif.type === 'comment' ? (
                        <span>replied to your post</span>
                      ) : (
                        <span>interacted with your post</span>
                      )}
                    </div>

                    {/* Excerpt Snippet */}
                    {notif.postSnippet && (
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/70 text-xs text-slate-300 leading-relaxed group-hover:border-slate-700 transition-colors">
                        <p className="line-clamp-2 italic text-slate-300">
                          "{notif.postSnippet}"
                        </p>
                      </div>
                    )}

                    {/* Post action button */}
                    {notif.postId && (
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-indigo-400 group-hover:text-indigo-300 font-medium">
                          <span>View tagged discussion</span>
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">Click to open</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
