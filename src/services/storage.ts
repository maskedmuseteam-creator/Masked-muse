import { User, Post, Comment, BanType, BanDurationUnit, DirectMessage, Conversation, ScheduledPost, NotificationItem, UserSettings, ActivationLog } from '../types';
import {
  saveUserToFirestore,
  fetchUsersFromFirestore,
  savePostToFirestore,
  updatePostInFirestore,
  deletePostFromFirestore,
  saveCommentToFirestore,
  saveConversationToFirestore,
  deleteConversationFromFirestore,
  saveMessageToFirestore,
  markMessagesAsReadInFirestore,
  subscribeToPosts,
  subscribeToUsers,
  saveScheduledPostToFirestore,
  updateScheduledPostInFirestore,
  deleteScheduledPostFromFirestore,
  fetchScheduledPostsFromFirestore,
  saveNotificationToFirestore,
  markNotificationReadInFirestore,
  fetchNotificationsFromFirestore,
  subscribeToNotifications,
} from './firebaseService';

const STORAGE_KEYS = {
  USERS: 'pulsex_users_v2_firebase',
  POSTS: 'pulsex_posts_v2_firebase',
  COMMENTS: 'pulsex_comments_v2_firebase',
  CONVERSATIONS: 'pulsex_conversations_v2_firebase',
  MESSAGES: 'pulsex_messages_v2_firebase',
  SCHEDULED_POSTS: 'pulsex_scheduled_posts_v2_firebase',
  NOTIFICATIONS: 'pulsex_notifications_v2_firebase',
  CURRENT_USER_ID: 'pulsex_current_user_id',
  ADMIN_SESSION: 'pulsex_admin_session',
  PURGED_LEGACY_DATA: 'pulsex_purged_legacy_v2',
  SETTINGS: 'pulsex_user_settings_v2',
  ACTIVATION_LOGS: 'pulsex_activation_logs_v2',
};

// Clean empty slate (no pre-loaded mock users, posts, or messages)
const INITIAL_USERS: User[] = [];
const INITIAL_POSTS: Post[] = [];
const INITIAL_COMMENTS: Comment[] = [];
const INITIAL_CONVERSATIONS: Conversation[] = [];
const INITIAL_MESSAGES: DirectMessage[] = [];

// Initialize database
export function initStorage(): void {
  // Purge any legacy pre-loaded seed data if previously stored
  if (!localStorage.getItem(STORAGE_KEYS.PURGED_LEGACY_DATA)) {
    localStorage.removeItem('pulsex_users_v1');
    localStorage.removeItem('pulsex_posts_v1');
    localStorage.removeItem('pulsex_comments_v1');
    localStorage.removeItem('pulsex_conversations_v1');
    localStorage.removeItem('pulsex_messages_v1');
    localStorage.setItem(STORAGE_KEYS.PURGED_LEGACY_DATA, 'true');
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(INITIAL_POSTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.COMMENTS)) {
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(INITIAL_COMMENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)) {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(INITIAL_CONVERSATIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(INITIAL_MESSAGES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SCHEDULED_POSTS)) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_POSTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
}

// ----------------- USERS -----------------
export function getAllUsers(): User[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    const users: User[] = raw ? JSON.parse(raw) : INITIAL_USERS;

    // Check ban expirations automatically
    let updated = false;
    const now = Date.now();
    users.forEach((u) => {
      if (u.banStatus?.isBanned && u.banStatus.type === 'temporary' && u.banStatus.expiresAt) {
        if (new Date(u.banStatus.expiresAt).getTime() <= now) {
          u.banStatus = { isBanned: false, type: 'none' };
          updated = true;
          saveUserToFirestore(u).catch(() => {});
        }
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    return users;
  } catch (e) {
    return INITIAL_USERS;
  }
}

export function saveAllUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  // Sync each user to Firestore
  users.forEach((user) => {
    saveUserToFirestore(user).catch((err) => console.warn('Firestore user sync:', err));
  });
}

export function getCurrentUser(): User | null {
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!currentId) return null;
  const users = getAllUsers();
  return users.find((u) => u.id === currentId) || null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  }
}

export function getUserByEmail(email: string): User | undefined {
  const users = getAllUsers();
  return users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
}

export function getUserByHandle(handle: string): User | undefined {
  const clean = handle.startsWith('@') ? handle.toLowerCase() : '@' + handle.toLowerCase();
  const users = getAllUsers();
  return users.find((u) => u.nickName.toLowerCase() === clean);
}

// ----------------- PROFILE MODIFICATION & ACCOUNTS CENTER -----------------
export function updateUserProfile(
  userId: string,
  updates: {
    fullName?: string;
    nickName?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    location?: string;
    website?: string;
  }
): { success: boolean; error?: string; user?: User } {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, error: 'User not found.' };
  }

  const currentUser = users[index];

  // If handle changed, validate uniqueness
  if (updates.nickName && updates.nickName.trim()) {
    let cleanNick = updates.nickName.trim();
    if (!cleanNick.startsWith('@')) cleanNick = '@' + cleanNick;
    if (cleanNick.toLowerCase() !== currentUser.nickName.toLowerCase()) {
      const taken = users.some((u) => u.id !== userId && u.nickName.toLowerCase() === cleanNick.toLowerCase());
      if (taken) {
        return { success: false, error: `Handle ${cleanNick} is already taken by another user.` };
      }
      currentUser.nickName = cleanNick;
    }
  }

  if (updates.fullName && updates.fullName.trim()) {
    currentUser.fullName = updates.fullName.trim();
  }
  if (updates.bio !== undefined) {
    currentUser.bio = updates.bio.trim();
  }
  if (updates.avatarUrl !== undefined) {
    currentUser.avatarUrl = updates.avatarUrl.trim();
  }
  if (updates.bannerUrl !== undefined) {
    currentUser.bannerUrl = updates.bannerUrl.trim();
  }
  if (updates.location !== undefined) {
    currentUser.location = updates.location.trim();
  }
  if (updates.website !== undefined) {
    currentUser.website = updates.website.trim();
  }

  users[index] = currentUser;
  saveAllUsers(users);

  // Sync author details in posts
  const posts = getAllPosts();
  let postsChanged = false;
  posts.forEach((p) => {
    if (p.authorId === userId) {
      p.authorName = currentUser.fullName;
      p.authorHandle = currentUser.nickName;
      if (currentUser.avatarUrl) p.authorAvatar = currentUser.avatarUrl;
      postsChanged = true;
    }
  });
  if (postsChanged) {
    saveAllPosts(posts);
  }

  // Record activation log
  addActivationLog(userId, 'Profile details updated', 'success', 'Modified bio, banner, avatar or identity');

  return { success: true, user: currentUser };
}

