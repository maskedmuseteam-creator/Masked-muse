import React, { useState, useEffect, useRef } from 'react';
import { Image, Sparkles, Send, X, Lock, Calendar, Clock, CalendarClock, CheckCircle2, Upload, FolderPlus } from 'lucide-react';
import { User } from '../types';
import { createPost, schedulePost, inspectBanStatus } from '../services/storage';
import { compressImageFile } from '../utils/imageUtils';

interface PostCreatorProps {
  currentUser: User | null;
  onPostCreated: () => void;
  onRequestAuth: () => void;
  onBannedAttempt: (user: User) => void;
  onOpenScheduledModal?: () => void;
  scheduledCount?: number;
}

// Preset visual photography assets
const PRESET_ATTACHMENTS = [
  {
    name: 'Modern Architecture',
    url: '/src/assets/images/post_architecture_minimal_1793017962179.jpg',
  },
  {
    name: 'Minimalist Workspace',
    url: '/src/assets/images/post_desk_setup_1793017961952.jpg',
  },
];

export const PostCreator: React.FC<PostCreatorProps> = ({
  currentUser,
  onPostCreated,
  onRequestAuth,
  onBannedAttempt,
  onOpenScheduledModal,
  scheduledCount = 0,
}) => {
  const [content, setContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [customMediaUrl, setCustomMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedUrl = await compressImageFile(file, 1200, 1200, 0.80);
      setSelectedMedia(compressedUrl);
      setShowMediaPicker(false);
      setErrorNotice(null);
    } catch (err) {
      setErrorNotice('Failed to compress selected image.');
    }
    // Reset file input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  // Scheduling state
  const [isScheduledMode, setIsScheduledMode] = useState(false);

  // Default to 1 hour in the future in local datetime-local ISO format
  const getInitialScheduledTime = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [scheduledDateTime, setScheduledDateTime] = useState<string>(getInitialScheduledTime);

  const getMinDateTime = () => {
    const d = new Date(Date.now() + 60 * 1000); // at least 1 min in future
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const MAX_CHARS = 280;
  const remainingChars = MAX_CHARS - content.length;

  const setPresetTime = (hoursFromNow: number, specificHour?: number) => {
    const d = new Date();
    if (specificHour !== undefined) {
      d.setDate(d.getDate() + 1);
      d.setHours(specificHour, 0, 0, 0);
    } else {
      d.setTime(d.getTime() + hoursFromNow * 3600 * 1000);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    setScheduledDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setSuccessNotice(null);

    // Gate: Must have an account to post
    if (!currentUser) {
      onRequestAuth();
      return;
    }

    // Gate: Must not be banned
    const ban = inspectBanStatus(currentUser);
    if (ban.isBanned) {
      onBannedAttempt(currentUser);
      return;
    }

    if (!content.trim() && !selectedMedia) {
      setErrorNotice('Post cannot be empty.');
      return;
    }

    setIsSubmitting(true);

    if (isScheduledMode) {
      // Validate scheduled time
      const targetTime = new Date(scheduledDateTime).getTime();
      if (isNaN(targetTime) || targetTime <= Date.now() + 30000) {
        setIsSubmitting(false);
        setErrorNotice('Please select a scheduled time at least 1 minute in the future.');
        return;
      }

      const res = schedulePost(currentUser, content, scheduledDateTime, selectedMedia || undefined);
      setIsSubmitting(false);

      if (res.success) {
        const formattedDate = new Date(scheduledDateTime).toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        setContent('');
        setSelectedMedia(null);
        setShowMediaPicker(false);
        setCustomMediaUrl('');
        setIsScheduledMode(false);
        setSuccessNotice(`Post scheduled successfully for ${formattedDate}! It will automatically publish.`);
        setTimeout(() => setSuccessNotice(null), 5000);
        onPostCreated();
      } else {
        setErrorNotice(res.error || 'Failed to schedule post.');
      }
    } else {
      // Immediate post
      const res = createPost(currentUser, content, selectedMedia || undefined);
      setIsSubmitting(false);

      if (res.success) {
        setContent('');
        setSelectedMedia(null);
        setShowMediaPicker(false);
        setCustomMediaUrl('');
        onPostCreated();
      } else {
        setErrorNotice(res.error || 'Failed to submit post.');
      }
    }
  };

  const handleInsertTag = (tag: string) => {
    if (!content.includes(tag)) {
      setContent((prev) => (prev ? `${prev} ${tag}` : tag));
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg mb-4">
      {/* If Guest, show attractive prompt */}
      {!currentUser ? (
        <div className="flex items-center justify-between gap-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Have something to say?</p>
              <p className="text-[11px] text-slate-400">
                You need a verified PulseX account to post, schedule drafts, or interact.
              </p>
            </div>
          </div>
          <button
            onClick={onRequestAuth}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/25 transition-colors whitespace-nowrap shrink-0"
          >
            Sign Up / Login
          </button>
        </div>
      ) : (
        <form onSubmit={handlePostSubmit}>
          {errorNotice && (
            <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              {errorNotice}
            </div>
          )}

          {successNotice && (
            <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <img
              src={currentUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
              alt={currentUser.fullName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0 mt-0.5"
            />

            <div className="flex-1 min-w-0">
              <textarea
                rows={3}
                maxLength={MAX_CHARS}
                placeholder={isScheduledMode ? "Draft your scheduled post... What should publish later?" : "What is happening? Tag friends with @handle or use #hashtags..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
              />

              {/* Selected Media Preview */}
              {selectedMedia && (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-800 max-h-60 group">
                  <img
                    src={selectedMedia}
                    alt="Upload preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedMedia(null)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full backdrop-blur-sm transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Hidden File Input for Device Image Upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
              />

              {/* Media Picker Drawer */}
              {showMediaPicker && (
                <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">Attach Media Photo</span>
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Direct File Upload Dropzone / Button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-600/5 hover:bg-blue-600/10 rounded-xl text-center cursor-pointer transition-all group"
                  >
                    <Upload className="w-6 h-6 text-blue-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-white">Upload Photo from Device</p>
                    <p className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP, GIF up to 10MB</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_ATTACHMENTS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setSelectedMedia(preset.url);
                          setShowMediaPicker(false);
                        }}
                        className="relative rounded-lg overflow-hidden border border-slate-800 hover:border-blue-500 transition-all text-left group"
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-16 object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                          <span className="text-[10px] font-medium text-white truncate">
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex gap-2">
                    <input
                      type="url"
                      placeholder="Or paste external image URL..."
                      value={customMediaUrl}
                      onChange={(e) => setCustomMediaUrl(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customMediaUrl.trim()) {
                          setSelectedMedia(customMediaUrl.trim());
                          setShowMediaPicker(false);
                          setCustomMediaUrl('');
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Schedule Post Configuration Drawer */}
              {isScheduledMode && (
                <div className="mt-3 p-3.5 bg-slate-950/90 border border-blue-500/30 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                      <CalendarClock className="w-4 h-4" />
                      <span>Schedule for Future Publication</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsScheduledMode(false)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel Schedule</span>
                    </button>
                  </div>

                  {/* Future Date-Time Picker */}
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <div className="relative flex-1 w-full">
                      <input
                        type="datetime-local"
                        min={getMinDateTime()}
                        value={scheduledDateTime}
                        onChange={(e) => setScheduledDateTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPresetTime(1)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 rounded-lg transition-colors"
                      >
                        +1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetTime(3)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 rounded-lg transition-colors"
                      >
                        +3 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetTime(24, 9)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 rounded-lg transition-colors"
                      >
                        Tomorrow 9 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetTime(48)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 rounded-lg transition-colors"
                      >
                        +2 Days
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                      Target release:{' '}
                      <strong className="text-slate-200">
                        {scheduledDateTime
                          ? new Date(scheduledDateTime).toLocaleString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'Not specified'}
                      </strong>
                    </span>
                  </p>
                </div>
              )}

              {/* Bottom action toolbar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 mt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(!showMediaPicker)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Add image"
                  >
                    <Image className="w-4 h-4" />
                  </button>

                  {/* Schedule Post Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isScheduledMode) {
                        setScheduledDateTime(getInitialScheduledTime());
                      }
                      setIsScheduledMode(!isScheduledMode);
                    }}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs ${
                      isScheduledMode
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10'
                    }`}
                    title={isScheduledMode ? 'Switch to Immediate Post' : 'Schedule for later'}
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium">
                      {isScheduledMode ? 'Scheduling' : 'Schedule'}
                    </span>
                  </button>

                  {/* Scheduled Queue Viewer Trigger if user has pending scheduled posts */}
                  {scheduledCount > 0 && onOpenScheduledModal && (
                    <button
                      type="button"
                      onClick={onOpenScheduledModal}
                      className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-blue-400 text-xs font-medium rounded-lg border border-slate-700/60 flex items-center gap-1.5 transition-colors"
                      title="View all queued scheduled posts"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Queue</span>
                      <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-bold">
                        {scheduledCount}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleInsertTag('#Tech')}
                    className="hidden sm:inline-block px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    #Tech
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag('#PulseX')}
                    className="hidden sm:inline-block px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    #PulseX
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      remainingChars < 20
                        ? 'text-red-400 font-bold'
                        : remainingChars < 60
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {remainingChars}
                  </span>

                  <button
                    type="submit"
                    disabled={isSubmitting || (!content.trim() && !selectedMedia)}
                    className={`px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                      isScheduledMode
                        ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25 disabled:opacity-40 disabled:hover:bg-indigo-600'
                        : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25 disabled:opacity-40 disabled:hover:bg-blue-600'
                    }`}
                  >
                    {isScheduledMode ? (
                      <>
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>Schedule Post</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Post</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
