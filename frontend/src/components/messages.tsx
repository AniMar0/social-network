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

interface Message {
  id: string;
  content: string;
  timestamp: string;
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

const sampleMessages: Message[] = [
  {
    id: "1",
    content: "😰",
    timestamp: "Jul 26, 2025, 8:14 PM",
    isOwn: false,
    isRead: true,
    type: "emoji",
  },
  {
    id: "2",
    content: "Hey! How are you doing?",
    timestamp: "Jul 26, 2025, 8:15 PM",
    isOwn: false,
    isRead: true,
    type: "text",
  },
  {
    id: "3",
    content: "I'm doing great, thanks for asking!",
    timestamp: "Jul 26, 2025, 8:16 PM",
    isOwn: true,
    isRead: true,
    type: "text",
    replyTo: {
      id: "2",
      content: "Hey! How are you doing?",
      type: "text",
      senderName: "meclawd",
    },
  },
];

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
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    age: "",
    aboutMe: "",
    joinedDate: "",
    followersCount: "",
  });

  const router = useRouter();

  const [userOnlineStatus, setUserOnlineStatus] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Get notification count for sidebar
  const notificationCount = useNotificationCount();

  const [chats, setChats] = useState<Chat[]>([]);

  // Fetch user profile data when chat is selected
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch("/api/get-users"); // backend route ديالك
        if (!res.ok) throw new Error("Failed to fetch chats");
        const data: Chat[] = await res.json();
        setChats(data);
        if (onUserProfileClick && selectedChat === null) {
          data.map((chat) => {
            if (onUserProfileClick === chat.id) {
              setSelectedChat(chat);
            }
          });
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

  const fetchMessages = async (userId: string) => {
    try {
      setMessagesLoading(true);
      console.log("Fetching messages for user:", userId);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/get-messages/${userId}`);
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
      const response = await fetch(`/api/get-users/profile/${userId}`);
      const profileData = await response.json();
      console.log("Fetched profile data:", profileData);
      setUserProfile(profileData);

      // For now, using mock data
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchUserOnlineStatus = async (userId: string) => {
    try {
      console.log("Fetching online status for user:", userId);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/users/${userId}/status`);
      // const statusData = await response.json();
      // setUserOnlineStatus(statusData.isOnline);

      // For now, using mock data based on chat data
      const chat = chats.find((c) => c.id === userId);
      if (chat) {
        setUserOnlineStatus(chat.isOnline || false);
      }
    } catch (error) {
      console.error("Error fetching user online status:", error);
    }
  };

  const filteredChats = (chats ?? []).filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      setMessages((prev) => [...prev, message]);

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

      setNewMessage("");
      setReplyingTo(null); // Clear reply state
    }
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New post clicked");
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gifUrl: string) => {
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
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a preview URL for the image
      const imageUrl = URL.createObjectURL(file);

      // Send image as a message
      const message: Message = {
        id: Date.now().toString(),
        content: imageUrl,
        timestamp: new Date().toLocaleString(),
        isOwn: true,
        isRead: false,
        type: "image",
      };

      setMessages((prev) => [...prev, message]);

      console.log("Sending image:", file);
      // TODO: Add backend logic to upload and send image

      // Reset the input
      event.target.value = "";
    }
  };

  const handleUnsendMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    console.log("Unsending message:", messageId);
    // TODO: Add backend logic to unsend message
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

  return (
    <div className="flex h-screen bg-background">
      <SidebarNavigation
        activeItem="messages"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
      />

      {/* Messages Sidebar */}
      <div className="w-80 border-r border-border bg-card">
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
                  router.push(`/messages/${chat.id}`);
                  setSelectedChat(chat);
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
                    <span className="text-sm text-muted-foreground truncate">
                      {chat.username} ·{" "}
                      {new Date(chat.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col">
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
                {messages.map((message) => (
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
                                  src={message.content}
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
                      <div
                        className={`flex items-center gap-2 mt-1 ${
                          message.isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp}
                        </span>
                        {message.isRead && (
                          <span className="text-xs text-muted-foreground">
                            · Seen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">
              Select a message
            </h3>
            <p className="text-muted-foreground">
              Choose from your existing conversations or start a new one
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessagesPage;
