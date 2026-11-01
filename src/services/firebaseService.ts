import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocFromServer,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { User, Post, Comment, Conversation, DirectMessage, BanType, BanDurationUnit, ScheduledPost, NotificationItem } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------- USERS -----------------
export async function saveUserToFirestore(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
  } catch (error) {
    console.warn(`Firestore user sync notice (${path}):`, error);
  }
}

export async function fetchUsersFromFirestore(): Promise<User[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as User);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export function subscribeToUsers(onUpdate: (users: User[]) => void) {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as User);
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore users subscription notice:', e);
      }
    }
  );
}

// ----------------- POSTS -----------------
export async function savePostToFirestore(post: Post): Promise<void> {
  const path = `posts/${post.id}`;
  try {
    await setDoc(doc(db, 'posts', post.id), post);
  } catch (error) {
    console.warn(`Firestore post save notice (${path}):`, error);
  }
}

export async function updatePostInFirestore(postId: string, updates: Partial<Post>): Promise<void> {
  const path = `posts/${postId}`;
  try {
    await updateDoc(doc(db, 'posts', postId), updates);
  } catch (error) {
    console.warn(`Firestore post update notice (${path}):`, error);
  }
}

export async function deletePostFromFirestore(postId: string): Promise<void> {
  const path = `posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToPosts(onUpdate: (posts: Post[]) => void) {
  const path = 'posts';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Post);
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore posts subscription notice:', e);
      }
    }
  );
}

// ----------------- COMMENTS -----------------
export async function saveCommentToFirestore(comment: Comment): Promise<void> {
  const path = `comments/${comment.id}`;
  try {
    await setDoc(doc(db, 'comments', comment.id), comment);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToComments(postId: string, onUpdate: (comments: Comment[]) => void) {
  const path = 'comments';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as Comment)
        .filter((c) => c.postId === postId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore comments subscription notice:', e);
      }
    }
  );
}

// ----------------- CHATS & DIRECT MESSAGES -----------------
export async function saveConversationToFirestore(conv: Conversation): Promise<void> {
  const path = `conversations/${conv.id}`;
  try {
    await setDoc(doc(db, 'conversations', conv.id), conv, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteConversationFromFirestore(convId: string): Promise<void> {
  const path = `conversations/${convId}`;
  try {
    await deleteDoc(doc(db, 'conversations', convId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToConversations(userId: string, onUpdate: (convs: Conversation[]) => void) {
  const path = 'conversations';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as Conversation)
        .filter((c) => c.participants && c.participants.includes(userId))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore conversations subscription notice:', e);
      }
    }
  );
}

export async function saveMessageToFirestore(message: DirectMessage): Promise<void> {
  const path = `messages/${message.id}`;
  try {
    await setDoc(doc(db, 'messages', message.id), message);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToMessages(conversationId: string, onUpdate: (messages: DirectMessage[]) => void) {
  const path = 'messages';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as DirectMessage)
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore messages subscription notice:', e);
      }
    }
  );
}

export async function markMessagesAsReadInFirestore(conversationId: string, userId: string): Promise<void> {
  const path = 'messages';
  try {
    const snap = await getDocs(collection(db, path));
    const toUpdate = snap.docs
      .map((d) => d.data() as DirectMessage)
      .filter((m) => m.conversationId === conversationId && m.receiverId === userId && !m.read);

    const now = new Date().toISOString();
    for (const msg of toUpdate) {
      await updateDoc(doc(db, 'messages', msg.id), { read: true, readAt: now });
    }
  } catch (error) {
    console.warn('Note updating read receipts:', error);
  }
}

// ----------------- SCHEDULED POSTS -----------------
export async function saveScheduledPostToFirestore(post: ScheduledPost): Promise<void> {
  const path = `scheduled/${post.id}`;
  try {
    await setDoc(doc(db, 'scheduled', post.id), post);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateScheduledPostInFirestore(
  scheduledId: string,
  updates: Partial<ScheduledPost>
): Promise<void> {
  const path = `scheduled/${scheduledId}`;
  try {
    await updateDoc(doc(db, 'scheduled', scheduledId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteScheduledPostFromFirestore(scheduledId: string): Promise<void> {
  const path = `scheduled/${scheduledId}`;
  try {
    await deleteDoc(doc(db, 'scheduled', scheduledId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchScheduledPostsFromFirestore(authorId?: string): Promise<ScheduledPost[]> {
  const path = 'scheduled';
  try {
    const snap = await getDocs(collection(db, path));
    let list = snap.docs.map((d) => d.data() as ScheduledPost);
    if (authorId) {
      list = list.filter((p) => p.authorId === authorId);
    }
    list.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export function subscribeToScheduledPosts(
  authorId: string | undefined,
  onUpdate: (posts: ScheduledPost[]) => void
) {
  const path = 'scheduled';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      let list = snap.docs.map((d) => d.data() as ScheduledPost);
      if (authorId) {
        list = list.filter((p) => p.authorId === authorId);
      }
      list.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore scheduled posts subscription notice:', e);
      }
    }
  );
}

// ----------------- NOTIFICATIONS -----------------
export async function saveNotificationToFirestore(notification: NotificationItem): Promise<void> {
  const path = `notifications/${notification.id}`;
  try {
    await setDoc(doc(db, 'notifications', notification.id), notification, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markNotificationReadInFirestore(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchNotificationsFromFirestore(recipientId?: string): Promise<NotificationItem[]> {
  const path = 'notifications';
  try {
    const snap = await getDocs(collection(db, path));
    let list = snap.docs.map((d) => d.data() as NotificationItem);
    if (recipientId) {
      list = list.filter((n) => n.recipientId === recipientId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export function subscribeToNotifications(
  recipientId: string | undefined,
  onUpdate: (notifications: NotificationItem[]) => void
) {
  const path = 'notifications';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      let list = snap.docs.map((d) => d.data() as NotificationItem);
      if (recipientId) {
        list = list.filter((n) => n.recipientId === recipientId);
      }
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn('Firestore notifications subscription notice:', e);
      }
    }
  );
}