export function changeUserPassword(
  userId: string,
  currentPass: string,
  newPass: string
): { success: boolean; error?: string } {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  if (!currentPass || !currentPass.trim()) {
    return { success: false, error: 'Current password is required to authorize password change.' };
  }

  // Strict verification against current password
  if (user.password !== currentPass) {
    addActivationLog(userId, 'Password change rejected', 'warning', 'Invalid current password entered');
    return { success: false, error: 'Incorrect current password. Please enter your valid current password to proceed.' };
  }

  if (!newPass || newPass.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  if (currentPass === newPass) {
    return { success: false, error: 'New password cannot be the same as your current password.' };
  }

  user.password = newPass;
  saveAllUsers(users);

  addActivationLog(userId, 'Password changed successfully', 'success', 'Password updated with current credential verification');

  return { success: true };
}

// ----------------- ACTIVATION LOGS -----------------
export function getUserActivationLogs(userId: string): ActivationLog[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.ACTIVATION_LOGS}_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }

  const initialLogs: ActivationLog[] = [
    {
      id: `act_${Date.now()}_1`,
      userId,
      action: 'Active Web Session Established',
      device: 'Chrome 124 on macOS (Current device)',
      ipAddress: '198.51.100.42',
      location: 'San Francisco, CA, United States',
      timestamp: new Date().toISOString(),
      status: 'success',
      isCurrentSession: true,
    },
    {
      id: `act_${Date.now()}_2`,
      userId,
      action: 'Authenticated Session Sign-in',
      device: 'Chrome 124 on macOS',
      ipAddress: '198.51.100.42',
      location: 'San Francisco, CA, United States',
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      status: 'success',
    },
    {
      id: `act_${Date.now()}_3`,
      userId,
      action: 'Security Identity Verification',
      device: 'PulseX Cryptographic Client',
      ipAddress: '198.51.100.42',
      location: 'San Francisco, CA, United States',
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      status: 'success',
    },
  ];

  localStorage.setItem(`${STORAGE_KEYS.ACTIVATION_LOGS}_${userId}`, JSON.stringify(initialLogs));
  return initialLogs;
}

export function addActivationLog(
  userId: string,
  action: string,
  status: 'success' | 'warning' | 'alert' = 'success',
  details?: string
): void {
  const currentLogs = getUserActivationLogs(userId);
  const newLog: ActivationLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    userId,
    action: details ? `${action} (${details})` : action,
    device: 'Chrome 124 on macOS (Active session)',
    ipAddress: '198.51.100.42',
    location: 'San Francisco, CA, United States',
    timestamp: new Date().toISOString(),
    status,
    isCurrentSession: true,
  };

  const updated = [newLog, ...currentLogs.map(l => ({ ...l, isCurrentSession: false }))].slice(0, 50);
  localStorage.setItem(`${STORAGE_KEYS.ACTIVATION_LOGS}_${userId}`, JSON.stringify(updated));
}

export function clearOtherActivationSessions(userId: string): void {
  const logs = getUserActivationLogs(userId);
  const kept = logs.filter(l => l.isCurrentSession);
  addActivationLog(userId, 'Terminated all other active sessions', 'warning');
  localStorage.setItem(`${STORAGE_KEYS.ACTIVATION_LOGS}_${userId}`, JSON.stringify(kept));
}

// ----------------- USER SETTINGS -----------------
const DEFAULT_USER_SETTINGS = (userId: string): UserSettings => ({
  userId,
  language: 'en',
  privacy: {
    profileVisibility: 'public',
    allowDirectMessages: 'everyone',
    showReadReceipts: true,
    discoverableByEmail: true,
    allowTagging: 'everyone',
    searchEngineIndexing: true,
    privacyCheckupCompleted: false,
    lastCheckupDate: undefined,
    mutedUserIds: [],
    blockedUserIds: [],
  },
  contentPreferences: {
    sensitiveContentFilter: 'standard',
    autoplayVideos: true,
    mutedWords: ['spam', 'giveaway'],
    personalizedFeed: true,
    trendLocation: 'Worldwide',
  },
  appSettings: {
    theme: 'dark',
    fontSize: 'medium',
    soundEffects: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    emailNotifications: true,
    pushNotifications: true,
    compactDensity: false,
  },
});

export function muteUser(currentUserId: string, targetUserId: string): void {
  const settings = getUserSettings(currentUserId);
  if (!settings.privacy.mutedUserIds.includes(targetUserId)) {
    settings.privacy.mutedUserIds.push(targetUserId);
    updateUserSettings(currentUserId, { privacy: settings.privacy });
  }
}

export function unmuteUser(currentUserId: string, targetUserId: string): void {
  const settings = getUserSettings(currentUserId);
  settings.privacy.mutedUserIds = settings.privacy.mutedUserIds.filter((id) => id !== targetUserId);
  updateUserSettings(currentUserId, { privacy: settings.privacy });
}

export function blockUser(currentUserId: string, targetUserId: string): void {
  const settings = getUserSettings(currentUserId);
  if (!settings.privacy.blockedUserIds.includes(targetUserId)) {
    settings.privacy.blockedUserIds.push(targetUserId);
    updateUserSettings(currentUserId, { privacy: settings.privacy });
  }
}

export function unblockUser(currentUserId: string, targetUserId: string): void {
  const settings = getUserSettings(currentUserId);
  settings.privacy.blockedUserIds = settings.privacy.blockedUserIds.filter((id) => id !== targetUserId);
  updateUserSettings(currentUserId, { privacy: settings.privacy });
}

