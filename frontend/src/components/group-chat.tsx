"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Smile, ImageIcon, X } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { initWebSocket, addMessageListener } from "@/lib/websocket";

interface GroupChatMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  timestamp: string;
  type: "text" | "emoji" | "image";
  isOwn: boolean;
}

interface GroupChatProps {
  groupId: string;
  groupTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GroupChat({
  groupId,
  groupTitle,
  isOpen,
  onClose,
}: GroupChatProps) {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      // Initialize WebSocket (assuming user ID is handled by session/cookie on backend)
      // We pass 0 or dummy ID as initWebSocket mainly sets up the connection
      initWebSocket(0);

      const removeListener = addMessageListener((data: any) => {
        if (
          data.type === "group_message" &&
          data.groupId === parseInt(groupId)
        ) {
          const newMsg: GroupChatMessage = {
            id: data.id.toString(),
            content: data.content,
            authorId: data.senderId.toString(),
            authorName: data.sender.firstName + " " + data.sender.lastName,
            authorAvatar: data.sender.avatar || "",
            timestamp: data.createdAt,
            type: "text", // Backend currently only supports text content in this payload structure
            isOwn: false, // We'll handle "isOwn" logic by checking senderId against current user if needed,
            // but for incoming WS messages, if it's broadcasted back to sender, we might duplicate.
            // Usually sender adds their own message optimistically or via API response.
            // Let's check if we receive our own messages.
          };

          // Avoid duplicates if we already added it via API response
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      });

      return () => {
        removeListener();
      };
    }
  }, [isOpen, groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/groups/chat/${groupId}`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        const formattedMessages: GroupChatMessage[] = data.map((msg: any) => ({
          id: msg.id.toString(),
          content: msg.content,
          authorId: msg.senderId.toString(),
          authorName: msg.sender.firstName + " " + msg.sender.lastName,
          authorAvatar: msg.sender.avatar || "",
          timestamp: msg.createdAt,
          type: "text",
          isOwn: msg.isOwn,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      try {
        const res = await fetch("http://localhost:8080/api/groups/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: parseInt(groupId),
            content: newMessage.trim(),
          }),
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          const sentMsg: GroupChatMessage = {
            id: data.id.toString(),
            content: data.content,
            authorId: data.senderId.toString(),
            authorName: data.sender.FirstName + " " + data.sender.LastName, // Note capitalization from Go struct
            authorAvatar: data.sender.AvatarUrl || "",
            timestamp: data.createdAt,
            type: "text",
            isOwn: true,
          };

          setMessages((prev) => [...prev, sentMsg]);
          setNewMessage("");
          setShowEmojiPicker(false);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Image upload logic would go here, likely needing a separate API endpoint
    // For now, we'll just log it as not implemented fully in backend for chat yet
    console.log("Image upload not yet implemented for group chat");
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center justify-between">
            <span>{groupTitle} - Group Chat</span>
          </DialogTitle>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.isOwn ? "justify-end" : "justify-start"
              }`}
            >
              {!message.isOwn && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage
                    src={message.authorAvatar}
                    alt={message.authorName}
                  />
                  <AvatarFallback>
                    {message.authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-xs lg:max-w-md ${
                  message.isOwn ? "order-2" : "order-1"
                }`}
              >
                {!message.isOwn && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {message.authorName}
                  </div>
                )}

                <div>
                  {message.type === "emoji" ? (
                    <div className="text-4xl cursor-pointer">
                      {message.content}
                    </div>
                  ) : message.type === "image" ? (
                    <div className="overflow-hidden max-w-xs cursor-pointer rounded-lg">
                      <img
                        src={message.content}
                        alt="Uploaded image"
                        className="w-full h-auto hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.content, "_blank")}
                      />
                    </div>
                  ) : (
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        message.isOwn
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {message.isOwn && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage
                    src={message.authorAvatar}
                    alt={message.authorName}
                  />
                  <AvatarFallback>
                    {message.authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-50">
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              theme={Theme.DARK}
              width={300}
              height={400}
            />
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 border-t border-border">
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
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>

            <div className="flex-1 relative">
              <Input
                placeholder="Type a message..."
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
      </DialogContent>
    </Dialog>
  );
}

export default GroupChat;
