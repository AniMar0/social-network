"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { SidebarNavigation } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ImagePlay, ImageIcon, Smile, Send } from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";
import EmojiPicker, { Theme } from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { getWebSocket } from "@/lib/websocket";
import { timeAgo } from "@/lib/tools";

interface Message {
  id: string;
  content: string;
  timestamp: string;
  seen?: string;
  isOwn: boolean;
  isRead: boolean;
  type: "text" | "emoji" | "gif" | "image";
  replyTo?: {
    id: string;
    content: string;
    type: "text" | "emoji" | "gif" | "image";
    isOwn: boolean;
  };
}

interface Chat {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  lastMessageId: string;
  timestamp: string;
  unreadCount: number;
  isVerified?: boolean;
  isOnline?: boolean;
}

interface UserProfile {
  age: string;
  aboutMe: string;
  joinedDate: string;
  followersCount: string;
}

interface MessagesPageProps {
  onNavigate?: (page: string) => void;
  onNewPost?: () => void;
  onUserProfileClick?: string;
}

export function MessagesPage({
  onNavigate,
  onNewPost,
  onUserProfileClick,
}: MessagesPageProps) {
  // --- states (kept original names where relevant) ---
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    age: "",
    aboutMe: "",
    joinedDate: "",
    followersCount: "",
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // typing indicators
  const [isTyping, setIsTyping] = useState(false); // other user's typing for UI
  const [isUserTyping, setIsUserTyping] = useState(false); // my typing state

  // removed typingTimeout & userTypingTimeout states (use refs instead)
  const typingRef = useRef<NodeJS.Timeout | null>(null); // for other user
  const userTypingRef = useRef<NodeJS.Timeout | null>(null); // for my typing debounce

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false); // alias to support UI if needed

  const router = useRouter();

  const [userOnlineStatus, setUserOnlineStatus] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);

  const notificationCount = useNotificationCount();

  const [chats, setChats] = useState<Chat[]>([]);

  // keep a ref to ws to add/remove handlers cleanly
  const wsRef = useRef<WebSocket | null>(null);

  // ===========================
  //  WebSocket setup & handlers
  //  - moved logic into named functions for clarity
  // ===========================
  useEffect(() => {
    const ws = getWebSocket();
    if (!ws) return;
    wsRef.current = ws;

    // Handlers: separated to keep effect concise
    const onMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handleWsEvent(data);
      } catch (err) {
        console.error("Invalid ws message", err);
      }
    };

    ws.addEventListener("message", onMessage);

    return () => {
      ws.removeEventListener("message", onMessage);
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, onUserProfileClick]); // keep dependency minimal; handler uses latest selectedChat via closures

  // Centralized WS events processor
  const handleWsEvent = (data: any) => {
    // NOTE: Keep names and behaviours same as before but grouped.
    if (data.channel === "status") {
      setChats((prevChats) =>
        prevChats.map((c) =>
          c.id == data.user ? { ...c, isOnline: data.status } : c
        )
      );
      if (selectedChat?.id == data.user) {
        setUserOnlineStatus(data.status);
      }
      return;
    }

    if (data.channel === "typing-start") {
      handleOtherUserTypingStart(data.payload.chat_id, data.payload.user_id);
      return;
    }

    if (data.channel === "typing-stop") {
      handleOtherUserTypingStop(data.payload.chat_id, data.payload.user_id);
      return;
    }

    if (data.channel === "chat") {
      // if viewing the chat -> append + send chat-seen (same behaviour)
      if (onUserProfileClick && onUserProfileClick == data.payload.chat_id) {
        // send seen ack
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              channel: "chat-seen",
              chat_id: onUserProfileClick,
              to: data.payload.sender_id,
            })
          );
        }
        setMessages((prev) => (prev ? [...prev, data.payload] : [data.payload]));
      } else {
        // update sidebar chats
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id == data.payload.chat_id
              ? {
                  ...c,
                  unreadCount: c.unreadCount + 1,
                  lastMessage: data.payload.content,
                  lastMessageType: data.payload.type,
                  timestamp: data.payload.timestamp,
                }
              : c
          )
        );
      }
      return;
    }

    if (data.channel === "chat-seen") {
      if (onUserProfileClick && onUserProfileClick == data.payload.chat_id) {
        setMessages((prev) => {
          if (!prev || prev.length === 0) return [];
          const lastIndex = prev.length - 1;
          const lastMessage = prev[lastIndex];
          if (lastMessage.isRead) return prev;
          const updated = [...prev];
          updated[lastIndex] = {
            ...lastMessage,
            isRead: true,
            timestamp: data.payload.message.timestamp,
          };
          return updated;
        });
      }
      return;
    }

    if (data.channel === "chat-delete") {
      if (onUserProfileClick && onUserProfileClick == data.payload.chat_id) {
        setMessages((prev) => prev.filter((msg) => msg.id !== data.payload.message_id));
      } else {
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.lastMessageId == data.payload.message.id
              ? {
                  ...c,
                  unreadCount: Math.max(0, c.unreadCount - 1),
                  lastMessage: data.payload.message.content,
                  lastMessageType: data.payload.message.type,
                  timestamp: data.payload.message.timestamp,
                }
              : c
          )
        );
      }
      return;
    }
  };

  // ===========================
  //  Fetch chats & messages when selectedChat changes
  //  (kept your original flow but structured)
  // ===========================
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`/api/get-users`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch chats");
        const data: Chat[] = await res.json();
        setChats(data || []);
        if (onUserProfileClick && !selectedChat && data) {
          const chat = data.find((c) => c.id === onUserProfileClick);
          if (chat) setSelectedChat(chat);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchChats();

    if (selectedChat) {
      fetchUserProfile(selectedChat.id);
      fetchUserOnlineStatus(selectedChat.id);
      fetchMessages(selectedChat.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // reduce frequency of seen display updates (was 100ms -> now 1000ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) => {
        if (!prev || prev.length === 0) return [];
        const lastIndex = prev.length - 1;
        const lastMessage = prev[lastIndex];
        if (!lastMessage.isRead) return prev;
        const updated = [...prev];
        updated[lastIndex] = {
          ...lastMessage,
          seen: timeAgo(lastMessage.timestamp),
        };
        return updated;
      });
    }, 1000); // changed to 1s to reduce CPU overhead

    return () => clearInterval(interval);
  }, [messages]);

  const fetchMessages = async (userId: string) => {
    try {
      setMessagesLoading(true);
      const response = await fetch(`/api/get-messages/${userId}`, {
        credentials: "include",
      });
      const messagesData = await response.json();
      setMessages(messagesData);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/get-users/profile/${userId}`, {
        credentials: "include",
      });
      const profileData = await response.json();
      setUserProfile(profileData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchUserOnlineStatus = (userId: string) => {
    const chat = chats.find((c) => c.id == userId);
    if (chat) {
      setUserOnlineStatus(chat.isOnline || false);
    }
  };

  const filteredChats = (chats ?? []).filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // scroll helpers (kept)
  const scrollToBottom = (force = false) => {
    if (force || isUserAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const checkIfAtBottom = () => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const threshold = 100;
    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + threshold;
    setIsUserAtBottom(isAtBottom);
  };

  useEffect(() => {
    if (messages.length > previousMessageCount) {
      scrollToBottom();
      setPreviousMessageCount(messages.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (selectedChat) {
      setIsUserAtBottom(true);
      setPreviousMessageCount(messages.length);
      setTimeout(() => scrollToBottom(true), 100);

      // Reset typing states when switching chats
      setIsTyping(false);
      setIsUserTyping(false);
      if (userTypingRef.current) {
        clearTimeout(userTypingRef.current);
        userTypingRef.current = null;
      }
      if (typingRef.current) {
        clearTimeout(typingRef.current);
        typingRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // ===========================
  //  Typing effect for my typing (debounced)
  //  - useRef for timeout, send start once, send stop after debounce
  // ===========================
  useEffect(() => {
    // If input non-empty -> start typing (send once), reset debounce timer
    if (!selectedChat || !onUserProfileClick) return;

    const ws = wsRef.current;
    if (newMessage.length > 0) {
      // send typing-start only once
      if (!isUserTyping) {
        setIsUserTyping(true);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                channel: "typing-start",
                chat_id: onUserProfileClick,
              })
            );
          } catch (err) {
            console.error("Error sending typing-start:", err);
          }
        }
      }

      // reset debounce timer to stop typing after 3s of inactivity
      if (userTypingRef.current) clearTimeout(userTypingRef.current);
      userTypingRef.current = setTimeout(() => {
        // stop typing
        setIsUserTyping(false);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                channel: "typing-stop",
                chat_id: selectedChat.id,
              })
            );
          } catch (err) {
            console.error("Error sending typing-stop:", err);
          }
        }
        userTypingRef.current = null;
      }, 3000);
    } else {
      // empty input => stop immediately
      if (isUserTyping) {
        setIsUserTyping(false);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                channel: "typing-stop",
                chat_id: selectedChat.id,
              })
            );
          } catch (err) {
            console.error("Error sending typing-stop:", err);
          }
        }
      }
      if (userTypingRef.current) {
        clearTimeout(userTypingRef.current);
        userTypingRef.current = null;
      }
    }

    // cleanup on effect rerun: do NOT clear userTypingRef here (we rely on it)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newMessage, selectedChat]);

  // ===========================
  // Other user typing handlers (kept names, simplified)
  // - use typingRef for debounce
  // ===========================
  const handleOtherUserTypingStart = (chatId: string, userId: string) => {
    if (onUserProfileClick && chatId === onUserProfileClick) {
      setIsOtherUserTyping(true);
      setIsTyping(true);

      // reset timeout to clear typing after 3s if no new event
      if (typingRef.current) clearTimeout(typingRef.current);
      typingRef.current = setTimeout(() => {
        setIsOtherUserTyping(false);
        setIsTyping(false);
        typingRef.current = null;
      }, 3000);
    }
  };

  const handleOtherUserTypingStop = (chatId: string, userId: string) => {
    if (onUserProfileClick && chatId === onUserProfileClick) {
      setIsOtherUserTyping(false);
      setIsTyping(false);
      if (typingRef.current) {
        clearTimeout(typingRef.current);
        typingRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      // clear any pending timeouts on unmount
      if (typingRef.current) {
        clearTimeout(typingRef.current);
        typingRef.current = null;
      }
      if (userTypingRef.current) {
        clearTimeout(userTypingRef.current);
        userTypingRef.current = null;
      }
    };
  }, []);

  // handleInputChange now only updates state; typing logic handled in useEffect above
  const handleInputChange = (value: string) => {
    setNewMessage(value);
  };

  // Send message (kept same, minor cleanup)
  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedChat) {
      const isOnlyEmojis =
        /^[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]+$/u.test(
          newMessage.trim()
        );

      const tempId = uuidv4();
      const message: Message = {
        id: tempId,
        content: newMessage.trim(),
        timestamp: new Date().toLocaleString(),
        isOwn: true,
        isRead: false,
        type: isOnlyEmojis ? "emoji" : "text",
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              content: replyingTo.content,
              type: replyingTo.type,
              isOwn: replyingTo.isOwn,
            }
          : undefined,
      };

      setMessages((prev) => (prev ? [...prev, message] : [message]));

      try {
        const response = await fetch(
          `/api/send-message/${onUserProfileClick}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message),
          }
        );
        if (!response.ok) throw new Error("Failed to send message");
        if (replyingTo) {
          // keep behavior
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      }

      setNewMessage("");
      setReplyingTo(null);

      // stop typing immediately after send
      const ws = wsRef.current;
      setIsUserTyping(false);
      if (userTypingRef.current) {
        clearTimeout(userTypingRef.current);
        userTypingRef.current = null;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              channel: "typing-stop",
              chat_id: selectedChat.id,
            })
          );
        } catch (err) {
          console.error("Error sending typing-stop:", err);
        }
      }
    }
  };

  const handleNewPost = () => {
    onNewPost?.();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = async (gifUrl: string) => {
    const message: Message = {
      id: uuidv4(),
      content: gifUrl,
      timestamp: new Date().toLocaleString(),
      isOwn: true,
      isRead: false,
      type: "gif",
    };

    setMessages((prev) => [...prev, message]);
    setShowGifPicker(false);

    try {
      const response = await fetch(`/api/send-message/${onUserProfileClick}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      if (!response.ok) throw new Error("Failed to send message");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    }
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const avatarForm = new FormData();
    let avatarUrl = "";
    avatarForm.append("image", file);

    await fetch("/api/upoad-file", {
      method: "POST",
      body: avatarForm,
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Upload failed");
        }
        return res.json();
      })
      .then((data) => (avatarUrl = data.messageImageUrl))
      .catch((err) => {
        console.error(err);
      });

    const message: Message = {
      id: uuidv4(),
      content: avatarUrl || imageUrl,
      timestamp: new Date().toLocaleString(),
      isOwn: true,
      isRead: false,
      type: "image",
    };

    setMessages((prev) => [...prev, message]);

    try {
      const response = await fetch(`/api/send-message/${onUserProfileClick}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      if (!response.ok) throw new Error("Failed to send message");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    }

    event.target.value = "";
  };

  const handleUnsendMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/unsend-message/${messageId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unsend message");
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error("Error unsending message:", error);
    }
  };

  const handleReplyToMessage = async (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const renderReplyContent = (replyTo: Message["replyTo"]) => {
    if (!replyTo) return null;
    switch (replyTo.type) {
      case "emoji":
        return replyTo.content;
      case "image":
        return "📷 Image";
      case "gif":
        return "🎞️ GIF";
      default:
        return replyTo.content;
    }
  };

  const setSeenChat = (chatId: string) => {
    fetch(`/api/set-seen-chat/${chatId}`, {
      method: "POST",
      credentials: "include",
    }).catch((err) => console.error(err));
  };

  function formatChatMeta(chat: any) {
    const hideTime = chat.sender_id == chat.userId || !chat.timestamp;
    let message = "";
    let messageType = "";
    switch (chat.lastMessageType) {
      case "image":
        message = "📷 Image";
        break;
      case "gif":
        message = "🎞️ GIF";
        break;
      default:
        message = chat.lastMessage;
        messageType = "Message";
        break;
    }
    switch (hideTime && chat.sender_id == chat.userId) {
      case true:
        return (
          <span className="text-sm text-muted-foreground truncate">
            {"You sent an " + messageType}
          </span>
        );
      default:
        return (
          <span className="text-sm text-muted-foreground truncate">
            {message}{" "}
            {!hideTime && chat.timestamp && <>{timeAgo(chat.timestamp, true)}</>}
          </span>
        );
    }
  }

  // --- JSX kept largely the same, only minor adjustments to use new state names ---
  return (
    <div className="flex min-h-screen bg-background lg:ml-64">
      <SidebarNavigation
        activeItem="messages"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card lg:block hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
            <div className="flex items-center gap-2"></div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Direct Messages"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-medium text-foreground">Chat</span>
          </div>

          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  router.replace(`/messages/${chat.id}`);
                  setSelectedChat(chat);
                  setSeenChat(chat.id);
                }}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChat?.id === chat.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={`http://localhost:8080/${chat.avatar}`}
                      alt={chat.name}
                    />
                    <AvatarFallback className="bg-muted text-foreground">
                      {chat.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {chat.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                  {chat.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-sm flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {chat.unreadCount}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground truncate">
                      {chat.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    {formatChatMeta(chat)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={`http://localhost:8080/${selectedChat.avatar}`}
                    alt={selectedChat.name}
                  />
                  <AvatarFallback className="bg-muted text-foreground">
                    {`http://localhost:8080/${selectedChat.avatar}`}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">
                    {selectedChat.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile */}
          <div className="p-6 border-b border-border bg-card text-center">
            <div className="relative inline-block">
              <Avatar className="h-16 w-16 mx-auto mb-3">
                <AvatarImage
                  src={`http://localhost:8080/${selectedChat.avatar}`}
                  alt={selectedChat.name}
                />
                <AvatarFallback className="bg-muted text-foreground text-lg">
                  {selectedChat.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {userOnlineStatus && (
                <div className="absolute bottom-2 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <h3 className="font-bold text-foreground">{selectedChat.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {selectedChat.username}
            </p>
            <p className="text-sm text-foreground mb-2">
              {userProfile.age} years old
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              {userProfile.aboutMe}
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Joined {new Date(userProfile.joinedDate).toLocaleDateString()} ·{" "}
                {userProfile.followersCount} followers
              </p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={checkIfAtBottom}
            className="flex-1 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages &&
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md ${message.isOwn ? "order-2" : "order-1"}`}
                      >
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <div className={`${message.isOwn ? "ml-auto" : "mr-auto"} max-w-xs lg:max-w-md`}>
                              {message.replyTo && (
                                <div className={`mb-1 px-3 py-1 rounded-t-sm text-xs border-l-2 ${message.isOwn ? "bg-blue-400 text-white border-blue-200" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-400"}`}>
                                  {(message.isOwn && <div className="opacity-80 font-medium">You replied to {selectedChat.name}:</div>) || (<div className="opacity-80 font-medium">{selectedChat.name} replied to you:</div>)}
                                  <div className="opacity-70 truncate">{renderReplyContent(message.replyTo)}</div>
                                </div>
                              )}

                              {message.type === "emoji" ? (
                                <div className={`text-6xl cursor-pointer ${message.replyTo ? "rounded-b-sm" : "rounded-sm"}`}>{message.content}</div>
                              ) : message.type === "gif" ? (
                                <div className={`overflow-hidden max-w-xs cursor-pointer ${message.replyTo ? "rounded-b-sm" : "rounded-sm"}`}><img src={message.content} alt="GIF" className="w-full h-auto" /></div>
                              ) : message.type === "image" ? (
                                <div className={`overflow-hidden max-w-xs cursor-pointer ${message.replyTo ? "rounded-b-sm" : "rounded-sm"}`}><img src={`http://localhost:8080/${message.content}`} alt="Uploaded image" className="w-full h-auto hover:opacity-90 transition-opacity" onClick={() => window.open(message.content, "_blank")} /></div>
                              ) : (
                                <div className={`px-4 py-2 cursor-pointer ${message.replyTo ? "rounded-b-sm" : "rounded-sm"} ${message.isOwn ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"}`}>
                                  {message.content}
                                </div>
                              )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            {message.isOwn ? (
                              <ContextMenuItem onClick={() => handleUnsendMessage(message.id)} className="text-red-600 focus:text-red-600">Unsend Message</ContextMenuItem>
                            ) : (
                              <ContextMenuItem onClick={() => handleReplyToMessage(message)} className="text-blue-600 focus:text-blue-600">Reply to Message</ContextMenuItem>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                        {message.isRead && message.isOwn && message === messages[messages.length - 1] && (
                          <div className="flex items-center gap-2 mt-1 justify-start">
                            <span className="text-xs text-muted-foreground">
                              {message.seen ? message.seen : timeAgo(message.timestamp)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {showEmojiPicker && (
            <EmojiPicker onEmojiClick={(e) => handleEmojiSelect(e.emoji)} theme={Theme.DARK} />
          )}
          {showGifPicker && (
            <GifPicker onGifClick={(g) => handleGifSelect(g.url)} tenorApiKey="AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ" categoryHeight={100} theme={Theme.DARK} />
          )}

          {/* Typing indicator (other user) */}
          {isTyping && selectedChat && (
            <div className="px-4 py-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`http://localhost:8080/${selectedChat.avatar}`} alt={selectedChat.name} />
                  <AvatarFallback className="bg-muted text-foreground">{selectedChat.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedChat.name} is typing...</span>
                </div>
              </div>
            </div>
          )}

          {/* Reply Preview */}
          {replyingTo && (
            <div className="p-3 mx-4 bg-muted/50 border-l-4 border-blue-500 rounded-r-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Replying to {replyingTo.isOwn ? "yourself" : selectedChat?.name}</p>
                  <p className="text-sm text-foreground truncate max-w-md">
                    {replyingTo.type === "emoji" ? replyingTo.content : replyingTo.type === "image" ? "📷 Image" : replyingTo.type === "gif" ? "🎞️ GIF" : replyingTo.content}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={cancelReply} className="h-6 w-6 p-0 ml-2">×</Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <Button variant="ghost" size="icon" onClick={handleImageSelect} title="Upload image"><ImageIcon className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }} className="text-white hover:text-foreground" title="Send GIF"><ImagePlay className="h-5 w-5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} className="text-white hover:text-foreground" title="Add emoji"><Smile className="h-5 w-5" /></Button>
              <div className="flex-1 relative">
                <Input
                  placeholder={replyingTo ? `Reply to ${replyingTo.isOwn ? "yourself" : selectedChat?.name}...` : "Start a new message"}
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="pr-10"
                />
                <Button onClick={handleSendMessage} size="icon" variant="ghost" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-1 items-center justify-center bg-muted/20">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">Select a message</h3>
              <p className="text-muted-foreground">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessagesPage;