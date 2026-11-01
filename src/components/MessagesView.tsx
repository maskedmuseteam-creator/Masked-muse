import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Search,
  Image,
  X,
  Plus,
  Smile,
  ShieldAlert,
  ArrowLeft,
  Check,
  CheckCheck,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { User, Conversation, DirectMessage } from '../types';
import {
  getAllUsers,
  getConversationsForUser,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteConversation,
  inspectBanStatus,
} from '../services/storage';
import { subscribeToMessages, subscribeToConversations } from '../services/firebaseService';

interface MessagesViewProps {
  currentUser: User | null;
  initialTargetUserId?: string | null;
  onClose?: () => void;
  onRequestAuth: () => void;
  onBannedAttempt: (user: User) => void;
  onOpenProfile: (handle: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  initialTargetUserId,
  onClose,
  onRequestAuth,
  onBannedAttempt,
  onOpenProfile,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const allUsers = getAllUsers();

  // Filter conversations by contact name or message content
  const filteredConversations = conversations.filter((conv) => {
    if (!conversationSearchQuery.trim() || !currentUser) return true;
    const query = conversationSearchQuery.toLowerCase().trim();

    const otherUserId = conv.participants.find((id) => id !== currentUser.id);
    const otherUser = allUsers.find((u) => u.id === otherUserId);

    // Match contact name or handle
    const matchName = otherUser?.fullName.toLowerCase().includes(query);
    const matchHandle = otherUser?.nickName.toLowerCase().includes(query);

    // Match last message
    const matchLastMessage = conv.lastMessage?.content.toLowerCase().includes(query);

    // Match any message content in this conversation thread
    const threadMessages = getMessages(conv.id);
    const matchThreadMessage = threadMessages.some((m) => m.content.toLowerCase().includes(query));

    return Boolean(matchName || matchHandle || matchLastMessage || matchThreadMessage);
  });

  // Load conversations
  const loadConversations = () => {
    if (!currentUser) return;
    const userConvs = getConversationsForUser(currentUser.id);
    setConversations(userConvs);

    // If initial target user is passed, find or create conversation
    if (initialTargetUserId && initialTargetUserId !== currentUser.id) {
      const conv = getOrCreateConversation(currentUser.id, initialTargetUserId);
      setActiveConversationId(conv.id);
    } else if (userConvs.length > 0 && !activeConversationId) {
      setActiveConversationId(userConvs[0].id);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentUser, initialTargetUserId]);

  // Load active conversation messages and mark as read
  useEffect(() => {
    if (activeConversationId && currentUser) {
      const msgs = getMessages(activeConversationId);
      setMessages(msgs);
      markMessagesAsRead(activeConversationId, currentUser.id);

      // Auto scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [activeConversationId, currentUser]);

  // Firestore live subscriptions for conversations and messages
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToConversations(currentUser.id, (cloudConvs) => {
      if (cloudConvs && cloudConvs.length > 0) {
        setConversations(cloudConvs);
      }
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!activeConversationId || !currentUser) return;
    const unsub = subscribeToMessages(activeConversationId, (cloudMsgs) => {
      if (cloudMsgs && cloudMsgs.length > 0) {
        setMessages(cloudMsgs);
        markMessagesAsRead(activeConversationId, currentUser.id);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    });
    return () => unsub();
  }, [activeConversationId, currentUser]);

  // Listen to message updates from local actions
  useEffect(() => {
    const handler = () => {
      if (!currentUser) return;
      loadConversations();
      if (activeConversationId) {
        setMessages(getMessages(activeConversationId));
        markMessagesAsRead(activeConversationId, currentUser.id);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    };

    window.addEventListener('pulsex-message-updated', handler);
    return () => window.removeEventListener('pulsex-message-updated', handler);
  }, [activeConversationId, currentUser]);

  if (!currentUser) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto my-12">
        <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Direct Messages</h3>
        <p className="text-xs text-slate-400 mb-4">
          Sign in or create an account to start private conversations with creators and developers on PulseX.
        </p>
        <button
          onClick={onRequestAuth}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/25 transition-all"
        >
          Sign In to Access Messages
        </button>
      </div>
    );
  }

  // Active conversation partner
  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const partnerId = activeConv?.participants.find((id) => id !== currentUser.id);
  const partnerUser = allUsers.find((u) => u.id === partnerId);

  // Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;

    // Check ban
    const ban = inspectBanStatus(currentUser);
    if (ban.isBanned) {
      onBannedAttempt(currentUser);
      return;
    }

    if (!messageInput.trim() && !selectedMedia) return;

    const res = sendMessage(currentUser, partnerId, messageInput, selectedMedia || undefined);
    if (res.success && res.message) {
      setMessageInput('');
      setSelectedMedia(null);
      setMessages((prev) => [...prev, res.message!]);
      loadConversations();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleStartNewChat = (user: User) => {
    if (user.id === currentUser.id) return;
    const conv = getOrCreateConversation(currentUser.id, user.id);
    setActiveConversationId(conv.id);
    setShowNewChatModal(false);
    loadConversations();
  };

  const handleDeleteActiveConv = () => {
    if (!activeConversationId) return;
    if (window.confirm('Are you sure you want to delete this chat conversation?')) {
      deleteConversation(activeConversationId);
      setActiveConversationId(null);
      loadConversations();
    }
  };

  // Filter users for new chat modal
  const eligibleUsers = allUsers.filter(
    (u) =>
      u.id !== currentUser.id &&
      (u.fullName.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
        u.nickName.toLowerCase().includes(searchUserQuery.toLowerCase()))
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[750px] max-h-[85vh]">
      {/* LEFT PANE: Conversations list */}
      <div
        className={`w-full md:w-80 border-r border-slate-800/80 flex flex-col bg-slate-950/60 ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Pane Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Messages</h2>
            <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
              {filteredConversations.length}
            </span>
          </div>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Search Bar */}
        <div className="p-2.5 px-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts or messages..."
              value={conversationSearchQuery}
              onChange={(e) => setConversationSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800/90 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {conversationSearchQuery && (
              <button
                type="button"
                onClick={() => setConversationSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {conversationSearchQuery.trim() ? (
                <div>
                  <p className="text-slate-400 mb-1">No chats matching "{conversationSearchQuery}"</p>
                  <button
                    onClick={() => setConversationSearchQuery('')}
                    className="mt-2 text-blue-400 hover:underline font-semibold text-[11px]"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                <div>
                  <p>No messages yet.</p>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-3 text-blue-400 hover:underline font-semibold"
                  >
                    Start a conversation
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherUserId = conv.participants.find((id) => id !== currentUser.id);
              const otherUser = allUsers.find((u) => u.id === otherUserId);
              if (!otherUser) return null;

              const isSelected = conv.id === activeConversationId;
              const isUnread = conv.lastMessage && !conv.lastMessage.read && conv.lastMessage.receiverId === currentUser.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors ${
                    isSelected ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-slate-900/60'
                  }`}
                >
                  <img
                    src={otherUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                    alt={otherUser.fullName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-xs text-white truncate">{otherUser.fullName}</span>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap ml-1">
                        {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[160px]">
                        {conv.lastMessage && conv.lastMessage.senderId === currentUser.id && (
                          conv.lastMessage.read ? (
                            <span title="Read">
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0 inline" />
                            </span>
                          ) : (
                            <span title="Sent">
                              <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 inline" />
                            </span>
                          )
                        )}
                        <span className="truncate">{conv.lastMessage?.content || 'Started conversation'}</span>
                      </div>
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-sm shadow-blue-500/50 animate-pulse" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Active Chat Thread */}
      <div className={`flex-1 flex flex-col bg-[#070b14] ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {partnerUser && activeConversationId ? (
          <>
            {/* Thread Header */}
            <div className="p-3.5 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onOpenProfile(partnerUser.nickName)}
                  className="flex items-center gap-2.5 text-left hover:opacity-85 transition-opacity"
                >
                  <img
                    src={partnerUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                    alt={partnerUser.fullName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{partnerUser.fullName}</span>
                      {partnerUser.banStatus?.isBanned && (
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20">
                          Suspended
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-blue-400 font-mono">{partnerUser.nickName}</span>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteActiveConv}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete chat thread"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Partner Intro Banner */}
              <div className="text-center py-6 border-b border-slate-800/60 mb-2">
                <img
                  src={partnerUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                  alt={partnerUser.fullName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-slate-700 shadow-md"
                />
                <h4 className="text-sm font-bold text-white">{partnerUser.fullName}</h4>
                <p className="text-xs text-blue-400 font-mono mb-1">{partnerUser.nickName}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">{partnerUser.bio || 'PulseX member'}</p>
              </div>

              {/* Message bubbles */}
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <img
                        src={partnerUser.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                        alt={partnerUser.fullName}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover shrink-0 mb-1"
                      />
                    )}

                    <div
                      className={`max-w-md px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                          : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/60'
                      }`}
                    >
                      {msg.mediaUrl && (
                        <div className="rounded-xl overflow-hidden mb-2 max-h-48 border border-black/20">
                          <img
                            src={msg.mediaUrl}
                            alt="Message attachment"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <div
                        className={`text-[9px] mt-1.5 flex items-center gap-1.5 ${
                          isMe ? 'text-blue-200 justify-end' : 'text-slate-400'
                        }`}
                      >
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && (
                          <span className="flex items-center gap-0.5">
                            {msg.read ? (
                              <span
                                className="flex items-center gap-0.5 text-cyan-300 font-semibold"
                                title={
                                  msg.readAt
                                    ? `Read at ${new Date(msg.readAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}`
                                    : 'Read'
                                }
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline shrink-0" />
                                <span className="text-[9px]">Read</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-blue-200/80" title="Sent">
                                <Check className="w-3.5 h-3.5 inline shrink-0" />
                                <span className="text-[9px]">Sent</span>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reactions Bar */}
            <div className="px-4 py-1.5 flex items-center gap-1.5 border-t border-slate-800/60 bg-slate-950/40">
              <span className="text-[10px] text-slate-500">Quick reaction:</span>
              {['👍', '🔥', '❤️', '⚡', '👏'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setMessageInput((prev) => prev + emoji)}
                  className="px-2 py-0.5 text-xs hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800/80">
              {selectedMedia && (
                <div className="relative inline-block mb-2 rounded-xl overflow-hidden border border-slate-700">
                  <img
                    src={selectedMedia}
                    alt="Upload thumbnail"
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedMedia(null)}
                    className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sampleImg = '/src/assets/images/post_desk_setup_1793017961952.jpg';
                    setSelectedMedia(selectedMedia ? null : sampleImg);
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    selectedMedia ? 'text-blue-400 bg-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Attach screenshot or photo"
                >
                  <Image className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={`Message ${partnerUser.nickName}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim() && !selectedMedia}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl shadow-md shadow-blue-500/25 transition-all"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mb-3">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Select a Conversation</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Choose from your existing messages on the left, or search a user to start chatting.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md"
            >
              Start New Message
            </button>
          </div>
        )}
      </div>

      {/* ================= MODAL: START NEW CHAT ================= */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setShowNewChatModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">New Message</h3>
            <p className="text-xs text-slate-400 mb-4">
              Search by name or @handle to start a direct message thread.
            </p>

            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {eligibleUsers.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-4">No users found.</p>
              ) : (
                eligibleUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartNewChat(user)}
                    className="w-full p-2.5 flex items-center gap-3 rounded-xl hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <img
                      src={user.avatarUrl || '/src/assets/images/avatar_tech_dev_1793017960598.jpg'}
                      alt={user.fullName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="truncate flex-1">
                      <div className="text-xs font-semibold text-white truncate">{user.fullName}</div>
                      <div className="text-[11px] text-blue-400 font-mono truncate">{user.nickName}</div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Chat</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
