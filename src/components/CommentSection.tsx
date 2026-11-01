import React, { useState, useEffect } from 'react';
import { Send, Heart, User as UserIcon } from 'lucide-react';
import { User, Comment } from '../types';
import { getCommentsForPost, addComment, inspectBanStatus } from '../services/storage';
import { subscribeToComments } from '../services/firebaseService';

interface CommentSectionProps {
  postId: string;
  currentUser: User | null;
  onRequestAuth: () => void;
  onBannedAttempt: (user: User) => void;
  onCommentAdded: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser,
  onRequestAuth,
  onBannedAttempt,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    setComments(getCommentsForPost(postId));
    const unsub = subscribeToComments(postId, (cloudComments) => {
      if (cloudComments) {
        setComments(cloudComments);
      }
    });
    return () => unsub();
  }, [postId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!currentUser) {
      onRequestAuth();
      return;
    }

    const ban = inspectBanStatus(currentUser);
    if (ban.isBanned) {
      onBannedAttempt(currentUser);
      return;
    }

    if (!newComment.trim()) return;

    const res = addComment(postId, currentUser, newComment.trim());
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setNewComment('');
      onCommentAdded();
    } else {
      setErrorNotice(res.error || 'Failed to post reply.');
    }
  };

  return (
    <div className="pt-3 border-t border-slate-800/80 space-y-3">
      {/* Existing Comments */}
      {comments.length > 0 && (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <img
                src={comment.authorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                alt={comment.authorName}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-semibold text-xs text-white">{comment.authorName}</span>
                  <span className="text-blue-400 font-mono text-[11px]">{comment.authorHandle}</span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {errorNotice && (
        <div className="text-[11px] text-red-400 p-2 bg-red-500/10 rounded-lg">{errorNotice}</div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          placeholder={currentUser ? 'Post your reply...' : 'Sign in to reply...'}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1 shrink-0"
        >
          <Send className="w-3 h-3" />
          <span>Reply</span>
        </button>
      </form>
    </div>
  );
};
