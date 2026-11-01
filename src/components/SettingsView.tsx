import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Key,
  Shield,
  ShieldCheck,
  Globe,
  Sliders,
  SlidersHorizontal,
  History,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Palette,
  Laptop,
  Check,
  ArrowRight,
  Sparkles,
  Search,
  Bell,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
  LogOut,
  Image as ImageIcon,
  Camera,
  Upload,
} from 'lucide-react';
import { User, UserSettings, ActivationLog, Comment } from '../types';
import {
  getUserSettings,
  updateUserSettings,
  getUserActivationLogs,
  addActivationLog,
  clearOtherActivationSessions,
  changeUserPassword,
  updateUserProfile,
  getAllPosts,
  getAllComments,
  getAllUsers,
} from '../services/storage';
import { compressImageFile, compressDataUrl } from '../utils/imageUtils';

interface SettingsViewProps {
  currentUser: User | null;
  initialTab?: string;
  onRequestAuth: () => void;
  onUserUpdated: (user: User) => void;
  onNavigateProfile: () => void;
}

type SettingsTab =
  | 'accounts'
  | 'language'
  | 'privacy_checkup'
  | 'privacy_center'
  | 'activation_logs'
  | 'content_preferences'
  | 'app_settings';

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  initialTab = 'accounts',
  onRequestAuth,
  onUserUpdated,
  onNavigateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (initialTab === 'settings') return 'app_settings';
    return (initialTab as SettingsTab) || 'accounts';
  });

  // Load user settings & activation logs
  const [settings, setSettings] = useState<UserSettings>(() =>
    currentUser ? getUserSettings(currentUser.id) : ({} as UserSettings)
  );
  const [logs, setLogs] = useState<ActivationLog[]>(() =>
    currentUser ? getUserActivationLogs(currentUser.id) : []
  );

  // Status feedback banners
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // ----------------- ACCOUNTS CENTER STATE -----------------
  // Profile form
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [nickName, setNickName] = useState(currentUser?.nickName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(currentUser?.bannerUrl || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [website, setWebsite] = useState(currentUser?.website || '');

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Compress avatar to max 400x400
      const compressedUrl = await compressImageFile(file, 400, 400, 0.85);
      setAvatarUrl(compressedUrl);
      showToast('New profile photo compressed & loaded! Click "Save Profile Modifications" to apply.');
    } catch (err) {
      showToast('Failed to process image file.', true);
    }
    e.target.value = '';
  };

  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Compress banner to max 1200x450
      const compressedUrl = await compressImageFile(file, 1200, 450, 0.82);
      setBannerUrl(compressedUrl);
      showToast('New banner image compressed & loaded! Click "Save Profile Modifications" to apply.');
    } catch (err) {
      showToast('Failed to process banner image file.', true);
    }
    e.target.value = '';
  };

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ----------------- CONTENT PREFERENCES STATE -----------------
  const [newMutedWord, setNewMutedWord] = useState('');

  // ----------------- PRIVACY CHECKUP WIZARD STATE -----------------
  const [checkupStep, setCheckupStep] = useState<number>(1);
  const [checkupComplete, setCheckupComplete] = useState<boolean>(
    settings.privacy?.privacyCheckupCompleted || false
  );

  useEffect(() => {
    if (currentUser) {
      setSettings(getUserSettings(currentUser.id));
      setLogs(getUserActivationLogs(currentUser.id));
      setFullName(currentUser.fullName);
      setNickName(currentUser.nickName);
      setBio(currentUser.bio || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setBannerUrl(currentUser.bannerUrl || '');
      setLocation(currentUser.location || '');
      setWebsite(currentUser.website || '');
    }
  }, [currentUser]);

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setErrorNotice(message);
      setTimeout(() => setErrorNotice(null), 4000);
    } else {
      setSuccessNotice(message);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
        <Lock className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-xs text-slate-400 mb-5">
          Please sign in to access your Accounts Center, privacy controls, and security logs.
        </p>
        <button
          onClick={onRequestAuth}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  // ----------------- HANDLERS -----------------

  // 1. Profile Modification Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setPasswordError(null);

    // Compress data URLs if raw uncompressed data URLs were pasted or provided
    const finalAvatar = avatarUrl ? await compressDataUrl(avatarUrl, 400, 400, 0.85) : avatarUrl;
    const finalBanner = bannerUrl ? await compressDataUrl(bannerUrl, 1200, 450, 0.82) : bannerUrl;

    const result = updateUserProfile(currentUser.id, {
      fullName,
      nickName,
      bio,
      avatarUrl: finalAvatar,
      bannerUrl: finalBanner,
      location,
      website,
    });

    if (!result.success) {
      showToast(result.error || 'Failed to update profile.', true);
      return;
    }

    if (result.user) {
      onUserUpdated(result.user);
    }
    setLogs(getUserActivationLogs(currentUser.id));
    showToast('Profile updated successfully! Changes are live across PulseX.');
  };

  // 2. Change Password
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current password is required to authorize password change.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    const result = changeUserPassword(currentUser.id, currentPassword, newPassword);

    if (!result.success) {
      setPasswordError(result.error || 'Password update failed.');
      return;
    }

    // Success
    setPasswordSuccess('Password changed successfully! Keep your credentials secure.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setLogs(getUserActivationLogs(currentUser.id));
    showToast('Password updated successfully.');
  };

  // 3. User Settings Update Helper
  const handleUpdateSettings = (updates: Partial<UserSettings>) => {
    const updated = updateUserSettings(currentUser.id, updates);
    setSettings(updated);
    setLogs(getUserActivationLogs(currentUser.id));
    showToast('Preferences saved.');
  };

  // 4. Muted Words Add/Remove
  const handleAddMutedWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newMutedWord.trim().toLowerCase();
    if (!word) return;
    if (settings.contentPreferences.mutedWords.includes(word)) {
      showToast(`'${word}' is already in your muted list.`, true);
      return;
    }
    const updated = [...settings.contentPreferences.mutedWords, word];
    handleUpdateSettings({
      contentPreferences: {
        ...settings.contentPreferences,
        mutedWords: updated,
      },
    });
    setNewMutedWord('');
  };

  const handleRemoveMutedWord = (word: string) => {
    const updated = settings.contentPreferences.mutedWords.filter((w) => w !== word);
    handleUpdateSettings({
      contentPreferences: {
        ...settings.contentPreferences,
        mutedWords: updated,
      },
    });
  };

  // 5. Data Export (Download JSON archive)
  const handleExportDataArchive = () => {
    const allPosts = getAllPosts().filter((p) => p.authorId === currentUser.id);
    const allComments = getAllComments().filter((c) => c.authorHandle === currentUser.nickName);
    const archiveData = {
      archiveGeneratedAt: new Date().toISOString(),
      platform: 'PulseX Decentral Network',
      user: {
        id: currentUser.id,
        fullName: currentUser.fullName,
        nickName: currentUser.nickName,
        email: currentUser.email,
        bio: currentUser.bio,
        location: currentUser.location,
        website: currentUser.website,
        joinedAt: currentUser.joinedAt,
      },
      settings,
      activationLogs: logs,
      posts: allPosts,
      comments: allComments,
    };

    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulsex_data_archive_${currentUser.nickName.replace('@', '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addActivationLog(currentUser.id, 'Data Archive Exported', 'success');
    showToast('Data archive downloaded successfully.');
  };

  // Preset images
  const PRESET_BANNERS = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
  ];

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  ];

  const LANGUAGES = [
    { code: 'en', name: 'English (United States)', flag: '🇺🇸', native: 'English' },
    { code: 'es', name: 'Español', flag: '🇪🇸', native: 'Español' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', native: 'Français' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', native: 'Deutsch' },
    { code: 'ja', name: '日本語', flag: '🇯🇵', native: 'Japanese' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', native: 'Arabic' },
    { code: 'pt', name: 'Português (Brasil)', flag: '🇧🇷', native: 'Português' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳', native: 'Chinese Simplified' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', native: 'Hindi' },
  ];

  return (
    <div className="w-full">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#070b14]/90 backdrop-blur-md pb-3 pt-1 border-b border-slate-800/80 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Settings &amp; Accounts</h1>
          <p className="text-[11px] text-slate-400">
            Manage your credentials, privacy checkup, language, and system preferences.
          </p>
        </div>

        <button
          onClick={onNavigateProfile}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
        >
          <UserIcon className="w-3.5 h-3.5 text-blue-400" />
          <span>View Profile</span>
        </button>
      </div>

      {/* Global Notices */}
      {successNotice && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Settings Navigation Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl mb-5 text-xs font-medium">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('language')}
          className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
            activeTab === 'language'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Language</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy_checkup')}
          className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
            activeTab === 'privacy_checkup'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Checkup</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy_center')}
          className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
            activeTab === 'privacy_center'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Privacy</span>
        </button>

        <button
          onClick={() => setActiveTab('activation_logs')}
          className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
            activeTab === 'activation_logs'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('content_preferences')}
          className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
            activeTab === 'content_preferences'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Content</span>
        </button>

        <button
          onClick={() => setActiveTab('app_settings')}
          className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
            activeTab === 'app_settings'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Settings</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. ACCOUNTS CENTER                                          */}
      {/* ============================================================ */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* Section: Profile Modification */}
          <div className="p-5 sm:p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Profile Modification</h2>
                  <p className="text-[11px] text-slate-400">
                    Change profile picture, bio, banner, and personal identity.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Hidden File Inputs for Banner & Avatar Upload */}
              <input
                type="file"
                ref={bannerFileInputRef}
                accept="image/*"
                onChange={handleBannerFileSelect}
                className="hidden"
              />
              <input
                type="file"
                ref={avatarFileInputRef}
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />

              {/* Banner Preview & Upload System */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Profile Banner Image
                </label>
                <div className="h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative mb-2.5 group">
                  {bannerUrl ? (
                    <img
                      src={bannerUrl}
                      alt="Banner Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 font-mono">
                      No banner image set (Default gradient active)
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-bold text-xs transition-opacity backdrop-blur-xs"
                  >
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Upload New Banner File</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Banner Photo</span>
                  </button>

                  <input
                    type="url"
                    placeholder="Or enter Banner Image URL (https://...)"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />

                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setBannerUrl('')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Banner Presets */}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Presets:</span>
                  <div className="flex gap-1.5">
                    {PRESET_BANNERS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setBannerUrl(url)}
                        className={`w-12 h-6 rounded-md overflow-hidden border ${
                          bannerUrl === url ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-800'
                        }`}
                      >
                        <img src={url} alt={`Banner ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Avatar Preview & Upload System */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Profile Picture (Avatar)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-2">
                  <div
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="relative group shrink-0 cursor-pointer"
                    title="Click to upload profile photo"
                  >
                    <img
                      src={avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                      alt="Avatar Preview"
                      referrerPolicy="no-referrer"
                      className="w-18 h-18 rounded-full object-cover border-2 border-blue-500/50 bg-slate-800 shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                      <Camera className="w-5 h-5 text-blue-400 mb-0.5" />
                      <span className="text-[9px] font-bold">Upload</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => avatarFileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo File</span>
                      </button>

                      <input
                        type="url"
                        placeholder="Or enter Avatar Image URL (https://...)"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Presets:</span>
                      <div className="flex gap-1.5">
                        {PRESET_AVATARS.map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAvatarUrl(url)}
                            className={`w-6 h-6 rounded-full overflow-hidden border ${
                              avatarUrl === url ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-800'
                            }`}
                          >
                            <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Name & Handle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nickname / Handle
                  </label>
                  <input
                    type="text"
                    required
                    value={nickName}
                    onChange={(e) => setNickName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Bio Description</label>
                  <span className="text-[10px] text-slate-500 font-mono">{bio.length}/280</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={280}
                  placeholder="Tell the community about your projects, interests, and insights..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Location & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://yourportfolio.io"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Profile Modifications</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section: Change Password (CRITICAL REQUIREMENT: Needs current pass for change) */}
          <div className="p-5 sm:p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Security &amp; Password</h2>
                  <p className="text-[11px] text-slate-400">
                    Change your password. <span className="text-amber-400 font-semibold">Your current password is required</span> to verify authorization.
                  </p>
                </div>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              {/* Current Password Field */}
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">
                  Current Password <span className="text-red-400">* Required for verification</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password (min. 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Create a strong new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Verify Current Pass &amp; Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. LANGUAGE PREFERENCES                                     */}
      {/* ============================================================ */}
      {activeTab === 'language' && (
        <div className="p-5 sm:p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Language &amp; Localization</h2>
              <p className="text-[11px] text-slate-400">
                Choose your primary language for interface translation and date/number formatting.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {LANGUAGES.map((lang) => {
              const selected = settings.language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleUpdateSettings({ language: lang.code })}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    selected
                      ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500/50'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{lang.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{lang.native}</div>
                    </div>
                  </div>
                  {selected && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              );
            })}
          </div>

          {/* Regional preview */}
          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
            <div className="text-xs font-semibold text-slate-300">Format Preview</div>
            <div className="flex flex-wrap gap-4 text-slate-400 text-[11px]">
              <div>
                Date format: <span className="text-white font-mono">{new Date().toLocaleDateString(settings.language)}</span>
              </div>
              <div>
                Time format: <span className="text-white font-mono">{new Date().toLocaleTimeString(settings.language)}</span>
              </div>
              <div>
                Number formatting: <span className="text-white font-mono">{(1254300).toLocaleString(settings.language)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. PRIVACY CHECKUP (Guided interactive wizard)              */}
      {/* ============================================================ */}
      {activeTab === 'privacy_checkup' && (
        <div className="p-5 sm:p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Interactive Privacy Checkup</h2>
                <p className="text-[11px] text-slate-400">
                  Step-by-step audit to inspect and optimize your public footprint and privacy barriers.
                </p>
              </div>
            </div>

            {checkupComplete ? (
              <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> 100% Protected
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl flex items-center gap-1.5">
                Step {checkupStep} of 4
              </span>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(checkupStep / 4) * 100}%` }}
            />
          </div>

          {/* Step 1: Post Visibility */}
          {checkupStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Step 1: Who can see your posts?</h3>
                <p className="text-xs text-slate-400">
                  Decide whether your timeline updates are visible globally or restricted to confirmed followers.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'public', label: 'Public (Recommended)', desc: 'Anyone on or off PulseX can see your posts.' },
                  { id: 'followers', label: 'Followers Only', desc: 'Only users who follow your profile can see your timeline.' },
                  { id: 'private', label: 'Private Restricted', desc: 'Hidden from public feed search and discovery.' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      handleUpdateSettings({
                        privacy: { ...settings.privacy, profileVisibility: opt.id as any },
                      })
                    }
                    className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                      settings.privacy.profileVisibility === opt.id
                        ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[11px] text-slate-400">{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => setCheckupStep(2)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Search Engine & Discoverability */}
          {checkupStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Step 2: Search Visibility &amp; Findability</h3>
                <p className="text-xs text-slate-400">
                  Manage how people discover your profile using external search engines or email matching.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Let search engines index your profile</div>
                    <div className="text-[11px] text-slate-400">Allows Google and Bing to include your PulseX profile.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.privacy.searchEngineIndexing}
                    onChange={(e) =>
                      handleUpdateSettings({
                        privacy: { ...settings.privacy, searchEngineIndexing: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Discoverable by email address</div>
                    <div className="text-[11px] text-slate-400">Allow friends to find your account by typing your email.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.privacy.discoverableByEmail}
                    onChange={(e) =>
                      handleUpdateSettings({
                        privacy: { ...settings.privacy, discoverableByEmail: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                </label>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  onClick={() => setCheckupStep(1)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={() => setCheckupStep(3)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Direct Messaging */}
          {checkupStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Step 3: Direct Messaging Controls</h3>
                <p className="text-xs text-slate-400">
                  Control who can start direct private conversations with you.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'everyone', label: 'Everyone', desc: 'Any verified or registered user can send you a message.' },
                  { id: 'following', label: 'Accounts you follow only', desc: 'Only mutual accounts or people you follow can message you.' },
                  { id: 'nobody', label: 'Nobody', desc: 'Disable new inbound direct conversations completely.' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      handleUpdateSettings({
                        privacy: { ...settings.privacy, allowDirectMessages: opt.id as any },
                      })
                    }
                    className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                      settings.privacy.allowDirectMessages === opt.id
                        ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[11px] text-slate-400">{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-3">
                <button
                  onClick={() => setCheckupStep(2)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={() => setCheckupStep(4)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Tagging & Read Receipts */}
          {checkupStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Step 4: Mentions, Tags &amp; Read Receipts</h3>
                <p className="text-xs text-slate-400">
                  Final privacy barrier checks for read receipts and handle mentions.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Send Read Receipts in Messages</div>
                    <div className="text-[11px] text-slate-400">Show when you have viewed messages in direct chats.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.privacy.showReadReceipts}
                    onChange={(e) =>
                      handleUpdateSettings({
                        privacy: { ...settings.privacy, showReadReceipts: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                </label>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  onClick={() => setCheckupStep(3)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    handleUpdateSettings({
                      privacy: {
                        ...settings.privacy,
                        privacyCheckupCompleted: true,
                        lastCheckupDate: new Date().toISOString(),
                      },
                    });
                    setCheckupComplete(true);
                    showToast('Privacy checkup completed! Your account is hardened.');
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Finish &amp; Apply All Safeguards</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. PRIVACY CENTER                                           */}
      {/* ============================================================ */}
      {activeTab === 'privacy_center' && (
        <div className="p-5 sm:p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Privacy Center &amp; Data Rights</h2>
              <p className="text-[11px] text-slate-400">
                Granular security controls, data export capabilities, and confidentiality policies.
              </p>
            </div>
          </div>

          {/* Data Export / Archive */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-400" />
                <span>Download Your Data Archive</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                Export a full JSON copy of your profile data, authored posts, replies, bookmarks, and activation logs.
              </p>
            </div>
            <button
              onClick={handleExportDataArchive}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/30 shrink-0"
            >
              Export JSON Archive
            </button>
          </div>

          {/* Granular Toggles */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300">Granular Privacy Toggles</h3>

            <label className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">Search Engine Web Indexing</div>
                <div className="text-[11px] text-slate-400">Prevent external web crawlers from linking your posts.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.privacy.searchEngineIndexing}
                onChange={(e) =>
                  handleUpdateSettings({
                    privacy: { ...settings.privacy, searchEngineIndexing: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">Message Read Status</div>
                <div className="text-[11px] text-slate-400">Transmit real-time message read receipts to peers.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.privacy.showReadReceipts}
                onChange={(e) =>
                  handleUpdateSettings({
                    privacy: { ...settings.privacy, showReadReceipts: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">Email Address Discovery</div>
                <div className="text-[11px] text-slate-400">Allow users to look up your account handle via your registered email.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.privacy.discoverableByEmail}
                onChange={(e) =>
                  handleUpdateSettings({
                    privacy: { ...settings.privacy, discoverableByEmail: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
            </label>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. ACTIVATION LOGS (Audit trail)                            */}
      {/* ============================================================ */}
      {activeTab === 'activation_logs' && (
        <div className="p-5 sm:p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Security &amp; Activation Logs</h2>
                <p className="text-[11px] text-slate-400">
                  Real-time audit log of authenticated sessions, logins, IP locations, and security updates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLogs(getUserActivationLogs(currentUser.id));
                  showToast('Logs refreshed.');
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                title="Refresh audit logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  clearOtherActivationSessions(currentUser.id);
                  setLogs(getUserActivationLogs(currentUser.id));
                  showToast('All other sessions terminated.');
                }}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out other devices</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{log.action}</span>
                    {log.isCurrentSession && (
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                        THIS DEVICE
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                        log.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : log.status === 'warning'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{log.device}</span>
                    <span>•</span>
                    <span className="font-mono">{log.ipAddress}</span>
                    <span>•</span>
                    <span>{log.location}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. CONTENT PREFERENCES                                      */}
      {/* ============================================================ */}
      {activeTab === 'content_preferences' && (
        <div className="p-5 sm:p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Content Preferences</h2>
              <p className="text-[11px] text-slate-400">
                Filter sensitive media, manage muted words/hashtags, and customize timeline algorithms.
              </p>
            </div>
          </div>

          {/* Sensitive Content Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white block">Sensitive Content Filter</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'standard', title: 'Standard (Default)', desc: 'Warn before showing sensitive media.' },
                { id: 'strict', title: 'Strict Filter', desc: 'Completely hide potentially sensitive media.' },
                { id: 'off', title: 'Filter Off', desc: 'Display all media without safety overlays.' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() =>
                    handleUpdateSettings({
                      contentPreferences: {
                        ...settings.contentPreferences,
                        sensitiveContentFilter: lvl.id as any,
                      },
                    })
                  }
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.contentPreferences.sensitiveContentFilter === lvl.id
                      ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-xs font-bold">{lvl.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{lvl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Muted Words Manager */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div>
              <label className="text-xs font-bold text-white block">Muted Words &amp; Hashtags</label>
              <p className="text-[11px] text-slate-400">
                Posts containing these words or tags won't appear on your Home timeline.
              </p>
            </div>

            <form onSubmit={handleAddMutedWord} className="flex gap-2">
              <input
                type="text"
                placeholder="Add word or phrase to mute (e.g., spoiler, crypto)"
                value={newMutedWord}
                onChange={(e) => setNewMutedWord(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newMutedWord.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
              >
                Add Word
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-1">
              {settings.contentPreferences.mutedWords.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No muted words yet.</span>
              ) : (
                settings.contentPreferences.mutedWords.map((word) => (
                  <span
                    key={word}
                    className="px-3 py-1 bg-slate-800 text-slate-200 text-xs rounded-xl border border-slate-700 flex items-center gap-1.5"
                  >
                    <span>{word}</span>
                    <button
                      onClick={() => handleRemoveMutedWord(word)}
                      className="text-slate-400 hover:text-red-400 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Trending Location */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <label className="text-xs font-bold text-white block">Explore &amp; Trend Region</label>
            <select
              value={settings.contentPreferences.trendLocation}
              onChange={(e) =>
                handleUpdateSettings({
                  contentPreferences: {
                    ...settings.contentPreferences,
                    trendLocation: e.target.value,
                  },
                })
              }
              className="w-full sm:w-64 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Worldwide">Worldwide (Global trends)</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="European Union">European Union</option>
              <option value="Asia Pacific">Asia Pacific</option>
              <option value="Latin America">Latin America</option>
            </select>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. SETTINGS IN SETTINGS (App Preferences)                   */}
      {/* ============================================================ */}
      {activeTab === 'app_settings' && (
        <div className="p-5 sm:p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Settings in Settings (App Controls)</h2>
              <p className="text-[11px] text-slate-400">
                System appearance, typography scale, sound cues, quiet hours, and interface density.
              </p>
            </div>
          </div>

          {/* Theme Palette */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white block">Interface Appearance Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'dark', label: 'Dark Obsidian', icon: Moon, desc: 'Deep black & slate' },
                { id: 'midnight', label: 'Midnight Blue', icon: Palette, desc: 'Indigo & cyber tones' },
                { id: 'light', label: 'Contrast Daylight', icon: Sun, desc: 'Clean high visibility' },
              ].map((thm) => {
                const Icon = thm.icon;
                const active = settings.appSettings.theme === thm.id;
                return (
                  <button
                    key={thm.id}
                    onClick={() =>
                      handleUpdateSettings({
                        appSettings: { ...settings.appSettings, theme: thm.id as any },
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1 text-blue-400" />
                    <div className="text-xs font-bold">{thm.label}</div>
                    <div className="text-[10px] text-slate-400">{thm.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Scale */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <label className="text-xs font-bold text-white block">Font Size Scale</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'small', label: 'Compact (13px)' },
                { id: 'medium', label: 'Default (14px)' },
                { id: 'large', label: 'Comfortable (16px)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    handleUpdateSettings({
                      appSettings: { ...settings.appSettings, fontSize: f.id as any },
                    })
                  }
                  className={`py-2 px-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                    settings.appSettings.fontSize === f.id
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Notifications & Quiet Hours */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-white">Audio &amp; Quiet Schedule</h3>

            <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-bold text-white">Interface Audio Feedback</div>
                  <div className="text-[11px] text-slate-400">Play subtle chime on post interactions and likes.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.appSettings.soundEffects}
                onChange={(e) =>
                  handleUpdateSettings({
                    appSettings: { ...settings.appSettings, soundEffects: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white">Quiet Hours Mode</div>
                  <div className="text-[11px] text-slate-400">Silence incoming notification popups during sleep hours.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.appSettings.quietHoursEnabled}
                onChange={(e) =>
                  handleUpdateSettings({
                    appSettings: { ...settings.appSettings, quietHoursEnabled: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
            </label>

            {settings.appSettings.quietHoursEnabled && (
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 mr-2">From:</span>
                  <input
                    type="time"
                    value={settings.appSettings.quietHoursStart}
                    onChange={(e) =>
                      handleUpdateSettings({
                        appSettings: { ...settings.appSettings, quietHoursStart: e.target.value },
                      })
                    }
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 mr-2">To:</span>
                  <input
                    type="time"
                    value={settings.appSettings.quietHoursEnd}
                    onChange={(e) =>
                      handleUpdateSettings({
                        appSettings: { ...settings.appSettings, quietHoursEnd: e.target.value },
                      })
                    }
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
