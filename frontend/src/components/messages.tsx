"use client";

import { useState, useEffect, useRef } from "react";
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
    senderName: string;
  };
}

interface Chat {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
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

  const router = useRouter();

  const [userOnlineStatus, setUserOnlineStatus] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Get notification count for sidebar
  const notificationCount = useNotificationCount();

  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    const ws = getWebSocket();
    if (!ws) return;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channel === "status") {
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id == data.user ? { ...c, isOnline: data.status } : c
          )
        );
        if (selectedChat?.id == data.user) {
          setUserOnlineStatus(data.status);
        }
      } else if (data.channel === "chat") {
        if (onUserProfileClick && onUserProfileClick == data.payload.chat_id) {
          ws.send(
            JSON.stringify({
              channel: "chat-seen",
              chat_id: onUserProfileClick,
              to: data.payload.sender_id,
            })
          );
          setMessages((prev) => {
            if (prev) {
              return [...prev, data.payload];
            } else {
              return [data.payload];
            }
          });
        }
      } else if (data.channel === "chat-seen") {
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
              timestamp: data.payload.timestamp,
            };

            return updated;
          });
        }
      } else if (data.channel === "chat-delete") {
        if (onUserProfileClick && onUserProfileClick == data.payload.chat_id) {
          setMessages((prev) => {
            if (prev) {
              const index = prev.findIndex(
                (m) => m.id === data.payload.message_id
              );
              if (index !== -1) {
                const updated = [...prev];
                updated[index] = {
                  ...prev[index],
                  isRead: true,
                  timestamp: data.payload.timestamp,
                };
                return updated;
              }
              return prev;
            } else {
              return [];
            }
          });
        }
      }
    };
  }, [selectedChat]);

  // Fetch user profile data when chat is selected
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
  }, [selectedChat]);

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
    }, 100);

    return () => clearInterval(interval);
  }, [messages]);

  const fetchMessages = async (userId: string) => {
    try {
      setMessagesLoading(true);
      console.log("Fetching messages for user:", userId);
      // TODO: Replace with actual API call
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
      console.log("Fetching profile for user:", userId);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/get-users/profile/${userId}`, {
        credentials: "include",
      });
      const profileData = await response.json();
      console.log("Fetched profile data:", profileData);
      setUserProfile(profileData);

      // For now, using mock data
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

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when chat is selected
  useEffect(() => {
    if (selectedChat) {
      setTimeout(scrollToBottom, 100); // Small delay to ensure messages are rendered
    }
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedChat) {
      // Check if message is only emojis
      const isOnlyEmojis =
        /^[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]+$/u.test(
          newMessage.trim()
        );

      // Create new message
      const message: Message = {
        id: Date.now().toString(),
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
              senderName: replyingTo.isOwn
                ? "You"
                : selectedChat?.name || "Unknown",
            }
          : undefined,
      };

      // Add message to the list immediately for instant feedback

      try {
        // TODO: Replace with actual API call
        const response = await fetch(
          `/api/send-message/${onUserProfileClick}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        console.log("Sent message:", data);

        setMessages((prev) => {
          if (prev) {
            return [...prev, data];
          } else {
            return [data];
          }
        });

        if (replyingTo) {
          console.log("Reply to message:", replyingTo.id);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // Remove the message from UI if sending failed
        //setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      }

      setNewMessage("");
      setReplyingTo(null); // Clear reply state
    }
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New post clicked");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = async (gifUrl: string) => {
    // Send GIF as a message
    const message: Message = {
      id: Date.now().toString(),
      content: gifUrl,
      timestamp: new Date().toLocaleString(),
      isOwn: true,
      isRead: false,
      type: "gif",
    };

    setMessages((prev) => [...prev, message]);
    setShowGifPicker(false);

    console.log("Sending GIF:", gifUrl);
    // TODO: Add backend logic to send GIF
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/send-message/${onUserProfileClick}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      if (replyingTo) {
        console.log("Reply to message:", replyingTo.id);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove the message from UI if sending failed
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      // You could also show an error toast here
    }
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a preview URL for the image
      const imageUrl = URL.createObjectURL(file);
      console.log("Sending image:", file);
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
            // backend may return plain text error messages for bad requests
            const text = await res.text();
            throw new Error(text || "Upload failed");
          }
          return res.json();
        })
        .then((data) => (avatarUrl = data.messageImageUrl))
        .catch((err) => {
          console.error(err);
        });

      // Send image as a message
      const message: Message = {
        id: Date.now().toString(),
        content: avatarUrl || imageUrl,
        timestamp: new Date().toLocaleString(),
        isOwn: true,
        isRead: false,
        type: "image",
      };

      setMessages((prev) => [...prev, message]);

      // TODO: Add backend logic to upload and send image
      try {
        // TODO: Replace with actual API call
        const response = await fetch(
          `/api/send-message/${onUserProfileClick}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        if (replyingTo) {
          console.log("Reply to message:", replyingTo.id);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // Remove the message from UI if sending failed
        setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
        // You could also show an error toast here
      }
      // Reset the input
      event.target.value = "";
    }
  };

  const handleUnsendMessage = async (messageId: string) => {
    console.log("Unsending message:", messageId);
    // TODO: Add backend logic to unsend message
    try {
      const response = await fetch(`/api/unsend-message/${messageId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to unsend message");
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error("Error unsending message:", error);
    }
  };

  const handleReplyToMessage = (message: Message) => {
    setReplyingTo(message);
    console.log("Replying to message:", message);
    // Focus on input field
    // TODO: Add backend logic for reply context
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
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to set seen chat");
      })
      .catch((err) => console.error(err));
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
            {!hideTime && chat.timestamp && (
              <>{timeAgo(chat.timestamp, true)}</>
            )}
          </span>
        );
    }
  }

  return (
    <div className="flex min-h-screen bg-background lg:ml-64">
      <SidebarNavigation
        activeItem="messages"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      {/* Messages Sidebar */}
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
          {/* Chat Header */}
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

          {/* Profile Info */}
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
          <div className="flex-1 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading messages...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages &&
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md ${
                          message.isOwn ? "order-2" : "order-1"
                        }`}
                      >
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <div
                              className={`${
                                message.isOwn ? "ml-auto" : "mr-auto"
                              } max-w-xs lg:max-w-md`}
                            >
                              {/* Reply indicator */}
                              {message.replyTo && (
                                <div
                                  className={`mb-1 px-3 py-1 rounded-t-sm text-xs border-l-2 ${
                                    message.isOwn
                                      ? "bg-blue-400 text-white border-blue-200"
                                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-400"
                                  }`}
                                >
                                  <div className="opacity-80 font-medium">
                                    You replied to {message.replyTo.senderName}
                                  </div>
                                  <div className="opacity-70 truncate">
                                    {renderReplyContent(message.replyTo)}
                                  </div>
                                </div>
                              )}

                              {/* Main message content */}
                              {message.type === "emoji" ? (
                                <div
                                  className={`text-6xl cursor-pointer ${
                                    message.replyTo
                                      ? "rounded-b-sm"
                                      : "rounded-sm"
                                  }`}
                                >
                                  {message.content}
                                </div>
                              ) : message.type === "gif" ? (
                                <div
                                  className={`overflow-hidden max-w-xs cursor-pointer ${
                                    message.replyTo
                                      ? "rounded-b-sm"
                                      : "rounded-sm"
                                  }`}
                                >
                                  <img
                                    src={message.content}
                                    alt="GIF"
                                    className="w-full h-auto"
                                  />
                                </div>
                              ) : message.type === "image" ? (
                                <div
                                  className={`overflow-hidden max-w-xs cursor-pointer ${
                                    message.replyTo
                                      ? "rounded-b-sm"
                                      : "rounded-sm"
                                  }`}
                                >
                                  <img
                                    src={`http://localhost:8080/${message.content}`}
                                    alt="Uploaded image"
                                    className="w-full h-auto hover:opacity-90 transition-opacity"
                                    onClick={() =>
                                      window.open(message.content, "_blank")
                                    }
                                  />
                                </div>
                              ) : (
                                <div
                                  className={`px-4 py-2 cursor-pointer ${
                                    message.replyTo
                                      ? "rounded-b-sm"
                                      : "rounded-sm"
                                  } ${
                                    message.isOwn
                                      ? "bg-blue-500 text-white"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  }`}
                                >
                                  {message.content}
                                </div>
                              )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            {message.isOwn ? (
                              <ContextMenuItem
                                onClick={() => handleUnsendMessage(message.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                Unsend Message
                              </ContextMenuItem>
                            ) : (
                              <ContextMenuItem
                                onClick={() => handleReplyToMessage(message)}
                                className="text-blue-600 focus:text-blue-600"
                              >
                                Reply to Message
                              </ContextMenuItem>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                        {message.isRead &&
                          message.isOwn &&
                          message === messages[messages.length - 1] && (
                            <div className="flex items-center gap-2 mt-1 justify-start">
                              <span className="text-xs text-muted-foreground">
                                {message.seen
                                  ? message.seen
                                  : timeAgo(message.timestamp)}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                {/* Auto-scroll target */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Emoji & GIF */}
          {showEmojiPicker && (
            <EmojiPicker
              onEmojiClick={(e) => handleEmojiSelect(e.emoji)}
              theme={Theme.DARK}
            />
          )}
          {showGifPicker && (
            <GifPicker
              onGifClick={(g) => handleGifSelect(g.url)}
              tenorApiKey="AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ"
              categoryHeight={100}
              theme={Theme.DARK}
            />
          )}
          {/* Reply Preview */}
          {replyingTo && (
            <div className="p-3 mx-4 bg-muted/50 border-l-4 border-blue-500 rounded-r-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    Replying to{" "}
                    {replyingTo.isOwn ? "yourself" : selectedChat?.name}
                  </p>
                  <p className="text-sm text-foreground truncate max-w-md">
                    {replyingTo.type === "emoji"
                      ? replyingTo.content
                      : replyingTo.type === "image"
                      ? "📷 Image"
                      : replyingTo.type === "gif"
                      ? "🎞️ GIF"
                      : replyingTo.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelReply}
                  className="h-6 w-6 p-0 ml-2"
                >
                  ×
                </Button>
              </div>
            </div>
          )}
          {/* Message Input */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleImageSelect}
                title="Upload image"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                className="text-white hover:text-foreground"
                title="Send GIF"
              >
                <ImagePlay className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                className="text-white hover:text-foreground"
                title="Add emoji"
              >
                <Smile className="h-5 w-5" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  placeholder={
                    replyingTo
                      ? `Reply to ${
                          replyingTo.isOwn ? "yourself" : selectedChat?.name
                        }...`
                      : "Start a new message"
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="pr-10"
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Empty State */}
          <div className="flex flex-1 items-center justify-center bg-muted/20">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                Select a message
              </h3>
              <p className="text-muted-foreground">
                Choose from your existing conversations or start a new one
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessagesPage;