export function getUserSettings(userId: string): UserSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.SETTINGS}_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_USER_SETTINGS(userId),
        ...parsed,
        privacy: { ...DEFAULT_USER_SETTINGS(userId).privacy, ...(parsed.privacy || {}) },
        contentPreferences: { ...DEFAULT_USER_SETTINGS(userId).contentPreferences, ...(parsed.contentPreferences || {}) },
        appSettings: { ...DEFAULT_USER_SETTINGS(userId).appSettings, ...(parsed.appSettings || {}) },
      };
    }
  } catch (e) {
    console.error(e);
  }
  const defaultSet = DEFAULT_USER_SETTINGS(userId);
  localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${userId}`, JSON.stringify(defaultSet));
  return defaultSet;
}

export function updateUserSettings(userId: string, updates: Partial<UserSettings>): UserSettings {
  const current = getUserSettings(userId);
  const updated: UserSettings = {
    ...current,
    ...updates,
    privacy: updates.privacy ? { ...current.privacy, ...updates.privacy } : current.privacy,
    contentPreferences: updates.contentPreferences ? { ...current.contentPreferences, ...updates.contentPreferences } : current.contentPreferences,
    appSettings: updates.appSettings ? { ...current.appSettings, ...updates.appSettings } : current.appSettings,
  };
  localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${userId}`, JSON.stringify(updated));
  addActivationLog(userId, 'Settings preferences saved', 'success');
  window.dispatchEvent(new CustomEvent('pulsex-settings-updated', { detail: updated }));
  return updated;
}


// Check active ban details
export function inspectBanStatus(user: User): {
  isBanned: boolean;
  type: BanType;
  reason?: string;
  remainingText?: string;
  expiresDateFormatted?: string;
} {
  if (!user.banStatus || !user.banStatus.isBanned) {
    return { isBanned: false, type: 'none' };
  }

  if (user.banStatus.type === 'permanent') {
    return {
      isBanned: true,
      type: 'permanent',
      reason: user.banStatus.reason || 'Account suspended indefinitely for terms of service violations.',
    };
  }

  // Temporary Ban
  if (user.banStatus.expiresAt) {
    const expireTime = new Date(user.banStatus.expiresAt).getTime();
    const diffMs = expireTime - Date.now();

    if (diffMs <= 0) {
      user.banStatus = { isBanned: false, type: 'none' };
      const users = getAllUsers().map((u) => (u.id === user.id ? user : u));
      saveAllUsers(users);
      return { isBanned: false, type: 'none' };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;

    let remainingText = '';
    if (diffDays > 0) {
      remainingText = `${diffDays} day${diffDays > 1 ? 's' : ''}${remHours > 0 ? ` and ${remHours} hr${remHours > 1 ? 's' : ''}` : ''}`;
    } else {
      remainingText = `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }

    return {
      isBanned: true,
      type: 'temporary',
      reason: user.banStatus.reason || 'Account temporarily suspended.',
      remainingText,
      expiresDateFormatted: new Date(user.banStatus.expiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  return { isBanned: true, type: 'temporary', reason: user.banStatus.reason };
}

// ----------------- POSTS -----------------
export function getAllPosts(): Post[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    return raw ? JSON.parse(raw) : INITIAL_POSTS;
  } catch (e) {
    return INITIAL_POSTS;
  }
}

export function saveAllPosts(posts: Post[]): void {
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
}

export function createPost(
  author: User,
  content: string,
  mediaUrl?: string,
  tags?: string[]
): { success: boolean; post?: Post; error?: string } {
  const ban = inspectBanStatus(author);
  if (ban.isBanned) {
    return {
      success: false,
      error: `Action forbidden: Your account is suspended (${ban.type === 'permanent' ? 'Permanent' : `Expires in ${ban.remainingText}`}). Reason: ${ban.reason}`,
    };
  }

  const posts = getAllPosts();
  const newPost: Post = {
    id: `pst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authorId: author.id,
    authorName: author.fullName,
    authorHandle: author.nickName,
    authorAvatar: author.avatarUrl,
    content: content.trim(),
    mediaUrl: mediaUrl || undefined,
    createdAt: new Date().toISOString(),
    likes: [],
    reposts: [],
    bookmarks: [],
    commentsCount: 0,
    tags: tags || extractTags(content),
  };

  posts.unshift(newPost);
  saveAllPosts(posts);

  // Sync to Firebase Firestore
  savePostToFirestore(newPost).catch((err) => console.warn('Firestore createPost:', err));

  // Trigger @mentions notifications for tagged users
  triggerMentionNotifications(newPost.content, author, newPost.id);

  return { success: true, post: newPost };
}

export function extractTags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((t) => t.substring(1))));
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((t) => t.substring(1).toLowerCase())));
}

// ----------------- NOTIFICATIONS -----------------
export function getAllNotifications(): NotificationItem[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const notifs: NotificationItem[] = raw ? JSON.parse(raw) : [];
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    return [];
  }
}

export function saveAllNotifications(notifications: NotificationItem[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent('pulsex-notification-updated'));
}

export function getNotificationsForUser(userId: string): NotificationItem[] {
  return getAllNotifications().filter((n) => n.recipientId === userId);
}

export function getUnreadNotificationsCount(userId: string): number {
  return getAllNotifications().filter((n) => n.recipientId === userId && !n.read).length;
}

export function markNotificationAsRead(id: string): void {
  const all = getAllNotifications();
  const updated = all.map((n) => {
    if (n.id === id) {
      return { ...n, read: true };
    }
    return n;
  });
  saveAllNotifications(updated);
  markNotificationReadInFirestore(id).catch((err) => {
    console.warn('Firestore mark notification read err:', err);
  });
}

export function markAllNotificationsAsRead(userId: string): void {
  const all = getAllNotifications();
  let changed = false;
  const updated = all.map((n) => {
    if (n.recipientId === userId && !n.read) {
      changed = true;
      markNotificationReadInFirestore(n.id).catch(() => {});
      return { ...n, read: true };
    }
    return n;
  });
  if (changed) {
    saveAllNotifications(updated);
  }
}

