import React, { useState } from 'react';
import { X, Calendar, MapPin, Link as LinkIcon, ShieldCheck, MessageCircle, ExternalLink } from 'lucide-react';
import { User, Post } from '../types';
import { PostCard } from './PostCard';
import { getAllPosts, getAllUsers } from '../services/storage';

interface UserProfileModalProps {
  userHandle: string | null;
  currentUser: User | null;
  onClose: () => void;
  onRequestAuth: () => void;
  onBannedAttempt: (user: User) => void;
  onStartMessageWithUser?: (userId: string) => void;
  onOpenFullProfile?: (handle: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userHandle,
  currentUser,
  onClose,
  onRequestAuth,
  onBannedAttempt,
  onStartMessageWithUser,
  onOpenFullProfile,
}) => {
  if (!userHandle) return null;

  const users = getAllUsers();
  const cleanHandle = userHandle.toLowerCase();
  const profileUser = users.find((u) => u.nickName.toLowerCase() === cleanHandle);

  const [allPosts, setAllPosts] = useState<Post[]>(() => getAllPosts());
  const reloadPosts = () => setAllPosts(getAllPosts());

  const userPosts = allPosts.filter(
    (p) =>
      p.authorHandle.toLowerCase() === cleanHandle ||
      (p.postType === 'repost' && p.repostedBy?.handle.toLowerCase() === cleanHandle)
  );

  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'likes'>('posts');

  if (!profileUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-sm w-full">
          <p className="text-sm text-slate-300 mb-4">User {userHandle} was not found.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const mediaPosts = userPosts.filter((p) => Boolean(p.mediaUrl));
  const likedPosts = allPosts.filter((p) => p.likes.includes(profileUser.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl my-8 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-sm transition-colors"
          aria-label="Close user profile"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 relative shrink-0">
          <div className="absolute -bottom-10 left-6">
            <img
              src={profileUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
              alt={profileUser.fullName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-4 border-slate-900 shadow-xl"
            />
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-12 px-6 pb-4 shrink-0 border-b border-slate-800/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-bold text-white tracking-tight">{profileUser.fullName}</h2>
                {profileUser.isVerified && (
                  <span title="Verified Creator">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-400 font-mono">{profileUser.nickName}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenFullProfile && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenFullProfile(profileUser.nickName);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                  title="View complete profile page"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Full Profile</span>
                </button>
              )}

              {currentUser && currentUser.id !== profileUser.id && (
                <button
                  onClick={() => {
                    onClose();
                    if (onStartMessageWithUser) {
                      onStartMessageWithUser(profileUser.id);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
              )}
              {!currentUser && (
                <button
                  onClick={() => {
                    onClose();
                    onRequestAuth();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-200 mt-3 leading-relaxed font-normal">
            {profileUser.bio || 'Exploring the digital sphere on PulseX.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
            {profileUser.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profileUser.location}</span>
              </div>
            )}
            {profileUser.website && (
              <div className="flex items-center gap-1 text-blue-400">
                <LinkIcon className="w-3.5 h-3.5" />
                <a href={profileUser.website} target="_blank" rel="noreferrer" className="hover:underline">
                  {profileUser.website.replace('https://', '')}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Joined{' '}
                {new Date(profileUser.joinedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs mt-3 pt-3 border-t border-slate-800/60">
            <div>
              <span className="font-bold text-white font-mono">{profileUser.following.length}</span>{' '}
              <span className="text-slate-400">Following</span>
            </div>
            <div>
              <span className="font-bold text-white font-mono">{profileUser.followersCount}</span>{' '}
              <span className="text-slate-400">Followers</span>
            </div>
            <div>
              <span className="font-bold text-white font-mono">{userPosts.length}</span>{' '}
              <span className="text-slate-400">Posts</span>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-slate-800/80 px-6 shrink-0 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Posts ({userPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'media'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Media ({mediaPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'likes'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Likes ({likedPosts.length})
          </button>
        </div>

        {/* Tab Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'posts' &&
            (userPosts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No posts published yet.</p>
            ) : (
              userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onPostUpdated={reloadPosts}
                  onRequestAuth={onRequestAuth}
                  onBannedAttempt={onBannedAttempt}
                />
              ))
            ))}

          {activeTab === 'media' &&
            (mediaPosts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No media posted yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {mediaPosts.map((post) => (
                  <div key={post.id} className="rounded-xl overflow-hidden border border-slate-800">
                    <img
                      src={post.mediaUrl!}
                      alt="User media"
                      referrerPolicy="no-referrer"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                ))}
              </div>
            ))}

          {activeTab === 'likes' &&
            (likedPosts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No liked posts yet.</p>
            ) : (
              likedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onPostUpdated={reloadPosts}
                  onRequestAuth={onRequestAuth}
                  onBannedAttempt={onBannedAttempt}
                />
              ))
            ))}
        </div>
      </div>
    </div>
  );
};
