import React, { useState } from 'react';
import {
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Share2,
  Pin,
  MoreHorizontal,
  Check,
  Flag,
  Quote,
  X,
  Send,
  Sparkles,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Post, User } from '../types';
import {
  toggleLike,
  toggleBookmark,
  inspectBanStatus,
  repostPost,
  quotePost,
  deletePost,
  reportPost,
} from '../services/storage';
import { CommentSection } from './CommentSection';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onPostUpdated: () => void;
  onRequestAuth: () => void;
  onBannedAttempt: (user: User) => void;
  onTagClick?: (tag: string) => void;
  onAuthorClick?: (handle: string) => void;
  onSelectPost?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onPostUpdated,
  onRequestAuth,
  onBannedAttempt,
  onTagClick,
  onAuthorClick,
  onSelectPost,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Repost & Quote Post State
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [repostFeedback, setRepostFeedback] = useState<string | null>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteComment, setQuoteComment] = useState('');
  const [quoteMediaUrl, setQuoteMediaUrl] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // 3-Dots Menu, Delete & Report State
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<string>('18+ Adults photo or explicit post');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportToast, setReportToast] = useState<string | null>(null);

  const isAuthor = currentUser
    ? currentUser.id === post.authorId || currentUser.role === 'admin' || currentUser.role === 'moderator'
    : false;

  const isLiked = currentUser ? post.likes.includes(currentUser.id) : false;
  const isReposted = currentUser ? post.reposts.includes(currentUser.id) : false;
  const isBookmarked = currentUser ? post.bookmarks.includes(currentUser.id) : false;

  const handleActionCheck = (action: () => void) => {
    if (!currentUser) {
      onRequestAuth();
      return;
    }
    const ban = inspectBanStatus(currentUser);
    if (ban.isBanned) {
      onBannedAttempt(currentUser);
      return;
    }
    action();
  };

  const handleLike = () => {
    handleActionCheck(() => {
      toggleLike(post.id, currentUser!.id);
      onPostUpdated();
    });
  };

  const handleOpenRepostMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleActionCheck(() => {
      setShowRepostMenu(!showRepostMenu);
    });
  };

  const handleDirectRepost = () => {
    setShowRepostMenu(false);
    handleActionCheck(() => {
      const res = repostPost(post, currentUser!);
      if (res.success) {
        setRepostFeedback(res.unposted ? 'Repost removed from feed' : 'Reposted to your feed!');
        setTimeout(() => setRepostFeedback(null), 3000);
        onPostUpdated();
      }
    });
  };

  const handleSubmitQuote = () => {
    if (!currentUser) return;
    setQuoteSubmitting(true);
    setQuoteError(null);
    try {
      const res = quotePost(post, currentUser, quoteComment, quoteMediaUrl);
      if (res.success) {
        setQuoteModalOpen(false);
        setQuoteComment('');
        setQuoteMediaUrl('');
        setRepostFeedback('Quote post published to your feed!');
        setTimeout(() => setRepostFeedback(null), 3000);
        onPostUpdated();
      } else {
        setQuoteError(res.error || 'Failed to quote post.');
      }
    } catch (e: any) {
      setQuoteError(e?.message || 'Error quoting post.');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleBookmark = () => {
    handleActionCheck(() => {
      toggleBookmark(post.id, currentUser!.id);
      onPostUpdated();
    });
  };

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Generate temporary shareable URL and invoke Web Share API if available
  const handleShare = async () => {
    // 24-hour expiration token
    const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
    const sharePayload = btoa(
      JSON.stringify({
        postId: post.id,
        author: post.authorHandle,
        expiresAt: expiryTime,
      })
    ).replace(/=/g, '');

    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${post.id}&shareToken=${sharePayload}&exp=${expiryTime}`;

    // Test for Web Share API availability
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${post.authorName} on PulseX`,
          text: `"${post.content.slice(0, 100)}${post.content.length > 100 ? '...' : ''}" - View on PulseX (Temporary 24h Link)`,
          url: shareUrl,
        });
        setShareFeedback('Shared successfully!');
        setCopiedLink(true);
        setTimeout(() => {
          setCopiedLink(false);
          setShareFeedback(null);
        }, 3000);
        return;
      } catch (err: any) {
        // User aborted share sheet
        if (err.name === 'AbortError') {
          return;
        }
        // Fallback to clipboard if share failed
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setShareFeedback('Temporary link copied! (Valid 24h)');
      setTimeout(() => {
        setCopiedLink(false);
        setShareFeedback(null);
      }, 3000);
    } catch (err) {
      setShareFeedback('Could not copy link to clipboard.');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleDeletePost = () => {
    if (!currentUser) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = deletePost(post.id, currentUser.id);
      if (res.success) {
        setDeleteConfirmOpen(false);
        onPostUpdated();
      } else {
        setDeleteError(res.error || 'Failed to delete post.');
      }
    } catch (e: any) {
      setDeleteError(e?.message || 'Error deleting post.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmitReport = () => {
    if (!currentUser) return;
    if (reportCategory === 'Others' && !reportDetails.trim()) {
      setReportError('Please explain why you are reporting this post.');
      return;
    }
    setReportSubmitting(true);
    setReportError(null);
    try {
      const res = reportPost(post.id, currentUser.id, reportCategory, reportDetails);
      if (res.success) {
        setReportModalOpen(false);
        setReportDetails('');
        setReportToast('Report submitted. Thank you for keeping PulseX safe.');
        setTimeout(() => setReportToast(null), 4000);
        onPostUpdated();
      } else {
        setReportError(res.error || 'Failed to submit report.');
      }
    } catch (e: any) {
      setReportError(e?.message || 'Error submitting report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  // Render text with clickable #hashtags and @mentions
  const renderFormattedContent = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const tag = part.substring(1);
        return (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick && onTagClick(tag);
            }}
            className="text-blue-400 hover:text-blue-300 hover:underline font-medium inline transition-colors"
          >
            {part}
          </button>
        );
      }
      if (part.startsWith('@')) {
        return (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick && onAuthorClick(part);
            }}
            className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium inline transition-colors"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const isUnderReview = post.isFlagged || post.underReviewStatus === 'pending';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator' || currentUser?.id === 'usr_rahin_admin';
  const isPostAuthor = currentUser?.id === post.authorId;

  // Hide reported posts from general public when under review
  if (isUnderReview && !isPostAuthor && !isAdmin) {
    return null;
  }

  return (
    <article className="bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200">
      {/* Under Review Banner for Post Author */}
      {isUnderReview && isPostAuthor && (
        <div className="bg-amber-500/15 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-xs font-semibold mb-3 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                Under Review
              </span>
              <span className="font-bold text-amber-300 text-xs">Visible only to you</span>
            </div>
            <p className="text-[11px] text-amber-200/90 font-normal leading-relaxed">
              This post is currently under review by platform moderators for safety compliance. It is temporarily hidden from other users until review is complete.
            </p>
          </div>
        </div>
      )}

      {/* Under Review Banner for Moderators/Admins */}
      {isUnderReview && isAdmin && !isPostAuthor && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs font-semibold mb-3 flex items-start gap-2.5 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded border border-red-500/30">
                Moderator View
              </span>
              <span className="font-bold text-red-300 text-xs">Reported Content</span>
            </div>
            <p className="text-[11px] text-red-200/90 font-normal leading-relaxed">
              {post.flagReason ? `Reason: ${post.flagReason}` : 'This post has been reported and is pending admin moderation review.'}
            </p>
          </div>
        </div>
      )}

      {/* Pinned announcement header */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mb-2.5 pb-2 border-b border-slate-800/60">
          <Pin className="w-3.5 h-3.5" />
          <span>Pinned Announcement</span>
        </div>
      )}

      {/* Repost attribution header */}
      {post.postType === 'repost' && post.repostedBy && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2.5 pb-2 border-b border-slate-800/60">
          <Repeat2 className="w-3.5 h-3.5" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick && onAuthorClick(post.repostedBy!.handle);
            }}
            className="hover:underline flex items-center gap-1.5"
          >
            <span className="text-slate-200">{post.repostedBy.name}</span>
            <span className="text-emerald-400 font-mono text-[11px] font-normal">{post.repostedBy.handle}</span>
          </button>
          <span className="text-slate-400 font-normal">reposted</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Author Avatar */}
        <button
          onClick={() => onAuthorClick && onAuthorClick(post.authorHandle)}
          className="shrink-0 transition-transform active:scale-95"
          title={`View ${post.authorHandle}'s profile`}
        >
          <img
            src={post.authorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
            alt={post.authorName}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover border border-slate-700 hover:border-blue-500 transition-colors"
          />
        </button>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header Zone: Name, Handle, Timestamp, Menu */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap truncate">
              <button
                onClick={() => onAuthorClick && onAuthorClick(post.authorHandle)}
                className="font-bold text-sm text-white hover:underline truncate"
              >
                {post.authorName}
              </button>
              <button
                onClick={() => onAuthorClick && onAuthorClick(post.authorHandle)}
                className="text-blue-400 font-mono text-xs hover:underline truncate"
              >
                {post.authorHandle}
              </button>
              <span className="text-slate-500 text-xs">·</span>
              <time className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(post.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </div>

            {/* 3-Dots Options Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-colors"
                title="Post options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoreMenu(false);
                    }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full right-0 mt-1 w-56 p-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl z-40 space-y-1"
                  >
                    {/* Delete Post option (Visible ONLY for Post Author or Admin/Moderator) */}
                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setDeleteConfirmOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <div>
                          <div>Delete Post</div>
                          <div className="text-[10px] text-red-400/70 font-normal">
                            Permanently remove this post
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Report Post option */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleActionCheck(() => {
                          setReportModalOpen(true);
                          setReportError(null);
                        });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-all"
                    >
                      <Flag className="w-4 h-4 shrink-0" />
                      <div>
                        <div>Report Post</div>
                        <div className="text-[10px] text-amber-400/70 font-normal">
                          Flag inappropriate or harmful content
                        </div>
                      </div>
                    </button>

                    {/* Share Link */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleShare();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    >
                      <Share2 className="w-4 h-4 shrink-0 text-blue-400" />
                      <div>
                        <div>Share Link</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Copy shareable post URL
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Post Content */}
          <p className="text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap break-words">
            {renderFormattedContent(post.content)}
          </p>

          {/* Post Media Attachment */}
          {post.mediaUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={post.mediaUrl}
                alt="Post media visual"
                referrerPolicy="no-referrer"
                className="w-full max-h-96 object-cover hover:opacity-95 transition-opacity"
              />
            </div>
          )}

          {/* Quoted Post Embedded Card */}
          {post.quotedPost && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectPost) onSelectPost(post.quotedPost!.id);
              }}
              className="mt-3 p-3.5 rounded-2xl border border-slate-800/90 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-950 transition-all cursor-pointer group/quote shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={post.quotedPost.authorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                  alt={post.quotedPost.authorName}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover border border-slate-700"
                />
                <span className="font-semibold text-xs text-white group-hover/quote:underline truncate">
                  {post.quotedPost.authorName}
                </span>
                <span className="text-blue-400 font-mono text-[11px] truncate">
                  {post.quotedPost.authorHandle}
                </span>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-[11px] text-slate-500">
                  {new Date(post.quotedPost.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed line-clamp-4 break-words">
                {renderFormattedContent(post.quotedPost.content)}
              </p>
              {post.quotedPost.mediaUrl && (
                <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-800 max-h-52 bg-slate-900">
                  <img
                    src={post.quotedPost.mediaUrl}
                    alt="Quoted attachment"
                    referrerPolicy="no-referrer"
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Post Action Buttons Bar */}
          <div className="flex items-center justify-between pt-3 mt-2 text-slate-400 text-xs max-w-md">
            {/* Comment button */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 py-1 px-2 rounded-lg hover:text-blue-400 hover:bg-blue-500/10 transition-colors ${
                showComments ? 'text-blue-400' : ''
              }`}
              title="Reply"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="font-mono tabular-nums">{post.commentsCount}</span>
            </button>

            {/* Repost button with popover dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={handleOpenRepostMenu}
                className={`flex items-center gap-1.5 py-1 px-2 rounded-lg hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors ${
                  isReposted ? 'text-emerald-400 font-semibold' : ''
                }`}
                title="Repost or Quote"
              >
                <Repeat2 className="w-4 h-4" />
                <span className="font-mono tabular-nums">{post.reposts.length}</span>
              </button>

              {/* Repost Popover Dropdown */}
              {showRepostMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRepostMenu(false);
                    }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full left-0 mb-2 w-56 p-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl z-40 space-y-1"
                  >
                    <button
                      type="button"
                      onClick={handleDirectRepost}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
                        isReposted
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-emerald-400'
                      }`}
                    >
                      <Repeat2 className="w-4 h-4 shrink-0" />
                      <div>
                        <div>{isReposted ? 'Undo Repost' : 'Repost'}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {isReposted ? 'Remove from your feed' : 'Instantly share to your feed'}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowRepostMenu(false);
                        setQuoteModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-blue-400 transition-all"
                    >
                      <Quote className="w-4 h-4 shrink-0 text-blue-400" />
                      <div>
                        <div>Quote Post</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Add your thoughts before sharing
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* Repost Feedback Toast */}
              {repostFeedback && (
                <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 bg-slate-950 border border-emerald-500/40 text-emerald-300 text-[11px] rounded-xl shadow-xl whitespace-nowrap z-40 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{repostFeedback}</span>
                </div>
              )}
            </div>

            {/* Like button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 py-1 px-2 rounded-lg hover:text-red-400 hover:bg-red-500/10 transition-colors group ${
                isLiked ? 'text-red-500 font-semibold' : ''
              }`}
              title="Like"
            >
              <Heart
                className={`w-4 h-4 transition-transform group-active:scale-125 ${
                  isLiked ? 'fill-red-500 text-red-500' : ''
                }`}
              />
              <span className="font-mono tabular-nums">{post.likes.length}</span>
            </button>

            {/* Bookmark button */}
            <button
              onClick={handleBookmark}
              className={`p-1.5 rounded-lg hover:text-blue-400 hover:bg-blue-500/10 transition-colors ${
                isBookmarked ? 'text-blue-400 font-semibold' : ''
              }`}
              title="Bookmark"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-blue-400' : ''}`} />
            </button>

            {/* Share button */}
            <div className="relative">
              <button
                onClick={handleShare}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  copiedLink
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'hover:text-blue-400 hover:bg-blue-500/10'
                }`}
                title="Generate temporary shareable link"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                {copiedLink && (
                  <span className="text-[10px] font-medium text-emerald-400 hidden sm:inline">
                    Copied
                  </span>
                )}
              </button>

              {/* Floating Share Feedback Tooltip */}
              {shareFeedback && (
                <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-slate-950 border border-slate-700 text-slate-100 text-[11px] rounded-lg shadow-xl whitespace-nowrap z-30 flex items-center gap-1.5 animate-fadeIn">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{shareFeedback}</span>
                </div>
              )}
            </div>
          </div>

          {/* Inline Comment Thread */}
          {showComments && (
            <div className="mt-3">
              <CommentSection
                postId={post.id}
                currentUser={currentUser}
                onRequestAuth={onRequestAuth}
                onBannedAttempt={onBannedAttempt}
                onCommentAdded={onPostUpdated}
              />
            </div>
          )}
        </div>
      </div>

      {/* Quote Post Modal */}
      {quoteModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Quote Post</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuoteModalOpen(false);
                  setQuoteError(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quoteError && (
              <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                {quoteError}
              </div>
            )}

            {/* Quoter user header */}
            <div className="flex items-start gap-3 mb-3">
              <img
                src={currentUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white leading-tight">
                  {currentUser.fullName}
                </div>
                <div className="text-[11px] text-blue-400 font-mono">
                  {currentUser.nickName}
                </div>

                <textarea
                  autoFocus
                  rows={3}
                  placeholder="Add a comment... (Use @handle or #tags)"
                  value={quoteComment}
                  onChange={(e) => setQuoteComment(e.target.value)}
                  className="w-full mt-2 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Original Post Preview Box */}
            <div className="p-3 rounded-2xl border border-slate-800 bg-slate-950/80 mb-4 max-h-52 overflow-y-auto">
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={post.authorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                  alt={post.authorName}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover border border-slate-700"
                />
                <span className="font-semibold text-xs text-white truncate">{post.authorName}</span>
                <span className="text-blue-400 font-mono text-[11px] truncate">{post.authorHandle}</span>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-[11px] text-slate-500">
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                {post.content}
              </p>
              {post.mediaUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-800/80 max-h-24">
                  <img src={post.mediaUrl} alt="Quoted attachment" className="w-full h-24 object-cover" />
                </div>
              )}
            </div>

            {/* Optional media attachment URL */}
            <div className="mb-4">
              <input
                type="url"
                placeholder="Optional image attachment URL..."
                value={quoteMediaUrl}
                onChange={(e) => setQuoteMediaUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">
                {quoteComment.length}/280
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuoteModalOpen(false);
                    setQuoteError(null);
                  }}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={(!quoteComment.trim() && !quoteMediaUrl.trim()) || quoteSubmitting}
                  onClick={handleSubmitQuote}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
                >
                  <Quote className="w-3.5 h-3.5" />
                  <span>{quoteSubmitting ? 'Posting...' : 'Post Quote'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Post Modal */}
      {reportModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Report Post</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportModalOpen(false);
                  setReportError(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{reportError}</span>
              </div>
            )}

            {/* Post Preview Box (Card showing Post Title/Snippet & Author Name) */}
            <div className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-2xl mb-4">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Reported Post Preview
              </div>
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={post.authorAvatar || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                  alt={post.authorName}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-slate-700 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white truncate block">{post.authorName}</span>
                  <span className="text-[11px] text-blue-400 font-mono truncate block">{post.authorHandle}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 line-clamp-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 font-normal italic">
                "{post.content}"
              </p>
            </div>

            {/* Form: Category Selection */}
            <div className="space-y-2.5 mb-4">
              <label className="block text-xs font-semibold text-slate-300">
                What type of issue are you reporting?
              </label>

              {[
                { id: '18+ Adults photo or explicit post', label: '🔞 18+ Adults photo or explicit content' },
                { id: 'False statement / Misinformation', label: '❌ False statement / Misinformation' },
                { id: 'Platform rules violation / Harmful content', label: '🚫 Platform rules violation / Harmful content' },
                { id: 'Harassment or Bullying', label: '⚠️ Harassment or Bullying' },
                { id: 'Others', label: '📝 Others' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    reportCategory === opt.id
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-semibold shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportCategory"
                    value={opt.id}
                    checked={reportCategory === opt.id}
                    onChange={(e) => {
                      setReportCategory(e.target.value);
                      setReportError(null);
                    }}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}

              {/* Textarea for "Others" option */}
              {reportCategory === 'Others' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-amber-400 mb-1">
                    Please specify why you are reporting this post <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional details regarding the violation..."
                    value={reportDetails}
                    onChange={(e) => {
                      setReportDetails(e.target.value);
                      if (e.target.value.trim()) setReportError(null);
                    }}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setReportModalOpen(false);
                  setReportError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reportSubmitting || (reportCategory === 'Others' && !reportDetails.trim())}
                onClick={handleSubmitReport}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{reportSubmitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Post Confirmation Modal */}
      {deleteConfirmOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3 text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">Delete Post?</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              This action cannot be undone. This post will be permanently deleted from your profile and feed.
            </p>

            {deleteError && (
              <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteError(null);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeletePost}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteSubmitting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Success Toast */}
      {reportToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-amber-500/40 text-amber-300 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium">{reportToast}</span>
        </div>
      )}
    </article>
  );
};