export function triggerMentionNotifications(
  content: string,
  author: { id: string; fullName: string; nickName: string; avatarUrl?: string },
  postId?: string
): NotificationItem[] {
  const handles = extractMentions(content);
  if (handles.length === 0) return [];

  const allUsers = getAllUsers();
  const createdNotifs: NotificationItem[] = [];
  const allNotifs = getAllNotifications();

  for (const handle of handles) {
    // Find matching user (user.nickName might be "@john" or "john")
    const targetUser = allUsers.find(
      (u) => u.nickName.replace(/^@/, '').toLowerCase() === handle
    );

    // Only notify if user exists and is not the author itself
    if (targetUser && targetUser.id !== author.id) {
      const notif: NotificationItem = {
        id: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recipientId: targetUser.id,
        actorId: author.id,
        actorName: author.fullName,
        actorHandle: author.nickName,
        actorAvatar: author.avatarUrl,
        type: 'mention',
        postId,
        postSnippet: content.slice(0, 160),
        createdAt: new Date().toISOString(),
        read: false,
      };

      allNotifs.unshift(notif);
      createdNotifs.push(notif);

      // Save to Firebase Firestore
      saveNotificationToFirestore(notif).catch((err) => {
        console.warn('Firestore notification sync error:', err);
      });
    }
  }

  if (createdNotifs.length > 0) {
    saveAllNotifications(allNotifs);
  }

  return createdNotifs;
}

export function toggleLike(postId: string, userId: string): boolean {
  const posts = getAllPosts();
  let liked = false;
  const updated = posts.map((p) => {
    if (p.id === postId) {
      const idx = p.likes.indexOf(userId);
      if (idx >= 0) {
        p.likes.splice(idx, 1);
        liked = false;
      } else {
        p.likes.push(userId);
        liked = true;
      }
      updatePostInFirestore(postId, { likes: p.likes }).catch(() => {});
    }
    return p;
  });
  saveAllPosts(updated);
  return liked;
}

export function repostPost(
  targetPost: Post,
  currentUser: User
): { success: boolean; unposted?: boolean; post?: Post; error?: string } {
  const ban = inspectBanStatus(currentUser);
  if (ban.isBanned) {
    return {
      success: false,
      error: `Cannot repost: Account suspended. Reason: ${ban.reason}`,
    };
  }

  // If the target post is itself a repost, locate the root original post
  const originalPostId =
    targetPost.postType === 'repost' && targetPost.originalPostId
      ? targetPost.originalPostId
      : targetPost.id;

  const allPosts = getAllPosts();
  const rootPost = allPosts.find((p) => p.id === originalPostId) || targetPost;

  const isAlreadyReposted = rootPost.reposts.includes(currentUser.id);

  if (isAlreadyReposted) {
    // Undo Repost: remove user from rootPost.reposts and remove this user's repost post
    rootPost.reposts = rootPost.reposts.filter((id) => id !== currentUser.id);
    updatePostInFirestore(rootPost.id, { reposts: rootPost.reposts }).catch(() => {});

    const filteredPosts = allPosts.filter((p) => {
      const isUserRepostItem =
        p.postType === 'repost' &&
        p.originalPostId === rootPost.id &&
        p.repostedBy?.id === currentUser.id;
      if (isUserRepostItem) {
        deletePostFromFirestore(p.id).catch(() => {});
        return false;
      }
      return true;
    });

    saveAllPosts(filteredPosts);
    return { success: true, unposted: true };
  } else {
    // Perform Repost:
    rootPost.reposts.push(currentUser.id);
    updatePostInFirestore(rootPost.id, { reposts: rootPost.reposts }).catch(() => {});

    const newRepostPost: Post = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: rootPost.authorId,
      authorName: rootPost.authorName,
      authorHandle: rootPost.authorHandle,
      authorAvatar: rootPost.authorAvatar,
      content: rootPost.content,
      mediaUrl: rootPost.mediaUrl,
      createdAt: new Date().toISOString(),
      likes: [...rootPost.likes],
      reposts: [...rootPost.reposts],
      bookmarks: [...rootPost.bookmarks],
      commentsCount: rootPost.commentsCount,
      tags: rootPost.tags,
      postType: 'repost',
      originalPostId: rootPost.id,
      repostedBy: {
        id: currentUser.id,
        name: currentUser.fullName,
        handle: currentUser.nickName,
      },
    };

    allPosts.unshift(newRepostPost);
    saveAllPosts(allPosts);
    savePostToFirestore(newRepostPost).catch((err) => console.warn('Firestore repost sync:', err));

    // Send notification to author of original post if not self
    if (rootPost.authorId !== currentUser.id) {
      const notif: NotificationItem = {
        id: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recipientId: rootPost.authorId,
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorHandle: currentUser.nickName,
        actorAvatar: currentUser.avatarUrl,
        type: 'repost',
        postId: rootPost.id,
        postSnippet: rootPost.content.slice(0, 140),
        createdAt: new Date().toISOString(),
        read: false,
      };
      const allNotifs = getAllNotifications();
      allNotifs.unshift(notif);
      saveAllNotifications(allNotifs);
      saveNotificationToFirestore(notif).catch(() => {});
    }

    return { success: true, unposted: false, post: newRepostPost };
  }
}

