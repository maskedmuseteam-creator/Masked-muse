import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Users,
  Search,
  Filter,
  Shield,
  Feather,
  RefreshCw,
  LogOut,
  UserPlus,
  LogIn,
  Share2,
} from 'lucide-react';
import { User, Post, ScheduledPost, UserSettings } from './types';
import {
  initStorage,
  getAllPosts,
  getCurrentUser,
  setCurrentUser,
  inspectBanStatus,
  getUnreadMessagesCount,
  getUnreadNotificationsCount,
  getAllScheduledPosts,
  checkAndPublishDueScheduledPosts,
  getUserSettings,
} from './services/storage';
import { subscribeToPosts, subscribeToUsers, subscribeToScheduledPosts, subscribeToNotifications } from './services/firebaseService';
import { Navbar, NavTab } from './components/Navbar';
import { RightSidebar } from './components/RightSidebar';
import { PostCreator } from './components/PostCreator';
import { PostCard } from './components/PostCard';
import { AuthModal } from './components/AuthModal';
import { BanNoticeModal } from './components/BanNoticeModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MessagesView } from './components/MessagesView';
import { NotificationsView } from './components/NotificationsView';
import { TrendAnalyticsChart } from './components/TrendAnalyticsChart';
import { AdminPanel } from './components/AdminPanel';
import { OtpNotificationBanner } from './components/OtpNotificationBanner';
import { ScheduledPostsModal } from './components/ScheduledPostsModal';
import { FullProfileView } from './components/FullProfileView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  // App view mode: 'public' or 'admin'
  const [viewMode, setViewMode] = useState<'public' | 'admin'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('admin') === 'true' ? 'admin' : 'public';
  });

  // Current logged in user
  const [currentUser, setUser] = useState<User | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // Community posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedTab, setFeedTab] = useState<'for_you' | 'following'>('for_you');

  // Navigation
  const [activeNav, setActiveNav] = useState<NavTab>('home');
  const [targetChatUserId, setTargetChatUserId] = useState<string | null>(null);
  const [targetProfileHandle, setTargetProfileHandle] = useState<string | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string>('accounts');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Search & Tag filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [bannedModalUser, setBannedModalUser] = useState<User | null>(null);
  const [viewProfileHandle, setViewProfileHandle] = useState<string | null>(null);
  const [scheduledModalOpen, setScheduledModalOpen] = useState(false);

  // Scheduled posts queue
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  // Initialize and load
  const reloadData = () => {
    initStorage();
    const u = getCurrentUser();
    setUser(u);
    setPosts(getAllPosts());
    setScheduledPosts(getAllScheduledPosts());
    if (u) {
      setUserSettings(getUserSettings(u.id));
      setUnreadCount(getUnreadMessagesCount(u.id));
      setUnreadNotificationsCount(getUnreadNotificationsCount(u.id));
    } else {
      setUserSettings(null);
      setUnreadCount(0);
      setUnreadNotificationsCount(0);
    }

    // If current user is banned, open ban modal automatically
    if (u) {
      const ban = inspectBanStatus(u);
      if (ban.isBanned) {
        setBannedModalUser(u);
      }
    }
  };

  // Shared post state from temporary share link
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);
  const [sharedPostExpired, setSharedPostExpired] = useState<boolean>(false);

  useEffect(() => {
    reloadData();

    // Check if query parameter specifies post or admin
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setViewMode('admin');
    }

    const postParam = urlParams.get('post');
    const expParam = urlParams.get('exp');

    if (postParam) {
      if (expParam && Date.now() > Number(expParam)) {
        setSharedPostExpired(true);
      } else {
        setSharedPostId(postParam);
      }
    }

    // Subscribe to real-time posts from Firebase Firestore
    const unsubPosts = subscribeToPosts((cloudPosts) => {
      if (cloudPosts) {
        setPosts(cloudPosts);
        try {
          localStorage.setItem('pulsex_posts_v2_firebase', JSON.stringify(cloudPosts));
        } catch (e) {
          console.warn('Storage sync warn:', e);
        }
      }
    });

    // Subscribe to real-time users from Firebase Firestore
    const unsubUsers = subscribeToUsers((cloudUsers) => {
      if (cloudUsers) {
        try {
          localStorage.setItem('pulsex_users_v2_firebase', JSON.stringify(cloudUsers));
        } catch (e) {
          console.warn('Storage sync warn:', e);
        }
        const currentId = localStorage.getItem('pulsex_current_user_id');
        if (currentId) {
          const match = cloudUsers.find((u) => u.id === currentId);
          if (match) {
            setUser(match);
            const ban = inspectBanStatus(match);
            if (ban.isBanned) {
              setBannedModalUser(match);
            }
          }
        }
      }
    });

    // Subscribe to real-time scheduled posts from Firebase Firestore
    const unsubScheduled = subscribeToScheduledPosts(undefined, (cloudScheduled) => {
      if (cloudScheduled) {
        setScheduledPosts(cloudScheduled);
        try {
          localStorage.setItem('pulsex_scheduled_posts_v2_firebase', JSON.stringify(cloudScheduled));
        } catch (e) {
          console.warn('Storage sync warn:', e);
        }
      }
    });

    // Subscribe to real-time notifications from Firebase Firestore
    const unsubNotifications = subscribeToNotifications(undefined, () => {
      const u = getCurrentUser();
      if (u) {
        setUnreadNotificationsCount(getUnreadNotificationsCount(u.id));
      }
    });

    // Run scheduled post publisher check on mount and periodically every 15s
    checkAndPublishDueScheduledPosts();
    const scheduleInterval = setInterval(() => {
      checkAndPublishDueScheduledPosts();
    }, 15000);

    const messageHandler = () => {
      const u = getCurrentUser();
      if (u) {
        setUnreadCount(getUnreadMessagesCount(u.id));
      }
    };

    const notifHandler = () => {
      const u = getCurrentUser();
      if (u) {
        setUnreadNotificationsCount(getUnreadNotificationsCount(u.id));
      }
    };

    const scheduledHandler = () => {
      setScheduledPosts(getAllScheduledPosts());
    };

    const postPublishedHandler = () => {
      setPosts(getAllPosts());
    };

    window.addEventListener('pulsex-message-updated', messageHandler);
    window.addEventListener('pulsex-notification-updated', notifHandler);
    window.addEventListener('pulsex-scheduled-updated', scheduledHandler);
    window.addEventListener('pulsex-post-published', postPublishedHandler);

    return () => {
      clearInterval(scheduleInterval);
      unsubPosts();
      unsubUsers();
      unsubScheduled();
      unsubNotifications();
      window.removeEventListener('pulsex-message-updated', messageHandler);
      window.removeEventListener('pulsex-notification-updated', notifHandler);
      window.removeEventListener('pulsex-scheduled-updated', scheduledHandler);
      window.removeEventListener('pulsex-post-published', postPublishedHandler);
    };
  }, []);

  const handleOpenAuth = (initialTab: 'login' | 'signup' | 'forgot' = 'login') => {
    setAuthInitialTab(initialTab);
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  const handleBannedAttempt = (user: User) => {
    setBannedModalUser(user);
  };

  const handleOpenFullProfile = (handle?: string) => {
    setTargetProfileHandle(handle || currentUser?.nickName || null);
    setActiveNav('profile');
    setViewProfileHandle(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSettings = (tab = 'accounts') => {
    setSettingsInitialTab(tab);
    setActiveNav('settings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterAdmin = () => {
    setViewMode('admin');
    window.history.replaceState({}, '', '?admin=true');
  };

  const handleExitAdmin = () => {
    setViewMode('public');
    window.history.replaceState({}, '', window.location.pathname);
    reloadData();
  };

  // Switch between public feed and admin suite
  if (viewMode === 'admin') {
    return <AdminPanel onExitAdmin={handleExitAdmin} />;
  }

  // Filter posts for the feed
  const displayPosts = posts.filter((post) => {
    // If viewing a shared post from temporary share link
    if (sharedPostId) {
      return post.id === sharedPostId;
    }

    // Filter blocked and muted users
    if (currentUser && userSettings) {
      if (userSettings.privacy.blockedUserIds.includes(post.authorId)) return false;
      if (userSettings.privacy.mutedUserIds.includes(post.authorId)) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q) ||
        post.authorHandle.toLowerCase().includes(q) ||
        (post.tags && post.tags.some((t) => t.toLowerCase().includes(q)));
      if (!match) return false;
    }

    // Hashtag filter
    if (selectedTag) {
      if (!post.tags || !post.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
        return false;
      }
    }

    // Nav sections
    if (activeNav === 'bookmarks') {
      if (!currentUser) return false;
      return post.bookmarks.includes(currentUser.id);
    }

    // Following tab
    if (feedTab === 'following') {
      if (!currentUser) return true;
      return currentUser.following.includes(post.authorId) || post.authorId === currentUser.id;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* OTP Delivery Notification Banner */}
      <OtpNotificationBanner />

      {/* Top Mobile / Tablet Header */}
      <header className="md:hidden sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            ⚡
          </div>
          <span className="font-bold text-base tracking-tight text-white">PulseX</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEnterAdmin}
            className="p-1.5 text-xs text-red-400 bg-red-950/40 border border-red-800/30 rounded-lg flex items-center gap-1"
            title="Open Admin Suite"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">Admin</span>
          </button>

          {currentUser ? (
            <button
              onClick={() => setViewProfileHandle(currentUser.nickName)}
              className="flex items-center gap-1.5"
            >
              <img
                src={currentUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
            </button>
          ) : (
            <button
              onClick={() => handleOpenAuth('login')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main 3-Column Container */}
      <div className="max-w-7xl w-full mx-auto flex flex-1">
        {/* Column 1: Left Navigation Rail */}
        <Navbar
          currentUser={currentUser}
          activeNav={activeNav}
          unreadCount={unreadCount}
          unreadNotificationsCount={unreadNotificationsCount}
          scheduledCount={
            currentUser
              ? scheduledPosts.filter((p) => p.authorId === currentUser.id && p.status === 'pending').length
              : 0
          }
          onNavChange={(nav) => {
            if (nav === 'profile') {
              handleOpenFullProfile();
            } else if (nav === 'settings') {
              handleOpenSettings();
            } else {
              setActiveNav(nav);
            }
          }}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onOpenAdmin={handleEnterAdmin}
          onOpenProfile={(h) => handleOpenFullProfile(h)}
          onOpenScheduledModal={() => setScheduledModalOpen(true)}
          onRequestNewPost={() => {
            if (!currentUser) handleOpenAuth('signup');
            else {
              setActiveNav('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />

        {/* Column 2: Center Community Timeline, Notifications, Messages, Full Profile, or Settings */}
        {activeNav === 'messages' ? (
          <main className="flex-1 min-w-0 px-3 sm:px-4 py-4 pb-24 md:pb-6">
            <MessagesView
              currentUser={currentUser}
              initialTargetUserId={targetChatUserId}
              onRequestAuth={() => handleOpenAuth('login')}
              onBannedAttempt={handleBannedAttempt}
              onOpenProfile={(handle) => handleOpenFullProfile(handle)}
            />
          </main>
        ) : activeNav === 'notifications' ? (
          <main className="flex-1 min-w-0 max-w-2xl border-r border-slate-800/80 px-3 sm:px-4 py-4 pb-24 md:pb-6">
            <NotificationsView
              currentUser={currentUser}
              onRequestAuth={() => handleOpenAuth('login')}
              onOpenProfile={(handle) => handleOpenFullProfile(handle)}
              onSelectPost={(postId) => {
                setSharedPostId(postId);
                setActiveNav('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </main>
        ) : activeNav === 'profile' ? (
          <main className="flex-1 min-w-0 max-w-2xl border-r border-slate-800/80 px-3 sm:px-4 py-4 pb-24 md:pb-6">
            <FullProfileView
              currentUser={currentUser}
              targetHandle={targetProfileHandle}
              onNavigateHome={() => setActiveNav('home')}
              onNavigateSettings={(tab) => handleOpenSettings(tab)}
              onStartMessageWithUser={(userId) => {
                setTargetChatUserId(userId);
                setActiveNav('messages');
              }}
              onRequestAuth={() => handleOpenAuth('login')}
              onBannedAttempt={handleBannedAttempt}
              onSelectPost={(postId) => {
                setSharedPostId(postId);
                setActiveNav('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenProfile={(h) => handleOpenFullProfile(h)}
            />
          </main>
        ) : activeNav === 'settings' ? (
          <main className="flex-1 min-w-0 max-w-2xl border-r border-slate-800/80 px-3 sm:px-4 py-4 pb-24 md:pb-6">
            <SettingsView
              currentUser={currentUser}
              initialTab={settingsInitialTab}
              onRequestAuth={() => handleOpenAuth('login')}
              onUserUpdated={(updatedUser) => {
                setUser(updatedUser);
                reloadData();
              }}
              onNavigateProfile={() => handleOpenFullProfile()}
            />
          </main>
        ) : (
          <main className="flex-1 min-w-0 max-w-2xl border-r border-slate-800/80 px-3 sm:px-4 py-4 pb-24 md:pb-6">
            {/* Header Bar */}
            <div className="sticky top-0 md:top-0 z-20 bg-[#070b14]/90 backdrop-blur-md pb-3 pt-1 border-b border-slate-800/80 mb-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    {activeNav === 'home' && 'Home Feed'}
                    {activeNav === 'explore' && 'Explore Trending'}
                    {activeNav === 'bookmarks' && 'Saved Bookmarks'}
                  </h1>
                  <p className="text-[11px] text-slate-400">
                    {activeNav === 'home' && 'Real-time micro-discussions & architectural insights.'}
                    {activeNav === 'explore' && 'Curated topics across technology, design, and code.'}
                    {activeNav === 'bookmarks' && 'Posts you saved for future reference.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={reloadData}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Reload feed"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* Active Feed Tabs: For You vs Following */}
            {activeNav === 'home' && (
              <div className="flex p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setFeedTab('for_you')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    feedTab === 'for_you'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>For You</span>
                </button>
                <button
                  onClick={() => setFeedTab('following')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    feedTab === 'following'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Following</span>
                </button>
              </div>
            )}

            {/* Active Filter Pill indicator if tag or search active */}
            {(selectedTag || searchQuery) && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Filtering:</span>
                {selectedTag && (
                  <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    #{selectedTag}
                    <button onClick={() => setSelectedTag(null)} className="hover:text-white">
                      ×
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-white">
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Shared Post Temporary Link Notification Banner */}
          {sharedPostId && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between text-xs text-blue-200">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Viewing post shared via temporary link (Expires in 24h).</span>
              </div>
              <button
                onClick={() => {
                  setSharedPostId(null);
                  window.history.replaceState({}, '', window.location.pathname);
                }}
                className="text-xs font-semibold text-blue-300 hover:text-white underline ml-3 shrink-0"
              >
                View All Posts
              </button>
            </div>
          )}

          {sharedPostExpired && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-200">
              <span>This temporary share link has expired (24-hour limit reached). Showing full timeline.</span>
              <button
                onClick={() => setSharedPostExpired(false)}
                className="text-xs font-semibold text-amber-300 hover:text-white underline ml-3 shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Trend Analytics Chart in Explore Section */}
          {activeNav === 'explore' && (
            <TrendAnalyticsChart
              onTagSelect={(tag) => setSelectedTag(tag)}
              selectedTag={selectedTag}
            />
          )}

          {/* Post Creator Composer */}
          <PostCreator
            currentUser={currentUser}
            onPostCreated={reloadData}
            onRequestAuth={() => handleOpenAuth('signup')}
            onBannedAttempt={handleBannedAttempt}
            onOpenScheduledModal={() => setScheduledModalOpen(true)}
            scheduledCount={
              currentUser
                ? scheduledPosts.filter((p) => p.authorId === currentUser.id && p.status === 'pending').length
                : 0
            }
          />

          {/* Posts Timeline Stream */}
          <div className="space-y-3">
            {displayPosts.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Feather className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">No posts to display</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                  {selectedTag
                    ? `No posts found under #${selectedTag}. Be the first to share!`
                    : activeNav === 'bookmarks'
                    ? "You haven't bookmarked any posts yet."
                    : 'The timeline is quiet. Start the conversation!'}
                </p>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              displayPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onPostUpdated={reloadData}
                  onRequestAuth={() => handleOpenAuth('signup')}
                  onBannedAttempt={handleBannedAttempt}
                  onTagClick={(tag) => setSelectedTag(tag)}
                  onAuthorClick={(handle) => setViewProfileHandle(handle)}
                  onSelectPost={(postId) => {
                    setSharedPostId(postId);
                    setActiveNav('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))
            )}
          </div>
        </main>
      )}

      {/* Column 3: Right Sidebar with Search, Trends & Follow recommendations */}
      <RightSidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTag={selectedTag}
        onTagSelect={setSelectedTag}
        currentUser={currentUser}
        onOpenAdmin={handleEnterAdmin}
        onOpenProfile={setViewProfileHandle}
        onRequestAuth={() => handleOpenAuth('signup')}
        onStartMessageWithUser={(userId) => {
          setTargetChatUserId(userId);
          setActiveNav('messages');
        }}
      />
    </div>

    {/* Auth Modal (Sign Up with @ handle & Hard Password, Login, and EmailJS OTP Forgot Password) */}
    <AuthModal
      isOpen={authModalOpen}
      initialTab={authInitialTab}
      onClose={() => setAuthModalOpen(false)}
      onSuccess={(user) => {
        setUser(user);
        reloadData();
      }}
      onBannedUserAttempt={handleBannedAttempt}
    />

    {/* Ban Notice Alert Modal for suspended users */}
    <BanNoticeModal
      user={bannedModalUser}
      isOpen={Boolean(bannedModalUser)}
      onClose={() => setBannedModalUser(null)}
      onSwitchAccount={() => {
        setCurrentUser(null);
        setUser(null);
        handleOpenAuth('login');
      }}
    />

    {/* User Profile Inspector Modal */}
    <UserProfileModal
      userHandle={viewProfileHandle}
      currentUser={currentUser}
      onClose={() => setViewProfileHandle(null)}
      onRequestAuth={() => handleOpenAuth('signup')}
      onBannedAttempt={handleBannedAttempt}
      onStartMessageWithUser={(userId) => {
        setTargetChatUserId(userId);
        setActiveNav('messages');
      }}
      onOpenFullProfile={(h) => handleOpenFullProfile(h)}
    />

    {/* Scheduled Posts Queue Modal */}
    <ScheduledPostsModal
      isOpen={scheduledModalOpen}
      onClose={() => setScheduledModalOpen(false)}
      currentUser={currentUser}
      scheduledPosts={scheduledPosts}
      onUpdated={reloadData}
    />
  </div>
);
}
