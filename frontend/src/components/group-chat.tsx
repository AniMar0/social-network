"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Smile, ImageIcon, X } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface GroupChatMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  timestamp: string;
  type: "text" | "emoji" | "image";
}

interface GroupChatProps {
  groupId: string;
  groupTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const sampleGroupMessages: GroupChatMessage[] = [
  {
    id: "1",
    content: "Hey everyone! Welcome to our group chat 👋",
    authorId: "user1",
    authorName: "John Doe",
    authorAvatar: "https://i.imgur.com/aSlIJks.png",
    timestamp: "2024-03-15T10:30:00Z",
    type: "text",
  },
  {
    id: "2",
    content: "Thanks for creating this group! Looking forward to our discussions 😊",
    authorId: "user2",
    authorName: "Jane Smith",
    authorAvatar: "https://i.imgur.com/aSlIJks.png",
    timestamp: "2024-03-15T10:32:00Z",
    type: "text",
  },
  {
    id: "3",
    content: "🎉",
    authorId: "user3",
    authorName: "Mike Johnson",
    authorAvatar: "https://i.imgur.com/aSlIJks.png",
    timestamp: "2024-03-15T10:33:00Z",
    type: "emoji",
  },
];

export function GroupChat({ groupId, groupTitle, isOpen, onClose }: GroupChatProps) {
  const [messages, setMessages] = useState<GroupChatMessage[]>(sampleGroupMessages);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Check if message is only emojis
      const isOnlyEmojis = /^[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]+$/u.test(newMessage.trim());
      
      const message: GroupChatMessage = {
        id: Date.now().toString(),
        content: newMessage.trim(),
        authorId: "currentUser",
        authorName: "Current User",
        authorAvatar: "https://i.imgur.com/aSlIJks.png",
        timestamp: new Date().toISOString(),
        type: isOnlyEmojis ? "emoji" : "text",
      };

      setMessages([...messages, message]);
      setNewMessage("");
      setShowEmojiPicker(false);
      
      console.log("Sent group message:", message);
      // TODO: Send to backend API
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a URL for the image preview
      const imageUrl = URL.createObjectURL(file);
      
      const message: GroupChatMessage = {
        id: Date.now().toString(),
        content: imageUrl,
        authorId: "currentUser",
        authorName: "Current User",
        authorAvatar: "https://i.imgur.com/aSlIJks.png",
        timestamp: new Date().toISOString(),
        type: "image",
      };

      setMessages([...messages, message]);
      console.log("Sent image to group:", file);
      // TODO: Upload to backend and send image message
      
      // Reset the input
      event.target.value = "";
    }
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
                message.authorId === "currentUser" ? "justify-end" : "justify-start"
              }`}
            >
              {message.authorId !== "currentUser" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={message.authorAvatar} alt={message.authorName} />
                  <AvatarFallback>
                    {message.authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={`max-w-xs lg:max-w-md ${
                  message.authorId === "currentUser" ? "order-2" : "order-1"
                }`}
              >
                {message.authorId !== "currentUser" && (
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
                        message.authorId === "currentUser"
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
              
              {message.authorId === "currentUser" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={message.authorAvatar} alt={message.authorName} />
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