export function quotePost(
  targetPost: Post,
  currentUser: User,
  comment: string,
  mediaUrl?: string
): { success: boolean; post?: Post; error?: string } {
  const ban = inspectBanStatus(currentUser);
  if (ban.isBanned) {
    return {
      success: false,
      error: `Cannot quote post: Account suspended. Reason: ${ban.reason}`,
    };
  }

  if (!comment.trim() && !mediaUrl) {
    return {
      success: false,
      error: 'Please add a comment or media to quote this post.',
    };
  }

  // Extract root content snapshot
  const rootPost = targetPost.quotedPost
    ? {
        id: targetPost.quotedPost.id,
        authorId: targetPost.quotedPost.authorId,
        authorName: targetPost.quotedPost.authorName,
        authorHandle: targetPost.quotedPost.authorHandle,
        authorAvatar: targetPost.quotedPost.authorAvatar,
        content: targetPost.quotedPost.content,
        mediaUrl: targetPost.quotedPost.mediaUrl,
        createdAt: targetPost.quotedPost.createdAt,
      }
    : {
        id: targetPost.id,
        authorId: targetPost.authorId,
        authorName: targetPost.authorName,
        authorHandle: targetPost.authorHandle,
        authorAvatar: targetPost.authorAvatar,
        content: targetPost.content,
        mediaUrl: targetPost.mediaUrl,
        createdAt: targetPost.createdAt,
      };

  const allPosts = getAllPosts();

  // Increment reposts on original post if not already present
  const originalInList = allPosts.find((p) => p.id === rootPost.id);
  if (originalInList && !originalInList.reposts.includes(currentUser.id)) {
    originalInList.reposts.push(currentUser.id);
    updatePostInFirestore(originalInList.id, { reposts: originalInList.reposts }).catch(() => {});
  }

  const quoteItem: Post = {
    id: `qot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authorId: currentUser.id,
    authorName: currentUser.fullName,
    authorHandle: currentUser.nickName,
    authorAvatar: currentUser.avatarUrl,
    content: comment.trim(),
    mediaUrl: mediaUrl || undefined,
    createdAt: new Date().toISOString(),
    likes: [],
    reposts: [],
    bookmarks: [],
    commentsCount: 0,
    tags: extractTags(comment),
    postType: 'quote',
    originalPostId: rootPost.id,
    quotedPost: {
      id: rootPost.id,
      authorId: rootPost.authorId,
      authorName: rootPost.authorName,
      authorHandle: rootPost.authorHandle,
      authorAvatar: rootPost.authorAvatar,
      content: rootPost.content,
      mediaUrl: rootPost.mediaUrl,
      createdAt: rootPost.createdAt,
    },
  };

  allPosts.unshift(quoteItem);
  saveAllPosts(allPosts);
  savePostToFirestore(quoteItem).catch((err) => console.warn('Firestore quote post sync:', err));

  // Trigger @mentions in quoter's comment
  triggerMentionNotifications(quoteItem.content, currentUser, quoteItem.id);

  // Notify original post author of the quote post if not self
  if (rootPost.authorId !== currentUser.id) {
    const notif: NotificationItem = {
      id: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientId: rootPost.authorId,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      actorHandle: currentUser.nickName,
      actorAvatar: currentUser.avatarUrl,
      type: 'quote',
      postId: quoteItem.id,
      postSnippet: comment.slice(0, 140),
      createdAt: new Date().toISOString(),
      read: false,
    };
    const allNotifs = getAllNotifications();
    allNotifs.unshift(notif);
    saveAllNotifications(allNotifs);
    saveNotificationToFirestore(notif).catch(() => {});
  }

  return { success: true, post: quoteItem };
}

export function toggleRepost(postId: string, userId: string): boolean {
  const posts = getAllPosts();
  const target = posts.find((p) => p.id === postId);
  if (!target) return false;
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return false;

  const res = repostPost(target, user);
  return !res.unposted;
}

export function toggleBookmark(postId: string, userId: string): boolean {
  const posts = getAllPosts();
  let bookmarked = false;
  const updated = posts.map((p) => {
    if (p.id === postId) {
      const idx = p.bookmarks.indexOf(userId);
      if (idx >= 0) {
        p.bookmarks.splice(idx, 1);
        bookmarked = false;
      } else {
        p.bookmarks.push(userId);
        bookmarked = true;
      }
      updatePostInFirestore(postId, { bookmarks: p.bookmarks }).catch(() => {});
    }
    return p;
  });
  saveAllPosts(updated);
  return bookmarked;
}

// ----------------- COMMENTS -----------------
export function getAllComments(): Comment[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    return raw ? JSON.parse(raw) : INITIAL_COMMENTS;
  } catch (e) {
    return [];
  }
}

export function getCommentsForPost(postId: string): Comment[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const comments: Comment[] = raw ? JSON.parse(raw) : INITIAL_COMMENTS;
    return comments.filter((c) => c.postId === postId);
  } catch (e) {
    return [];
  }
}

export function addComment(
  postId: string,
  author: User,
  content: string
): { success: boolean; comment?: Comment; error?: string } {
  const ban = inspectBanStatus(author);
  if (ban.isBanned) {
    return {
      success: false,
      error: `Cannot comment: Account suspended. Reason: ${ban.reason}`,
    };
  }

  const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
  const allComments: Comment[] = raw ? JSON.parse(raw) : INITIAL_COMMENTS;

  const newComment: Comment = {
    id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    postId,
    authorId: author.id,
    authorName: author.fullName,
    authorHandle: author.nickName,
    authorAvatar: author.avatarUrl,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    likes: [],
  };

  allComments.push(newComment);
  localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(allComments));
  saveCommentToFirestore(newComment).catch(() => {});

  // Trigger mention notifications if comment has @handle
  triggerMentionNotifications(newComment.content, author, postId);

  // Update post comments count
  const posts = getAllPosts();
  const updatedPosts = posts.map((p) => {
    if (p.id === postId) {
      const newCount = p.commentsCount + 1;
      updatePostInFirestore(postId, { commentsCount: newCount }).catch(() => {});
      return { ...p, commentsCount: newCount };
    }
    return p;
  });
  saveAllPosts(updatedPosts);

  return { success: true, comment: newComment };
}

// ----------------- DIRECT MESSAGING -----------------
export function getAllConversations(): Conversation[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return raw ? JSON.parse(raw) : INITIAL_CONVERSATIONS;
  } catch (e) {
    return INITIAL_CONVERSATIONS;
  }
}

export function saveAllConversations(conversations: Conversation[]): void {
  localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
}

export function getAllMessages(): DirectMessage[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return raw ? JSON.parse(raw) : INITIAL_MESSAGES;
  } catch (e) {
    return INITIAL_MESSAGES;
  }
}

export function saveAllMessages(messages: DirectMessage[]): void {
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

export function getConversationsForUser(userId: string): Conversation[] {
  const all = getAllConversations();
  return all
    .filter((c) => c.participants && c.participants.includes(userId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getOrCreateConversation(user1Id: string, user2Id: string): Conversation {
  const conversations = getAllConversations();
  let existing = conversations.find(
    (c) => c.participants && c.participants.includes(user1Id) && c.participants.includes(user2Id)
  );

  if (existing) return existing;

  const newConv: Conversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    participants: [user1Id, user2Id],
    updatedAt: new Date().toISOString(),
  };

  conversations.unshift(newConv);
  saveAllConversations(conversations);
  saveConversationToFirestore(newConv).catch(() => {});
  return newConv;
}

export function getMessages(conversationId: string): DirectMessage[] {
  const messages = getAllMessages();
  return messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function sendMessage(
  sender: User,
  receiverId: string,
  content: string,
  mediaUrl?: string
): { success: boolean; message?: DirectMessage; error?: string } {
  const ban = inspectBanStatus(sender);
  if (ban.isBanned) {
    return {
      success: false,
      error: `Cannot send message: Your account is suspended. Reason: ${ban.reason}`,
    };
  }

  if (!content.trim() && !mediaUrl) {
    return { success: false, error: 'Message cannot be empty.' };
  }

  const conv = getOrCreateConversation(sender.id, receiverId);
  const now = new Date().toISOString();

  const newMsg: DirectMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId: conv.id,
    senderId: sender.id,
    receiverId,
    content: content.trim(),
    mediaUrl: mediaUrl || undefined,
    createdAt: now,
    read: false,
  };

  const allMessages = getAllMessages();
  allMessages.push(newMsg);
  saveAllMessages(allMessages);
  saveMessageToFirestore(newMsg).catch(() => {});

  // Update conversation last message & timestamp
  const allConversations = getAllConversations();
  const convIndex = allConversations.findIndex((c) => c.id === conv.id);
  if (convIndex !== -1) {
    allConversations[convIndex].lastMessage = newMsg;
    allConversations[convIndex].updatedAt = now;
    saveAllConversations(allConversations);
    saveConversationToFirestore(allConversations[convIndex]).catch(() => {});
  }

  window.dispatchEvent(
    new CustomEvent('pulsex-message-updated', {
      detail: { conversationId: conv.id, message: newMsg },
    })
  );

  return { success: true, message: newMsg };
}

export function markMessagesAsRead(conversationId: string, currentUserId: string): void {
  const allMessages = getAllMessages();
  let changed = false;
  const now = new Date().toISOString();

  allMessages.forEach((m) => {
    if (m.conversationId === conversationId && m.receiverId === currentUserId && !m.read) {
      m.read = true;
      m.readAt = now;
      changed = true;
    }
  });

  if (changed) {
    saveAllMessages(allMessages);

    // Also update conversation's lastMessage read status
    const conversations = getAllConversations();
    const convIndex = conversations.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1 && conversations[convIndex].lastMessage) {
      if (conversations[convIndex].lastMessage?.receiverId === currentUserId) {
        conversations[convIndex].lastMessage!.read = true;
        conversations[convIndex].lastMessage!.readAt = now;
        saveAllConversations(conversations);
      }
    }

    markMessagesAsReadInFirestore(conversationId, currentUserId).catch(() => {});
    window.dispatchEvent(
      new CustomEvent('pulsex-message-updated', { detail: { conversationId } })
    );
  }
}

export function getUnreadMessagesCount(userId: string): number {
  const allMessages = getAllMessages();
  return allMessages.filter((m) => m.receiverId === userId && !m.read).length;
}

export function deleteConversation(conversationId: string): void {
  const allConversations = getAllConversations();
  saveAllConversations(allConversations.filter((c) => c.id !== conversationId));
  deleteConversationFromFirestore(conversationId).catch(() => {});

  const allMessages = getAllMessages();
  saveAllMessages(allMessages.filter((m) => m.conversationId !== conversationId));

  window.dispatchEvent(new CustomEvent('pulsex-message-updated', { detail: { conversationId } }));
}

// ----------------- ADMIN CONTROLS -----------------
export const ADMIN_CREDENTIALS = {
  id: 'Rahin',
  pass: 'rahin5566',
};

export function isAdminAuthenticated(): boolean {
  try {
    const session = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
    if (!session) return false;
    const parsed = JSON.parse(session);
    return parsed.authenticated === true && parsed.adminId === ADMIN_CREDENTIALS.id;
  } catch (e) {
    return false;
  }
}

export function setAdminSession(auth: boolean): void {
  if (auth) {
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_SESSION,
      JSON.stringify({ authenticated: true, adminId: ADMIN_CREDENTIALS.id, loggedInAt: Date.now() })
    );
  } else {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  }
}

export function adminBanUser(
  userId: string,
  type: 'permanent' | 'temporary',
  reason: string,
  durationConfig?: { unit: BanDurationUnit; value: number }
): { success: boolean; message: string } {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { success: false, message: 'User not found.' };

  const now = new Date();
  let expiresAt: string | null = null;

  if (type === 'temporary' && durationConfig) {
    const { unit, value } = durationConfig;
    const expireDate = new Date(now.getTime());

    if (unit === 'days') {
      expireDate.setDate(expireDate.getDate() + value);
    } else if (unit === 'months') {
      expireDate.setMonth(expireDate.getMonth() + value);
    } else if (unit === 'years') {
      expireDate.setFullYear(expireDate.getFullYear() + value);
    }

    expiresAt = expireDate.toISOString();
    user.banStatus = {
      isBanned: true,
      type: 'temporary',
      reason: reason.trim(),
      bannedAt: now.toISOString(),
      expiresAt,
      durationValue: value,
      durationUnit: unit,
      bannedBy: 'Rahin',
    };
  } else {
    user.banStatus = {
      isBanned: true,
      type: 'permanent',
      reason: reason.trim(),
      bannedAt: now.toISOString(),
      expiresAt: null,
      bannedBy: 'Rahin',
    };
  }

  saveAllUsers(users);

  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentUser(user);
  }

  return {
    success: true,
    message: `${user.fullName} (${user.nickName}) has been ${type === 'permanent' ? 'permanently banned' : `temporarily banned until ${new Date(expiresAt!).toLocaleDateString()}`}.`,
  };
}

export function adminUnbanUser(userId: string): { success: boolean; message: string } {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { success: false, message: 'User not found.' };

  user.banStatus = { isBanned: false, type: 'none' };
  saveAllUsers(users);

  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentUser(user);
  }

  return { success: true, message: `${user.fullName} (${user.nickName}) has been unbanned.` };
}

export function deletePost(postId: string, userId: string): { success: boolean; error?: string } {
  const posts = getAllPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    return { success: false, error: 'Post not found.' };
  }

  // Author check or admin check
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  const isAuthor = post.authorId === userId;
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator' || userId === ADMIN_CREDENTIALS.id;

  if (!isAuthor && !isAdmin) {
    return { success: false, error: 'Unauthorized. You can only delete your own posts.' };
  }

  // Remove main post and any repost items referencing this post
  const updatedPosts = posts.filter((p) => p.id !== postId && p.originalPostId !== postId);
  saveAllPosts(updatedPosts);
  deletePostFromFirestore(postId).catch(() => {});

  // Log action
  if (userId) {
    addActivationLog(userId, 'Post deleted', 'warning', `Deleted post ID ${postId.slice(0, 8)}`);
  }

  window.dispatchEvent(new CustomEvent('pulsex-post-deleted', { detail: { postId } }));
  return { success: true };
}

export function reportPost(
  postId: string,
  reporterId: string,
  reasonType: string,
  details?: string
): { success: boolean; error?: string } {
  const posts = getAllPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index === -1) {
    return { success: false, error: 'Post not found.' };
  }

  const fullReason = `${reasonType}${details ? `: ${details}` : ''}`;
  posts[index].isFlagged = true;
  posts[index].flagReason = fullReason;
  posts[index].underReviewStatus = 'pending';
  posts[index].reportedBy = reporterId;
  saveAllPosts(posts);

  updatePostInFirestore(postId, {
    isFlagged: true,
    flagReason: fullReason,
    underReviewStatus: 'pending',
    reportedBy: reporterId,
  }).catch(() => {});

  if (reporterId) {
    addActivationLog(reporterId, 'Reported a post', 'warning', `Reported post ${postId.slice(0, 8)} for ${reasonType}`);
  }

  window.dispatchEvent(new CustomEvent('pulsex-post-updated', { detail: { postId } }));
  return { success: true };
}

export function getReportedPosts(): Post[] {
  const posts = getAllPosts();
  return posts.filter((p) => p.isFlagged || p.underReviewStatus === 'pending');
}

export function adminSetReportStatus(
  postId: string,
  action: 'all_clear' | 'pending' | 'delete_post',
  adminId: string = 'Rahin'
): { success: boolean; message: string } {
  const posts = getAllPosts();
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1 && action !== 'delete_post') {
    return { success: false, message: 'Post not found.' };
  }

  const post = posts[postIndex];

  if (action === 'all_clear') {
    posts[postIndex].isFlagged = false;
    posts[postIndex].underReviewStatus = 'cleared';
    posts[postIndex].flagReason = undefined;
    saveAllPosts(posts);

    updatePostInFirestore(postId, {
      isFlagged: false,
      underReviewStatus: 'cleared',
    }).catch(() => {});

    window.dispatchEvent(new CustomEvent('pulsex-post-updated', { detail: { postId } }));
    return { success: true, message: 'Post marked as All Clear. Public visibility restored to community.' };
  }

  if (action === 'pending') {
    posts[postIndex].isFlagged = true;
    posts[postIndex].underReviewStatus = 'pending';
    saveAllPosts(posts);

    updatePostInFirestore(postId, {
      isFlagged: true,
      underReviewStatus: 'pending',
    }).catch(() => {});

    return { success: true, message: 'Post remains under review for further moderation.' };
  }

  if (action === 'delete_post') {
    if (!post) {
      deletePostFromFirestore(postId).catch(() => {});
      return { success: true, message: 'Post deleted.' };
    }

    const authorId = post.authorId;
    const postSnippet = post.content.slice(0, 120);
    const violationReason = post.flagReason || 'Violation of platform community rules';

    // Issue guideline warning to author user
    const users = getAllUsers();
    const authorUser = users.find((u) => u.id === authorId);

    if (authorUser) {
      const warningRecord = {
        id: `wrn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        reason: violationReason,
        deletedPostSnippet: postSnippet,
        timestamp: new Date().toISOString(),
        issuedBy: 'PulseX Safety System',
      };

      authorUser.guidelineWarnings = authorUser.guidelineWarnings || [];
      authorUser.guidelineWarnings.unshift(warningRecord);
      saveAllUsers(users);

      addActivationLog(
        authorId,
        'Moderation Notice: Post deleted for rule violation',
        'alert',
        `Reason: ${violationReason}`
      );

      // Create notification for author
      const allNotifs = getAllNotifications();
      const notifItem = {
        id: `ntf_wrn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: authorId,
        actorId: 'system_safety',
        actorName: 'PulseX Safety Team',
        actorHandle: '@safety',
        type: 'guideline_warning' as any,
        postSnippet: `Your post ("${postSnippet}") was removed for violating platform rules: ${violationReason}`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      allNotifs.unshift(notifItem);
      saveAllNotifications(allNotifs);
      saveNotificationToFirestore(notifItem).catch(() => {});
    }

    // Perform real post removal
    deletePost(postId, adminId);

    return {
      success: true,
      message: `Post deleted. Community guideline violation warning recorded on author profile (${authorUser?.nickName || authorId}).`,
    };
  }

  return { success: false, message: 'Invalid action.' };
}

export function adminDeletePost(postId: string): boolean {
  const posts = getAllPosts();
  const filtered = posts.filter((p) => p.id !== postId);
  saveAllPosts(filtered);
  deletePostFromFirestore(postId).catch(() => {});
  return true;
}

export function adminTogglePinPost(postId: string): boolean {
  const posts = getAllPosts();
  let pinned = false;
  const updated = posts.map((p) => {
    if (p.id === postId) {
      p.isPinned = !p.isPinned;
      pinned = p.isPinned;
      updatePostInFirestore(postId, { isPinned: pinned }).catch(() => {});
    }
    return p;
  });
  saveAllPosts(updated);
  return pinned;
}

// ----------------- SCHEDULED POSTS -----------------
export function getAllScheduledPosts(): ScheduledPost[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULED_POSTS);
    const list: ScheduledPost[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  } catch (e) {
    return [];
  }
}

export function saveAllScheduledPosts(scheduled: ScheduledPost[]): void {
  localStorage.setItem(STORAGE_KEYS.SCHEDULED_POSTS, JSON.stringify(scheduled));
  window.dispatchEvent(new CustomEvent('pulsex-scheduled-updated'));
}

export function getScheduledPostsByAuthor(authorId: string): ScheduledPost[] {
  return getAllScheduledPosts().filter((p) => p.authorId === authorId && p.status === 'pending');
}

export function schedulePost(
  author: User,
  content: string,
  scheduledFor: string,
  mediaUrl?: string,
  tags?: string[]
): { success: boolean; scheduledPost?: ScheduledPost; error?: string } {
  const ban = inspectBanStatus(author);
  if (ban.isBanned) {
    return {
      success: false,
      error: `Action forbidden: Your account is suspended (${ban.type === 'permanent' ? 'Permanent' : `Expires in ${ban.remainingText}`}). Reason: ${ban.reason}`,
    };
  }

  const targetDate = new Date(scheduledFor);
  if (isNaN(targetDate.getTime())) {
    return {
      success: false,
      error: 'Please select a valid future date and time.',
    };
  }

  // Must be at least 30 seconds in the future
  if (targetDate.getTime() <= Date.now() + 30000) {
    return {
      success: false,
      error: 'Scheduled time must be at least 1 minute in the future.',
    };
  }

  if (!content.trim() && !mediaUrl) {
    return {
      success: false,
      error: 'Scheduled post content or media cannot be empty.',
    };
  }

  const scheduledList = getAllScheduledPosts();
  const newScheduled: ScheduledPost = {
    id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authorId: author.id,
    authorName: author.fullName,
    authorHandle: author.nickName,
    authorAvatar: author.avatarUrl,
    content: content.trim(),
    mediaUrl: mediaUrl || undefined,
    scheduledFor: targetDate.toISOString(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    tags: tags || extractTags(content),
  };

  scheduledList.push(newScheduled);
  saveAllScheduledPosts(scheduledList);

  // Sync to Firestore 'scheduled' collection
  saveScheduledPostToFirestore(newScheduled).catch((err) => {
    console.warn('Firestore scheduled post sync:', err);
  });

  return { success: true, scheduledPost: newScheduled };
}

export function deleteScheduledPost(id: string): boolean {
  const scheduledList = getAllScheduledPosts();
  const filtered = scheduledList.filter((p) => p.id !== id);
  saveAllScheduledPosts(filtered);

  deleteScheduledPostFromFirestore(id).catch((err) => {
    console.warn('Firestore delete scheduled post error:', err);
  });

  return true;
}

export function publishScheduledPostNow(scheduledId: string): { success: boolean; post?: Post; error?: string } {
  const scheduledList = getAllScheduledPosts();
  const target = scheduledList.find((p) => p.id === scheduledId);
  if (!target) {
    return { success: false, error: 'Scheduled post not found.' };
  }

  const users = getAllUsers();
  const author = users.find((u) => u.id === target.authorId);

  // Create real post
  const posts = getAllPosts();
  const newPost: Post = {
    id: `pst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authorId: target.authorId,
    authorName: target.authorName,
    authorHandle: target.authorHandle,
    authorAvatar: target.authorAvatar,
    content: target.content,
    mediaUrl: target.mediaUrl,
    createdAt: new Date().toISOString(),
    likes: [],
    reposts: [],
    bookmarks: [],
    commentsCount: 0,
    tags: target.tags || extractTags(target.content),
  };

  posts.unshift(newPost);
  saveAllPosts(posts);
  savePostToFirestore(newPost).catch((err) => console.warn('Firestore publish error:', err));

  // Trigger @mentions notifications
  triggerMentionNotifications(
    newPost.content,
    {
      id: target.authorId,
      fullName: target.authorName,
      nickName: target.authorHandle,
      avatarUrl: target.authorAvatar,
    },
    newPost.id
  );

  // Remove from scheduled
  deleteScheduledPost(scheduledId);

  window.dispatchEvent(new CustomEvent('pulsex-post-published', { detail: newPost }));
  return { success: true, post: newPost };
}

