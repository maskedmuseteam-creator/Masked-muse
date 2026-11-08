import React from 'react';
import { Search, TrendingUp, Check, MessageSquare } from 'lucide-react';
import { User } from '../types';
import { getAllUsers } from '../services/storage';

interface RightSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  currentUser: User | null;
  onOpenAdmin?: () => void;
  onOpenProfile: (handle: string) => void;
  onRequestAuth: () => void;
  onStartMessageWithUser?: (userId: string) => void;
}

const TRENDING_TOPICS = [
  { tag: 'PulseX', postsCount: '1.4K', category: 'Platform' },
  { tag: 'Architecture', postsCount: '890', category: 'Design' },
  { tag: 'Engineering', postsCount: '620', category: 'Tech' },
  { tag: 'Minimalism', postsCount: '450', category: 'Lifestyle' },
  { tag: 'Dev', postsCount: '380', category: 'Coding' },
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  currentUser,
  onOpenAdmin,
  onOpenProfile,
  onRequestAuth,
  onStartMessageWithUser,
}) => {
  const allUsers = getAllUsers();
  // Filter users to follow (excluding current user and already followed)
  const suggestedUsers = allUsers
    .filter((u) => u.id !== currentUser?.id && u.role !== 'admin' && (!u.banStatus || !u.banStatus.isBanned))
    .slice(0, 3);

  return (
    <aside className="w-80 shrink-0 hidden lg:block space-y-4 py-4">
      {/* Search Bar */}
      <div className="sticky top-4 z-10">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search PulseX or @handles..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>Trending on PulseX</span>
          </h3>
          {selectedTag && (
            <button
              onClick={() => onTagSelect(null)}
              className="text-[11px] text-blue-400 hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>

        <div className="space-y-3">
          {TRENDING_TOPICS.map((topic) => {
            const isSelected = selectedTag === topic.tag;
            return (
              <button
                key={topic.tag}
                onClick={() => onTagSelect(isSelected ? null : topic.tag)}
                className={`w-full text-left p-2 rounded-xl transition-colors block ${
                  isSelected ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Trending in {topic.category}</span>
                  <span className="font-mono">{topic.postsCount} posts</span>
                </div>
                <div className="text-xs font-bold text-white mt-0.5">#{topic.tag}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Who to Follow */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white mb-3">Who to Follow</h3>
        <div className="space-y-3">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-2">
              <button
                onClick={() => onOpenProfile(user.nickName)}
                className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition-opacity"
              >
                <img
                  src={user.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                  alt={user.fullName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                />
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">{user.fullName}</div>
                  <div className="text-[11px] text-blue-400 font-mono truncate">{user.nickName}</div>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    if (!currentUser) onRequestAuth();
                    else if (onStartMessageWithUser) onStartMessageWithUser(user.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title={`Message ${user.nickName}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (!currentUser) onRequestAuth();
                    else alert(`Followed ${user.nickName}`);
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-full transition-colors"
                >
                  Follow
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clean quiet footer */}
      <div className="px-4 text-[11px] text-slate-500 space-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="#terms" className="hover:underline">Terms of Service</a>
          <a href="#privacy" className="hover:underline">Privacy Policy</a>
          <a href="#safety" className="hover:underline">Safety Guidelines</a>
        </div>
        <p>© 2026 PulseX Platform Inc. All rights reserved.</p>
      </div>
    </aside>
  );
};
