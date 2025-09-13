"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImageIcon,
  Smile,
  ImagePlay,
  X,
  Globe,
  Users,
  Lock,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import { authUtils } from "@/lib/navigation";

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost?: (postData: PostData) => void;
}

interface PostData {
  content: string;
  image?: string;
  privacy: "public" | "almost-private" | "private";
}

let avatarFile: File;

export function NewPostModal({ isOpen, onClose, onPost }: NewPostModalProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<
    "public" | "almost-private" | "private"
  >("public");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { loggedIn, user } = await authUtils.checkAuth();
        if (loggedIn && user) setCurrentUser(user);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    avatarFile = file;
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedImage(gifUrl);
    setShowGifPicker(false);
  };

  const handleClose = () => {
    setContent("");
    setSelectedImage(null);
    setPrivacy("public");
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    onClose();
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedImage) return;

    const postData: PostData = {
      content: content.trim(),
      image: selectedImage || undefined,
      privacy,
    };

    if (avatarFile) {
      const avatarForm = new FormData();
      avatarForm.append("avatar", avatarFile);
      try {
        const res = await fetch("http://localhost:8080/api/upload-avatar", {
          method: "POST",
          body: avatarForm,
          credentials: "include",
        });
        const data = await res.json();
        postData.image = data.avatarUrl;
      } catch (err) {
        console.error(err);
      }
    }

    try {
      const res = await fetch("http://localhost:8080/api/create-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(postData),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Error creating post:", text);
        return;
      }
      const createdPost = await res.json();
      onPost?.(createdPost);

      handleClose();
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  const getPrivacyIcon = (type: string) => {
    switch (type) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "almost-private":
        return <Users className="h-4 w-4" />;
      case "private":
        return <Lock className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getPrivacyLabel = (type: string) => {
    switch (type) {
      case "public":
        return "Public - Everyone can see";
      case "almost-private":
        return "Followers - Only followers can see";
      case "private":
        return "Private - Selected followers only";
      default:
        return "Public - Everyone can see";
    }
  };

  if (!currentUser)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading user...
      </div>
    );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Create New Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={`http://localhost:8080/${currentUser.avatar}`}
                alt={currentUser.fullName}
              />
              <AvatarFallback className="bg-muted text-foreground">
                {currentUser.firstName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">
                {currentUser.firstName + " " + currentUser.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentUser.nickname}
              </p>
            </div>
          </div>

          {/* Textarea */}
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none border-0 text-lg placeholder:text-muted-foreground focus-visible:ring-0"
            maxLength={500}
          />
          <div className="text-right">
            <span
              className={`text-sm ${
                content.length > 450 ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              {content.length}/500
            </span>
          </div>

          {/* Image Preview */}
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full max-h-64 object-cover rounded-lg"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Emoji & GIF */}
          {showEmojiPicker && (
            <EmojiPicker
              onEmojiClick={(e) => handleEmojiSelect(e.emoji)}
              theme="dark"
            />
          )}
          {showGifPicker && (
            <GifPicker
              onGifClick={(g) => handleGifSelect(g.url)}
              tenorApiKey="AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ"
              categoryHeight={100}
              theme="dark"
            />
          )}

          {/* Media Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground"
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Smile className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ImagePlay className="h-5 w-5" />
              </Button>
            </div>

            {/* Privacy */}
            <Select
              value={privacy}
              onValueChange={(v: "public" | "almost-private" | "private") =>
                setPrivacy(v)
              }
            >
              <SelectTrigger className="w-48 flex items-center gap-2">
                {getPrivacyIcon(privacy)}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="almost-private">Followers</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            {getPrivacyLabel(privacy)}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={!content.trim() && !selectedImage}
              className="bg-primary hover:bg-primary/90"
            >
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
