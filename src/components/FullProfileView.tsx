import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  ShieldCheck,
  Edit3,
  Settings,
  Share2,
  Check,
  MessageCircle,
  UserPlus,
  UserCheck,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Heart,
  Repeat,
  Grid,
  MessageSquare,
  ArrowLeft,
  ShieldAlert,
  Upload,
  MoreVertical,
  VolumeX,
  Volume2,
  Ban,
  UserMinus,
} from 'lucide-react';
import { User, Post, Comment } from '../types';
import {
  getAllPosts,
  getAllUsers,
  getAllComments,
  saveAllUsers,
  updateUserProfile,
  getUserSettings,
  muteUser,
  unmuteUser,
  blockUser,
  unblockUser,
} from '../services/storage';
import { compressImageFile, compressDataUrl } from '../utils/imageUtils';
import { PostCard } from './PostCard';

interface FullProfileViewProps {
  currentUser: User | null;
  targetHandle?: string | null;
  onNavigateHome: () => void;
  onNavigateSettings: (tab?: string) => void;
  onStartMessageWithUser?: (userId: string) => void;
  onRequestAuth: () => void;
  onBannedAttempt: (user: User) => void;
  onSelectPost?: (postId: string) => void;
  onOpenProfile: (handle: string) => void;
}

export const FullProfileView: React.FC<FullProfileViewProps> = ({
  currentUser,
  targetHandle,
  onNavigateHome,
  onNavigateSettings,
  onStartMessageWithUser,
  onRequestAuth,
  onBannedAttempt,
  onSelectPost,
  onOpenProfile,
}) => {
  const users = getAllUsers();
  const effectiveHandle = targetHandle || currentUser?.nickName || '';
  const cleanHandle = effectiveHandle.toLowerCase();

  const profileUser = users.find(
    (u) => u.nickName.toLowerCase() === cleanHandle || u.id === targetHandle
  );

  const isOwnProfile = currentUser && profileUser && currentUser.id === profileUser.id;

  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    if (currentUser && profileUser) {
      const settings = getUserSettings(currentUser.id);
      setIsMuted(settings.privacy.mutedUserIds.includes(profileUser.id));
      setIsBlocked(settings.privacy.blockedUserIds.includes(profileUser.id));
    }
  }, [currentUser, profileUser]);

  const [quickMediaModal, setQuickMediaModal] = useState<'avatar' | 'banner' | null>(null);
  const [mediaInputUrl, setMediaInputUrl] = useState('');
  const [bannerSaveNotice, setBannerSaveNotice] = useState<string | null>(null);

  const quickFileInputRef = useRef<HTMLInputElement>(null);

  const handleQuickFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isBanner = quickMediaModal === 'banner';
      const compressedUrl = await compressImageFile(
        file,
        isBanner ? 1200 : 400,
        isBanner ? 450 : 400,
        isBanner ? 0.82 : 0.85
      );
      setMediaInputUrl(compressedUrl);
    } catch (err) {
      alert('Failed to process selected image file.');
    }
    e.target.value = '';
  };

  const [allPosts, setAllPosts] = useState<Post[]>(() => getAllPosts());
  const [allComments, setAllComments] = useState<Comment[]>(() => getAllComments());

  const reloadData = () => {
    setAllPosts(getAllPosts());
    setAllComments(getAllComments());
  };

  useEffect(() => {
    if (profileUser && currentUser) {
      setIsFollowing(currentUser.following.includes(profileUser.id));
      setFollowersCount(profileUser.followersCount);
    } else if (profileUser) {
      setFollowersCount(profileUser.followersCount);
    }
  }, [profileUser, currentUser]);

  if (!profileUser) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">User Not Found</h2>
        <p className="text-xs text-slate-400 mb-5">
          The profile for <span className="text-blue-400 font-mono">{effectiveHandle || 'this user'}</span> does not exist or has been removed.
        </p>
        <button
          onClick={onNavigateHome}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Feed</span>
        </button>
      </div>
    );
  }

  const userPosts = allPosts.filter(
    (p) =>
      p.authorHandle.toLowerCase() === profileUser.nickName.toLowerCase() ||
      (p.postType === 'repost' && p.repostedBy?.handle.toLowerCase() === profileUser.nickName.toLowerCase())
  );

  const mediaPosts = userPosts.filter((p) => Boolean(p.mediaUrl));
  const likedPosts = allPosts.filter((p) => p.likes.includes(profileUser.id));
  const userComments = allComments.filter((c) => c.authorHandle.toLowerCase() === profileUser.nickName.toLowerCase());

  const totalLikesReceived = allPosts
    .filter((p) => p.authorId === profileUser.id)
    .reduce((acc, p) => acc + (p.likes?.length || 0), 0);

  const handleToggleFollow = () => {
    if (!currentUser) {
      onRequestAuth();
      return;
    }
    if (currentUser.banStatus?.isBanned) {
      onBannedAttempt(currentUser);
      return;
    }

    const updatedUsers = getAllUsers();
    const currIdx = updatedUsers.findIndex((u) => u.id === currentUser.id);
    const targetIdx = updatedUsers.findIndex((u) => u.id === profileUser.id);

    if (currIdx === -1 || targetIdx === -1) return;

    if (isFollowing) {
      updatedUsers[currIdx].following = updatedUsers[currIdx].following.filter((id) => id !== profileUser.id);
      updatedUsers[targetIdx].followersCount = Math.max(0, updatedUsers[targetIdx].followersCount - 1);
      setIsFollowing(false);
      setFollowersCount((prev) => Math.max(0, prev - 1));
    } else {
      if (!updatedUsers[currIdx].following.includes(profileUser.id)) {
        updatedUsers[currIdx].following.push(profileUser.id);
      }
      updatedUsers[targetIdx].followersCount += 1;
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    }

    saveAllUsers(updatedUsers);
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}?user=${encodeURIComponent(profileUser.nickName)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleQuickMediaSave = async () => {
    if (!currentUser || !mediaInputUrl.trim()) return;
    const isBanner = quickMediaModal === 'banner';
    const compressed = await compressDataUrl(
      mediaInputUrl.trim(),
      isBanner ? 1200 : 400,
      isBanner ? 450 : 400,
      isBanner ? 0.82 : 0.85
    );

    if (quickMediaModal === 'banner') {
      updateUserProfile(currentUser.id, { bannerUrl: compressed });
      setBannerSaveNotice('Banner updated successfully!');
    } else if (quickMediaModal === 'avatar') {
      updateUserProfile(currentUser.id, { avatarUrl: compressed });
      setBannerSaveNotice('Profile picture updated successfully!');
    }
    setQuickMediaModal(null);
    setMediaInputUrl('');
    reloadData();
    setTimeout(() => setBannerSaveNotice(null), 3000);
  };

  const PRESET_BANNERS = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  ];

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  ];

  return (
    <div className="w-full">
      {/* Top Breadcrumb & Action bar */}
      <div className="sticky top-0 z-20 bg-[#070b14]/90 backdrop-blur-md pb-3 pt-1 border-b border-slate-800/80 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Back to feed"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                {profileUser.fullName}
              </h1>
              {profileUser.isVerified && (
                <span title="Verified Member">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {userPosts.length} post{userPosts.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareProfile}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            title="Share profile link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </>
            )}
          </button>

          {isOwnProfile && (
            <button
              onClick={() => onNavigateSettings('accounts')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-blue-600/30"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {bannerSaveNotice && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bannerSaveNotice}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl mb-4">
        {/* Banner Area */}
        <div className="h-44 sm:h-52 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 relative group overflow-hidden">
          {profileUser.bannerUrl ? (
            <img
              src={profileUser.bannerUrl}
              alt="Profile banner"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-700/30 via-slate-900/60 to-slate-950 flex items-center justify-center">
              <span className="text-xs font-mono text-slate-500 tracking-widest uppercase">
                PulseX Decentral Space
              </span>
            </div>
          )}

          {isOwnProfile && (
            <button
              onClick={() => setQuickMediaModal('banner')}
              className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-medium rounded-xl border border-white/10 flex items-center gap-1.5 transition-all opacity-90 group-hover:opacity-100"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Banner</span>
            </button>
          )}
        </div>

        {/* Profile Avatar & Actions row */}
        <div className="px-5 sm:px-6 pb-6 pt-0 relative">
          <div className="flex flex-wrap items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-3">
            {/* Avatar */}
            <div className="relative group">
              <img
                src={profileUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                alt={profileUser.fullName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-900 bg-slate-800 shadow-2xl"
              />
              {isOwnProfile && (
                <button
                  onClick={() => setQuickMediaModal('avatar')}
                  className="absolute inset-0 bg-black/40 hover:bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Change profile picture"
                >
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-semibold">Change</span>
                </button>
              )}
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => onNavigateSettings('accounts')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Accounts Center</span>
                  </button>
                  <button
                    onClick={() => onNavigateSettings('settings')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all"
                    title="All Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {onStartMessageWithUser && (
                    <button
                      onClick={() => onStartMessageWithUser(profileUser.id)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                      title="Send Direct Message"
                    >
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                      <span>Message</span>
                    </button>
                  )}
                  <button
                    onClick={handleToggleFollow}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                      isFollowing
                        ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  {/* More Menu for Mute/Block */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showMoreMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 p-1">
                        <button
                          onClick={() => {
                            if (isMuted) unmuteUser(currentUser!.id, profileUser.id);
                            else muteUser(currentUser!.id, profileUser.id);
                            setIsMuted(!isMuted);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg"
                        >
                          {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                          {isMuted ? 'Unmute' : 'Mute'} {profileUser.nickName}
                        </button>
                        <button
                          onClick={() => {
                            if (isBlocked) unblockUser(currentUser!.id, profileUser.id);
                            else blockUser(currentUser!.id, profileUser.id);
                            setIsBlocked(!isBlocked);
                            setShowMoreMenu(false);
                            if (!isBlocked) onNavigateHome(); // Redirect if blocked
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/20 rounded-lg"
                        >
                          {isBlocked ? <UserMinus className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          {isBlocked ? 'Unblock' : 'Block'} {profileUser.nickName}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {profileUser.fullName}
                </h2>
                {profileUser.isVerified && (
                  <span title="Verified PulseX Member">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  </span>
                )}
                {profileUser.role === 'admin' && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-600/20 text-red-400 border border-red-500/30 rounded-md">
                    ADMIN
                  </span>
                )}
                {profileUser.role === 'moderator' && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-md">
                    MOD
                  </span>
                )}
              </div>
              <p className="text-sm font-mono text-blue-400">{profileUser.nickName}</p>
            </div>

            {/* Bio */}
            {profileUser.bio ? (
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {profileUser.bio}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">No bio provided yet.</p>
            )}

            {/* Community Guideline Warning Notices Box */}
            {profileUser.guidelineWarnings && profileUser.guidelineWarnings.length > 0 && (
              <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-2xl text-xs space-y-2 my-3 animate-fadeIn">
                <div className="flex items-center justify-between text-red-400 font-bold">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Platform Guideline Notices ({profileUser.guidelineWarnings.length})</span>
                  </div>
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30 font-mono">
                    Moderation Record
                  </span>
                </div>
                {profileUser.guidelineWarnings.map((warn) => (
                  <div key={warn.id} className="p-2.5 bg-slate-950/90 border border-red-500/20 rounded-xl text-slate-300 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-red-300 font-semibold">
                      <span>Violation: {warn.reason}</span>
                      <time className="text-[10px] text-slate-500">{new Date(warn.timestamp).toLocaleDateString()}</time>
                    </div>
                    {warn.deletedPostSnippet && (
                      <p className="text-[11px] text-slate-400 italic">
                        Deleted post snippet: "{warn.deletedPostSnippet}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Metadata Badges: Location, Website, Joined Date */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-400 pt-1">
              {profileUser.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{profileUser.location}</span>
                </div>
              )}

              {profileUser.website && (
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                  <a
                    href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline truncate max-w-xs"
                  >
                    {profileUser.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Joined{' '}
                  {new Date(profileUser.joinedAt || Date.now()).toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Social Stats Counters */}
            <div className="flex items-center gap-6 pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm">{profileUser.following?.length || 0}</span>
                <span className="text-slate-400">Following</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm">{followersCount}</span>
                <span className="text-slate-400">Followers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm">{userPosts.length}</span>
                <span className="text-slate-400">Posts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm">{totalLikesReceived}</span>
                <span className="text-slate-400">Likes Earned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Tabs Navigation */}
        <div className="flex border-t border-slate-800/80 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'posts'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Posts ({userPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('replies')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'replies'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Replies ({userComments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'media'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media ({mediaPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'likes'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Likes ({likedPosts.length})</span>
          </button>
        </div>

        <div className="space-y-3">
          {activeTab === 'posts' && (
            userPosts.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
                <p className="text-sm font-semibold text-white">No posts yet</p>
              </div>
            ) : (
              userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onPostUpdated={reloadData}
                  onRequestAuth={onRequestAuth}
                  onBannedAttempt={onBannedAttempt}
                  onTagClick={() => {}}
                  onAuthorClick={(h) => onOpenProfile(h)}
                  onSelectPost={onSelectPost}
                />
              ))
            )
          )}

          {activeTab === 'replies' && (
            userComments.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">No replies found</p>
                <p className="text-xs text-slate-400 mt-1">{profileUser.fullName} hasn't commented on any discussions yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-start gap-3"
                  >
                    <img
                      src={comment.authorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                      alt={comment.authorName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{comment.authorName}</span>
                        <span className="text-[11px] font-mono text-blue-400">{comment.authorHandle}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 whitespace-pre-wrap">{comment.content}</p>
                      {onSelectPost && (
                        <button
                          onClick={() => onSelectPost(comment.postId)}
                          className="mt-2 text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline"
                        >
                          View Post Discussion
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'media' && (
            mediaPosts.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
                <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">No media posts</p>
                <p className="text-xs text-slate-400 mt-1">Photos and illustrations shared by this user will be cataloged here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {mediaPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onSelectPost && onSelectPost(post.id)}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video cursor-pointer"
                  >
                    <img
                      src={post.mediaUrl}
                      alt={post.content}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                      <p className="text-xs text-white line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-300 mt-1">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                          {post.likes.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat className="w-3 h-3 text-emerald-400" />
                          {post.reposts?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'likes' && (
            likedPosts.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
                <Heart className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">No liked posts yet</p>
                <p className="text-xs text-slate-400 mt-1">Posts liked by {profileUser.fullName} will appear here.</p>
              </div>
            ) : (
              likedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onPostUpdated={reloadData}
                  onRequestAuth={onRequestAuth}
                  onBannedAttempt={onBannedAttempt}
                  onTagClick={() => {}}
                  onAuthorClick={(h) => onOpenProfile(h)}
                  onSelectPost={onSelectPost}
                />
              ))
            )
          )}
        </div>

        {/* Quick Media Upload/URL Modal */}
        {quickMediaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2">
                {quickMediaModal === 'banner' ? 'Change Profile Banner' : 'Change Profile Picture'}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Select an image file from your device, enter an image URL, or choose a preset.
              </p>

              <input
                type="file"
                ref={quickFileInputRef}
                accept="image/*"
                onChange={handleQuickFileSelect}
                className="hidden"
              />

              <div className="space-y-4">
                {/* Direct File Upload Button */}
                <div
                  onClick={() => quickFileInputRef.current?.click()}
                  className="p-3.5 border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-600/5 hover:bg-blue-600/10 rounded-xl text-center cursor-pointer transition-all group"
                >
                  <Upload className="w-5 h-5 text-blue-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-white">Upload Image File from Device</p>
                  <p className="text-[10px] text-slate-400">Select any photo file (JPG, PNG, WEBP)</p>
                </div>

                {/* Preview if mediaInputUrl is set */}
                {mediaInputUrl && (
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                    <img
                      src={mediaInputUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg shrink-0 border border-blue-500/50"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">Image loaded</p>
                      <p className="text-[10px] text-emerald-400 font-mono">Ready to apply &amp; save</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMediaInputUrl('')}
                      className="text-xs text-slate-400 hover:text-red-400 font-bold px-2"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Or Paste Image Direct URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={mediaInputUrl}
                    onChange={(e) => setMediaInputUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Or pick a preset:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(quickMediaModal === 'banner' ? PRESET_BANNERS : PRESET_AVATARS).map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setMediaInputUrl(url)}
                        className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                          mediaInputUrl === url ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickMediaModal(null);
                      setMediaInputUrl('');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickMediaSave}
                    disabled={!mediaInputUrl.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/30"
                  >
                    Apply &amp; Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
