import React, { useState } from 'react';
import { X, CalendarClock, Clock, Trash2, Send, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { ScheduledPost, User } from '../types';
import { deleteScheduledPost, publishScheduledPostNow } from '../services/storage';
import { updateScheduledPostInFirestore } from '../services/firebaseService';

interface ScheduledPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  scheduledPosts: ScheduledPost[];
  onUpdated: () => void;
}

export const ScheduledPostsModal: React.FC<ScheduledPostsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  scheduledPosts,
  onUpdated,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDatetime, setEditDatetime] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const userPosts = currentUser
    ? scheduledPosts.filter((p) => p.authorId === currentUser.id && p.status === 'pending')
    : [];

  const handlePublishNow = (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = publishScheduledPostNow(id);
    if (res.success) {
      setActionSuccess('Post published to live feed immediately!');
      onUpdated();
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      setActionError(res.error || 'Failed to publish post.');
    }
  };

  const handleDelete = (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    deleteScheduledPost(id);
    setActionSuccess('Scheduled post removed.');
    onUpdated();
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const startEditing = (post: ScheduledPost) => {
    setEditingId(post.id);
    // Format for datetime-local input
    const d = new Date(post.scheduledFor);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setEditDatetime(localIso);
  };

  const saveEditedDate = async (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    const newDate = new Date(editDatetime);
    if (isNaN(newDate.getTime()) || newDate.getTime() <= Date.now() + 30000) {
      setActionError('New scheduled time must be at least 1 minute in the future.');
      return;
    }

    try {
      await updateScheduledPostInFirestore(id, { scheduledFor: newDate.toISOString() });
      setActionSuccess('Scheduled publication time updated.');
      setEditingId(null);
      onUpdated();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      setActionError('Failed to update scheduled time.');
    }
  };

  const formatScheduledTime = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();

    let relative = '';
    if (diffMs > 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        relative = `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        relative = `in ~${diffHours} hr${diffHours > 1 ? 's' : ''}`;
      } else {
        relative = `in ~${Math.max(1, diffMins)} min${diffMins > 1 ? 's' : ''}`;
      }
    } else {
      relative = 'Due now (publishing soon)';
    }

    const formatted = d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    return { formatted, relative };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Scheduled Posts Queue
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full">
                  {userPosts.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Posts drafted to publish automatically at a future date and time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback banners */}
        {actionSuccess && (
          <div className="mx-5 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Body / List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {userPosts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
                <CalendarClock className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No scheduled posts</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Compose a post in the creator and click the Schedule button to set a future date and time for publication.
              </p>
            </div>
          ) : (
            userPosts.map((post) => {
              const { formatted, relative } = formatScheduledTime(post.scheduledFor);
              const isEditing = editingId === post.id;

              return (
                <div
                  key={post.id}
                  className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl hover:border-slate-700/80 transition-all space-y-3"
                >
                  {/* Scheduling Timestamp Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatted}</span>
                      <span className="text-[11px] text-blue-300/80 font-normal">({relative})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => (isEditing ? setEditingId(null) : startEditing(post))}
                        className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        {isEditing ? 'Cancel Edit' : 'Edit Time'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishNow(post.id)}
                        className="px-2.5 py-1 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-blue-500/20"
                        title="Publish this post right now"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publish Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete scheduled draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Time Editor */}
                  {isEditing && (
                    <div className="p-3 bg-slate-900 border border-blue-500/30 rounded-lg flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-300 font-medium">New publication time:</span>
                      <input
                        type="datetime-local"
                        value={editDatetime}
                        onChange={(e) => setEditDatetime(e.target.value)}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-md text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => saveEditedDate(post.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {/* Content Preview */}
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>

                  {/* Media Preview if attached */}
                  {post.mediaUrl && (
                    <div className="rounded-lg overflow-hidden border border-slate-800 max-h-44 w-full">
                      <img
                        src={post.mediaUrl}
                        alt="Scheduled post attachment"
                        referrerPolicy="no-referrer"
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 bg-slate-800 text-[11px] text-blue-400 rounded-md"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Synced with Firebase Firestore (`scheduled` collection)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