export async function checkAndPublishDueScheduledPosts(): Promise<Post[]> {
  const scheduledList = getAllScheduledPosts();
  const now = Date.now();
  const due = scheduledList.filter((p) => p.status === 'pending' && new Date(p.scheduledFor).getTime() <= now);

  if (due.length === 0) return [];

  const publishedPosts: Post[] = [];
  const remainingScheduled = scheduledList.filter(
    (p) => !(p.status === 'pending' && new Date(p.scheduledFor).getTime() <= now)
  );

  const posts = getAllPosts();

  for (const item of due) {
    const newPost: Post = {
      id: `pst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: item.authorId,
      authorName: item.authorName,
      authorHandle: item.authorHandle,
      authorAvatar: item.authorAvatar,
      content: item.content,
      mediaUrl: item.mediaUrl,
      createdAt: new Date().toISOString(),
      likes: [],
      reposts: [],
      bookmarks: [],
      commentsCount: 0,
      tags: item.tags || extractTags(item.content),
    };

    posts.unshift(newPost);
    publishedPosts.push(newPost);

    // Trigger @mentions notifications
    triggerMentionNotifications(
      newPost.content,
      {
        id: item.authorId,
        fullName: item.authorName,
        nickName: item.authorHandle,
        avatarUrl: item.authorAvatar,
      },
      newPost.id
    );

    // Write post to Firestore and remove scheduled doc
    savePostToFirestore(newPost).catch((err) => console.warn('Sync due post to firestore:', err));
    deleteScheduledPostFromFirestore(item.id).catch((err) => console.warn('Remove due scheduled post:', err));
  }

  saveAllPosts(posts);
  saveAllScheduledPosts(remainingScheduled);

  window.dispatchEvent(new CustomEvent('pulsex-post-published', { detail: publishedPosts }));
  return publishedPosts;
}

