import React, { useState } from 'react';
import {
  Shield,
  Users,
  MessageSquare,
  Lock,
  UserX,
  CheckCircle,
  Clock,
  Pin,
  Trash2,
  Search,
  ExternalLink,
  Mail,
  Send,
  LogOut,
  RefreshCw,
  Sliders,
  AlertTriangle,
  CalendarClock,
  Flag,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { User, Post, BanDurationUnit, EmailJsSettings, ScheduledPost } from '../types';
import {
  getAllUsers,
  getAllPosts,
  getAllMessages,
  getAllConversations,
  adminBanUser,
  adminUnbanUser,
  adminDeletePost,
  adminTogglePinPost,
  createPost,
  inspectBanStatus,
  ADMIN_CREDENTIALS,
  setAdminSession,
  isAdminAuthenticated,
  getAllScheduledPosts,
  deleteScheduledPost,
  publishScheduledPostNow,
  getReportedPosts,
  adminSetReportStatus,
} from '../services/storage';
import { getEmailJsConfig, saveEmailJsConfig } from '../services/emailService';

interface AdminPanelProps {
  onExitAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExitAdmin }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isAdminAuthenticated());
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin tabs
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'reported' | 'scheduled' | 'emailjs' | 'broadcast'>('users');

  // Data states
  const [users, setUsers] = useState<User[]>(() => getAllUsers());
  const [posts, setPosts] = useState<Post[]>(() => getAllPosts());
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(() => getAllScheduledPosts());
  const [reportedPosts, setReportedPosts] = useState<Post[]>(() => getReportedPosts());
  const [moderationToast, setModerationToast] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');

  // Ban Modal state
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banUnit, setBanUnit] = useState<BanDurationUnit>('days');
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [selectedMonths, setSelectedMonths] = useState<number>(2);
  const [selectedYears, setSelectedYears] = useState<number>(1);
  const [banReason, setBanReason] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // EmailJS Settings state
  const [emailConfig, setEmailConfig] = useState<EmailJsSettings>(() => getEmailJsConfig());
  const [emailConfigSaved, setEmailConfigSaved] = useState(false);

  // Broadcast state
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const refreshData = () => {
    setUsers(getAllUsers());
    setPosts(getAllPosts());
    setScheduledPosts(getAllScheduledPosts());
    setReportedPosts(getReportedPosts());
  };

  const handleReportAction = (postId: string, action: 'all_clear' | 'pending' | 'delete_post') => {
    const res = adminSetReportStatus(postId, action);
    refreshData();
    setModerationToast(res.message);
    setTimeout(() => setModerationToast(null), 4000);
  };

  // Handle Admin Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (
      adminIdInput.trim() === ADMIN_CREDENTIALS.id &&
      adminPassInput === ADMIN_CREDENTIALS.pass
    ) {
      setAdminSession(true);
      setIsAuthenticated(true);
      refreshData();
    } else {
      setLoginError('Invalid Administrator ID or Password. Access denied.');
    }
  };

  const handleAdminLogout = () => {
    setAdminSession(false);
    setIsAuthenticated(false);
  };

  // Open Ban Modal for a user
  const handleOpenBanModal = (user: User) => {
    setTargetUser(user);
    setBanType('temporary');
    setBanUnit('days');
    setSelectedDays(7);
    setSelectedMonths(2);
    setSelectedYears(1);
    setBanReason('');
    setActionFeedback(null);
  };

  // Execute Ban
  const handleConfirmBan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    if (!banReason.trim()) {
      setActionFeedback('Please provide a mandatory reason for the ban.');
      return;
    }

    let durationConfig = undefined;
    if (banType === 'temporary') {
      let value = selectedDays;
      if (banUnit === 'months') value = selectedMonths;
      if (banUnit === 'years') value = selectedYears;
      durationConfig = { unit: banUnit, value };
    }

    const res = adminBanUser(targetUser.id, banType, banReason, durationConfig);
    refreshData();
    setActionFeedback(res.message);
    setTimeout(() => {
      setTargetUser(null);
      setActionFeedback(null);
    }, 1500);
  };

  // Execute Unban
  const handleUnbanUser = (userId: string) => {
    const res = adminUnbanUser(userId);
    refreshData();
    alert(res.message);
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post from the platform?')) {
      adminDeletePost(postId);
      refreshData();
    }
  };

  // Pin Post
  const handleTogglePin = (postId: string) => {
    adminTogglePinPost(postId);
    refreshData();
  };

  // Save EmailJS Configuration
  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmailJsConfig(emailConfig);
    setEmailConfigSaved(true);
    setTimeout(() => setEmailConfigSaved(false), 2500);
  };

  // Publish Admin Broadcast
  const handlePublishBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    const adminUser = users.find((u) => u.role === 'admin') || users[0];
    const res = createPost(
      adminUser,
      `📢 [OFFICIAL ANNOUNCEMENT from Admin]: ${broadcastText.trim()}`,
      undefined,
      ['Announcement', 'PulseX', 'Admin']
    );

    if (res.success && res.post) {
      adminTogglePinPost(res.post.id);
      setBroadcastSuccess('Announcement published and pinned to feed top!');
      setBroadcastText('');
      refreshData();
      setTimeout(() => setBroadcastSuccess(null), 3000);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.nickName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());

    const isBanned = u.banStatus && u.banStatus.isBanned;
    if (statusFilter === 'active') return matchesSearch && !isBanned;
    if (statusFilter === 'banned') return matchesSearch && isBanned;
    return matchesSearch;
  });

  // Filtered posts
  const filteredPosts = posts.filter(
    (p) =>
      p.content.toLowerCase().includes(postSearch.toLowerCase()) ||
      p.authorName.toLowerCase().includes(postSearch.toLowerCase()) ||
      p.authorHandle.toLowerCase().includes(postSearch.toLowerCase())
  );

  const activeBansCount = users.filter((u) => u.banStatus && u.banStatus.isBanned).length;

  // ================= LOGIN SCREEN FOR ADMIN PORTAL =================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto mb-4">
            <Shield className="w-7 h-7" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Executive Admin Portal</h1>
            <p className="text-xs text-slate-400 mt-1">
              Restricted access control. Authenticate with designated root credentials.
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahin"
                  value={adminIdInput}
                  onChange={(e) => setAdminIdInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••"
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/30 transition-all text-sm flex items-center justify-center gap-2 mt-2"
            >
              <Lock className="w-4 h-4" />
              <span>Authenticate as Root Admin</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Client Protected Gateway</span>
            <button
              onClick={onExitAdmin}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <span>Back to Public App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= AUTHENTICATED ADMIN DASHBOARD =================
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200">
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">PulseX Admin Suite</span>
              <span className="text-[11px] font-mono uppercase bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                Root Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Logged in as <span className="text-slate-200 font-semibold">Rahin</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onExitAdmin}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Public Feed</span>
          </button>
          <button
            onClick={handleAdminLogout}
            className="px-3.5 py-1.5 text-xs font-medium text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* KPI Scorecard Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Users</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{users.length}</div>
            <span className="text-[11px] text-slate-500">Live community accounts</span>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Feed Posts</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{posts.length}</div>
            <span className="text-[11px] text-slate-500">Public discussions</span>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Direct Messages</span>
              <Send className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{getAllMessages().length}</div>
            <span className="text-[11px] text-slate-500">{getAllConversations().length} active threads</span>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Active Bans</span>
              <UserX className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-red-400 tabular-nums">{activeBansCount}</div>
            <span className="text-[11px] text-slate-500">Enforced by moderation</span>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>OTP Email Service</span>
              <Mail className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {emailConfig.enabled ? 'EmailJS Online' : 'Simulator Active'}
            </div>
            <span className="text-[11px] text-slate-500">100% testable reset</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800/80 rounded-xl mb-6 max-w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory &amp; Bans</span>
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'posts'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Post Moderation</span>
          </button>
          <button
            onClick={() => setActiveTab('reported')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'reported'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Reported Posts</span>
            {reportedPosts.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-300 rounded-full text-[10px] font-mono font-bold">
                {reportedPosts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'scheduled'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarClock className="w-4 h-4 text-indigo-400" />
            <span>Scheduled Posts</span>
            {scheduledPosts.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-600/30 text-indigo-300 rounded-full text-[10px] font-mono font-bold">
                {scheduledPosts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'broadcast'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Admin Feed Broadcast</span>
          </button>
          <button
            onClick={() => setActiveTab('emailjs')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'emailjs'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>EmailJS Integration</span>
          </button>
        </div>

        {/* ================= TAB 1: USERS & BAN SYSTEM ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by full name, @nickname, or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">All Accounts ({users.length})</option>
                  <option value="active">Active Only ({users.length - activeBansCount})</option>
                  <option value="banned">Suspended / Banned ({activeBansCount})</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                    <tr>
                      <th className="px-5 py-3.5">User Identity</th>
                      <th className="px-4 py-3.5">Nickname / Handle</th>
                      <th className="px-4 py-3.5">Email Address</th>
                      <th className="px-4 py-3.5">Joined Date</th>
                      <th className="px-4 py-3.5">Status &amp; Ban Details</th>
                      <th className="px-5 py-3.5 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-normal">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                          No users matched your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const ban = inspectBanStatus(u);
                        const isProtectedAdmin = u.id === 'usr_rahin_admin';

                        return (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            {/* User Identity */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={u.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                                  alt={u.fullName}
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                                />
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-1.5">
                                    <span>{u.fullName}</span>
                                    {u.role === 'admin' && (
                                      <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded font-mono">
                                        ADMIN
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500">ID: {u.id}</span>
                                </div>
                              </div>
                            </td>

                            {/* Nickname */}
                            <td className="px-4 py-3.5">
                              <span className="font-mono text-blue-400 font-medium">{u.nickName}</span>
                            </td>

                            {/* Email */}
                            <td className="px-4 py-3.5 text-slate-300 font-mono text-[11px]">{u.email}</td>

                            {/* Joined */}
                            <td className="px-4 py-3.5 text-slate-400">
                              {new Date(u.joinedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5">
                              {ban.isBanned ? (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                                    <UserX className="w-3 h-3" />
                                    <span>
                                      {ban.type === 'permanent' ? 'Permanent Ban' : 'Temporary Ban'}
                                    </span>
                                  </div>
                                  {ban.remainingText && (
                                    <div className="text-[11px] text-amber-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>Expires: {ban.remainingText}</span>
                                    </div>
                                  )}
                                  <p className="text-[11px] text-slate-400 truncate max-w-xs" title={ban.reason}>
                                    "{ban.reason}"
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Active &amp; Good Standing</span>
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              {isProtectedAdmin ? (
                                <span className="text-[11px] text-slate-500 italic">Root Account</span>
                              ) : ban.isBanned ? (
                                <button
                                  onClick={() => handleUnbanUser(u.id)}
                                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  Lift Ban (Unban)
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenBanModal(u)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-red-600/20 transition-colors inline-flex items-center gap-1.5"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Ban User</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: POSTS MONITORING ================= */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search posts by text, author name, or @handle..."
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-3">
              {filteredPosts.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No posts found matching query.
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={post.authorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                          alt={post.authorName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="font-semibold text-white text-xs">{post.authorName}</span>
                        <span className="text-blue-400 font-mono text-xs">{post.authorHandle}</span>
                        <span className="text-slate-500 text-xs">·</span>
                        <span className="text-slate-400 text-xs">
                          {new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {post.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                            <Pin className="w-2.5 h-2.5" />
                            <span>Pinned Announcement</span>
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-200 leading-relaxed font-normal">{post.content}</p>

                      {post.mediaUrl && (
                        <div className="max-w-md rounded-xl overflow-hidden border border-slate-800">
                          <img
                            src={post.mediaUrl}
                            alt="Post attachment"
                            referrerPolicy="no-referrer"
                            className="w-full h-44 object-cover"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                        <span>❤️ {post.likes.length} Likes</span>
                        <span>🔄 {post.reposts.length} Reposts</span>
                        <span>💬 {post.commentsCount} Comments</span>
                      </div>
                    </div>

                    <div className="flex items-center md:flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleTogglePin(post.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                          post.isPinned
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{post.isPinned ? 'Unpin' : 'Pin to Top'}</span>
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Post</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: REPORTED POSTS MODERATION ================= */}
        {activeTab === 'reported' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>Reported Posts Moderation Queue</span>
                  <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                    {reportedPosts.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Review user-submitted reports. Take moderation actions: mark All Clear, keep Pending under review, or Delete post with a community guideline warning.
                </p>
              </div>

              <button
                onClick={() => {
                  refreshData();
                  setReportedPosts(getReportedPosts());
                }}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Refresh Queue</span>
              </button>
            </div>

            {moderationToast && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{moderationToast}</span>
              </div>
            )}

            <div className="space-y-4">
              {reportedPosts.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-base font-bold text-white">No pending reported posts!</p>
                  <p className="text-xs text-slate-400 mt-1">
                    All user flags have been reviewed and resolved by platform safety.
                  </p>
                </div>
              ) : (
                reportedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col gap-4"
                  >
                    {/* Report Info Header */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-300">Report Details:</span>
                        <span className="text-slate-200 font-medium">{post.flagReason || 'Reported for review'}</span>
                      </div>
                      {post.reportedBy && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Reporter ID: {post.reportedBy}
                        </span>
                      )}
                    </div>

                    {/* Reported Post Preview */}
                    <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={post.authorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                          alt={post.authorName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{post.authorName}</span>
                            <span className="text-blue-400 font-mono text-[11px]">{post.authorHandle}</span>
                          </div>
                          <time className="text-[10px] text-slate-500">
                            Posted on {new Date(post.createdAt).toLocaleString()}
                          </time>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-normal my-2">
                        {post.content}
                      </p>

                      {post.mediaUrl && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-800 max-w-md max-h-56 bg-slate-900">
                          <img
                            src={post.mediaUrl}
                            alt="Reported post attachment"
                            referrerPolicy="no-referrer"
                            className="w-full h-56 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Admin Moderation Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-400">
                        Status: <span className="text-amber-400 font-semibold font-mono uppercase">Under Moderation Review</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 1. ALL CLEAR */}
                        <button
                          type="button"
                          onClick={() => handleReportAction(post.id, 'all_clear')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                          title="Clear report and keep post visible to public"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>All Clear</span>
                        </button>

                        {/* 2. PENDING */}
                        <button
                          type="button"
                          onClick={() => handleReportAction(post.id, 'pending')}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                          title="Keep under review for further safety investigation"
                        >
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Pending</span>
                        </button>

                        {/* 3. DELETE POST */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete post and issue a guideline warning notice to ${post.authorName}?`)) {
                              handleReportAction(post.id, 'delete_post');
                            }
                          }}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5"
                          title="Delete post and issue guideline warning to author profile"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Post</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: SCHEDULED POSTS QUEUE ================= */}
        {activeTab === 'scheduled' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Scheduled Publication Queue</span>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                    {scheduledPosts.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Posts drafted across all users scheduled for publication in the Firestore 'scheduled' collection
                </p>
              </div>
              <button
                onClick={refreshData}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Queue</span>
              </button>
            </div>

            <div className="space-y-3">
              {scheduledPosts.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <CalendarClock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No scheduled posts in queue</p>
                  <p className="text-xs text-slate-500 mt-1">Users have not drafted any future scheduled posts at this time.</p>
                </div>
              ) : (
                scheduledPosts.map((sch) => {
                  const targetDate = new Date(sch.scheduledFor);
                  const isOverdue = targetDate.getTime() <= Date.now();
                  return (
                    <div
                      key={sch.id}
                      className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-semibold text-white text-xs">{sch.authorName}</span>
                          <span className="text-[11px] text-blue-400 font-mono">{sch.authorHandle}</span>
                          <span className="text-[11px] text-slate-600">•</span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${
                              isOverdue
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {isOverdue ? 'Due Now' : `Scheduled: ${targetDate.toLocaleString()}`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2">{sch.content}</p>
                        {sch.mediaUrl && (
                          <span className="inline-block mt-1 text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                            Has Media Attachment
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            publishScheduledPostNow(sch.id);
                            refreshData();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Now</span>
                        </button>
                        <button
                          onClick={() => {
                            deleteScheduledPost(sch.id);
                            refreshData();
                          }}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel Post</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: ADMIN BROADCAST ================= */}
        {activeTab === 'broadcast' && (
          <div className="max-w-2xl bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Publish Official Community Announcement</h3>
            <p className="text-xs text-slate-400 mb-4">
              Posts an authenticated broadcast from the official administrator identity directly into the main community timeline and pins it to the top.
            </p>

            {broadcastSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{broadcastSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePublishBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Announcement Message
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. System update scheduled tonight at 02:00 UTC. New security rules enabled."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 text-xs flex items-center gap-2 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast &amp; Pin to Feed</span>
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 4: EMAILJS CONFIGURATION ================= */}
        {activeTab === 'emailjs' && (
          <div className="max-w-2xl bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">EmailJS Configuration</h3>
                <p className="text-xs text-slate-400">
                  Connect your EmailJS service for sending actual OTP reset emails to users.
                </p>
              </div>
            </div>

            {emailConfigSaved && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>EmailJS settings saved successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveEmailConfig} className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-white">Enable Real EmailJS Dispatch</div>
                  <div className="text-[11px] text-slate-400">
                    When enabled, uses EmailJS browser SDK to send emails. When disabled, in-app test simulator handles OTPs.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailConfig.enabled}
                  onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Service ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. service_xxxxxxx"
                  value={emailConfig.serviceId}
                  onChange={(e) => setEmailConfig({ ...emailConfig, serviceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Template ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. template_xxxxxxx"
                  value={emailConfig.templateId}
                  onChange={(e) => setEmailConfig({ ...emailConfig, templateId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Template variables provided: <code className="text-purple-400">to_email</code>, <code className="text-purple-400">otp_code</code>, <code className="text-purple-400">user_name</code>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Public Key (User ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. user_xxxxxxxxxxxxxxx"
                  value={emailConfig.publicKey}
                  onChange={(e) => setEmailConfig({ ...emailConfig, publicKey: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/20 text-xs transition-all"
              >
                Save EmailJS Configuration
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ================= MODAL: BAN USER CONFIGURATION ================= */}
      {targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Execute User Ban / Suspension</h3>
                <p className="text-xs text-slate-400">
                  Target user: <span className="text-white font-semibold">{targetUser.fullName}</span> ({targetUser.nickName})
                </p>
              </div>
            </div>

            {actionFeedback && (
              <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300">
                {actionFeedback}
              </div>
            )}

            <form onSubmit={handleConfirmBan} className="space-y-4">
              {/* Ban Type selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Ban Severity
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                      banType === 'temporary'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="banType"
                      checked={banType === 'temporary'}
                      onChange={() => setBanType('temporary')}
                      className="text-amber-500"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">Temporary Ban</div>
                      <div className="text-[11px] text-slate-400">Days, Months, or Years</div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                      banType === 'permanent'
                        ? 'bg-red-500/10 border-red-500/40 text-red-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="banType"
                      checked={banType === 'permanent'}
                      onChange={() => setBanType('permanent')}
                      className="text-red-500"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">Permanent Ban</div>
                      <div className="text-[11px] text-slate-400">Indefinite expulsion</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Temporary Ban duration form with exact requested options */}
              {banType === 'temporary' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3.5">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Temporary Ban Duration Selection</span>
                  </div>

                  {/* Unit Switcher */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBanUnit('days')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        banUnit === 'days'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Days (1 to 30)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBanUnit('months')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        banUnit === 'months'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Months (2, 4, 6)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBanUnit('years')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        banUnit === 'years'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Years (1 to 5)
                    </button>
                  </div>

                  {/* Days Selector (1 to 30) */}
                  {banUnit === 'days' && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Number of days:</span>
                        <span className="font-mono font-bold text-amber-400">{selectedDays} Day(s)</span>
                      </div>
                      <select
                        value={selectedDays}
                        onChange={(e) => setSelectedDays(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                      >
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            {day} Day{day > 1 ? 's' : ''} {day === 7 ? '(1 Week)' : day === 14 ? '(2 Weeks)' : day === 30 ? '(1 Month)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Months Selector (2, 4, 6) */}
                  {banUnit === 'months' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Choose Months:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[2, 4, 6].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setSelectedMonths(m)}
                            className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                              selectedMonths === m
                                ? 'bg-amber-500/30 text-amber-200 border-amber-500'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {m} Months
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Years Selector (1, 2, 3, 4, 5) */}
                  {banUnit === 'years' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Choose Years:</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((y) => (
                          <button
                            key={y}
                            type="button"
                            onClick={() => setSelectedYears(y)}
                            className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                              selectedYears === y
                                ? 'bg-amber-500/30 text-amber-200 border-amber-500'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {y} Yr{y > 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory Reason Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Ban (Mandatory) <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Inappropriate language, harassment, spamming links..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTargetUser(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Confirm Ban</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
