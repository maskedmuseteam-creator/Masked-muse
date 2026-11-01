export type BanType = 'none' | 'temporary' | 'permanent';
export type BanDurationUnit = 'days' | 'months' | 'years';

export interface BanInfo {
  isBanned: boolean;
  type: BanType;
  reason?: string;
  bannedAt?: string;
  expiresAt?: string | null; // ISO string, null if permanent
  durationValue?: number;
  durationUnit?: BanDurationUnit;
  bannedBy?: string;
}

export interface GuidelineWarning {
  id: string;
  reason: string;
  deletedPostSnippet?: string;
  timestamp: string;
  issuedBy?: string;
}

export interface User {
  id: string;
  fullName: string;
  nickName: string; // handle like @username
  email: string;
  password: string; // hashed or stored for client session
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedAt: string;
  role: 'user' | 'moderator' | 'admin';
  isVerified?: boolean;
  following: string[]; // array of user IDs
  followersCount: number;
  banStatus: BanInfo;
  guidelineWarnings?: GuidelineWarning[];
}

export interface UserSettings {
  userId: string;
  language: string;
  privacy: {
    profileVisibility: 'public' | 'followers' | 'private';
    allowDirectMessages: 'everyone' | 'following' | 'nobody';
    showReadReceipts: boolean;
    discoverableByEmail: boolean;
    allowTagging: 'everyone' | 'following' | 'none';
    searchEngineIndexing: boolean;
    privacyCheckupCompleted: boolean;
    lastCheckupDate?: string;
    mutedUserIds: string[];
    blockedUserIds: string[];
  };
  contentPreferences: {
    sensitiveContentFilter: 'standard' | 'strict' | 'off';
    autoplayVideos: boolean;
    mutedWords: string[];
    personalizedFeed: boolean;
    trendLocation: string;
  };
  appSettings: {
    theme: 'dark' | 'light' | 'midnight';
    fontSize: 'small' | 'medium' | 'large';
    soundEffects: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    compactDensity: boolean;
  };
}

export interface ActivationLog {
  id: string;
  userId: string;
  action: string;
  device: string;
  ipAddress: string;
  location: string;
  timestamp: string;
  status: 'success' | 'warning' | 'alert';
  isCurrentSession?: boolean;
}


export type PostType = 'original' | 'repost' | 'quote';

export interface QuotedPostPreview {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
}

export interface RepostedByInfo {
  id: string;
  name: string;
  handle: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
  likes: string[]; // user IDs who liked
  reposts: string[]; // user IDs who reposted
  bookmarks: string[]; // user IDs who bookmarked
  commentsCount: number;
  isPinned?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  underReviewStatus?: 'pending' | 'cleared' | 'deleted';
  reportedBy?: string;
  tags?: string[];
  postType?: PostType;
  originalPostId?: string;
  quotedPost?: QuotedPostPreview;
  repostedBy?: RepostedByInfo;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: string[];
}

export interface EmailJsSettings {
  serviceId: string;
  templateId: string;
  publicKey: string;
  enabled: boolean;
}

export interface OTPRecord {
  email: string;
  otp: string;
  createdAt: number;
  expiresAt: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // [userId1, userId2]
  updatedAt: string;
  lastMessage?: DirectMessage;
}

export interface ScheduledPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  scheduledFor: string; // ISO string when it should go live
  createdAt: string;
  status: 'pending' | 'published' | 'cancelled';
  tags?: string[];
}

export type NotificationType = 'mention' | 'like' | 'comment' | 'follow' | 'repost' | 'quote' | 'guideline_warning';

export interface NotificationItem {
  id: string;
  recipientId: string; // user receiving notification
  actorId: string;     // user who generated the notification
  actorName: string;
  actorHandle: string;
  actorAvatar?: string;
  type: NotificationType;
  postId?: string;
  postSnippet?: string;
  createdAt: string;
  read: boolean;
}

