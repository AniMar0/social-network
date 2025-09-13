"use client";

import type React from "react";
import { useState, useRef } from "react";
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

function NewPostModal({ isOpen, onClose, onPost }: NewPostModalProps) {
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<
    "public" | "almost-private" | "private"
  >("public");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      avatarFile = file;
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedImage(gifUrl);
    setShowGifPicker(false);
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedImage) return;

    const postData: PostData = {
      content: content.trim(),
      image: selectedImage || undefined,
      privacy,
    };
    const avatarForm = new FormData();
    avatarForm.append("avatar", avatarFile);

    await fetch("http://localhost:8080/api/upload-avatar", {
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
      .then((data) => {
        console.log("Avatar uploaded:", data.avatarUrl);
        postData.image = data.avatarUrl;
      })
      .catch((err) => {
        console.error(err);
      });
    try {
      const res = await fetch("http://localhost:8080/api/create-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(postData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error creating post:", errorText);
        return;
      }

      const createdPost = await res.json();
      console.log("Post created successfully:", createdPost);

      onPost?.(createdPost);

      setContent("");
      setSelectedImage(null);
      setPrivacy("public");
      setShowEmojiPicker(false);
      setShowGifPicker(false);
      onClose();
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  const handleClose = () => {
    setContent("");
    setSelectedImage(null);
    setPrivacy("public");
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    onClose();
  };

  const getPrivacyIcon = (privacyType: string) => {
    switch (privacyType) {
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

  const getPrivacyLabel = (privacyType: string) => {
    switch (privacyType) {
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
                src="https://imgur.com/v1oBVXE.png"
                alt="Your avatar"
              />
              <AvatarFallback className="bg-muted text-foreground">
                TL
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">Thomas T Link</h3>
              <p className="text-sm text-muted-foreground">@thomas.tlink</p>
            </div>
          </div>

          {/* Content Input */}
          <div className="space-y-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none border-0 text-lg placeholder:text-muted-foreground focus-visible:ring-0"
              maxLength={500}
            />

            {/* Character Count */}
            <div className="text-right">
              <span
                className={`text-sm ${
                  content.length > 450
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {content.length}/500
              </span>
            </div>
          </div>

          {/* Selected Image Preview */}
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage || "/placeholder.svg"}
                alt="Selected content"
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

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div>
              <EmojiPicker
                onEmojiClick={(emojiData) => handleEmojiSelect(emojiData.emoji)}
                theme="dark"
              />
            </div>
          )}

          {/* GIF Picker */}
          {showGifPicker && (
            <div>
              <GifPicker
                onGifClick={(gifData) => handleGifSelect(gifData.url)}
                tenorApiKey={"AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ"}
                categoryHeight={100}
                theme="dark"
              />
            </div>
          )}

          {/* Media and Options Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              {/* Image Upload */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
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

              {/* Emoji Picker Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Smile className="h-5 w-5" />
              </Button>

              {/* GIF Picker Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ImagePlay className="h-5 w-5" />
              </Button>
            </div>

<<<<<<< HEAD
            {/* Privacy Selector */}
            <Select
              value={privacy}
              onValueChange={(value: "public" | "almost-private" | "private") =>
                setPrivacy(value)
              }
            >
              <SelectTrigger className="w-48">
                <div className="flex items-center gap-2">
                  {getPrivacyIcon(privacy)}
                  <SelectValue />
=======
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <div>
                        <EmojiPicker
                                onEmojiClick={(emojiData) => handleEmojiSelect(emojiData.emoji)}
                                theme="dark"
                    />
                        </div>
                    )}

                    {/* GIF Picker */}
                    {showGifPicker && (
                        <div>
                            <GifPicker
                                onGifClick={(gifData) => handleGifSelect(gifData.url)}
                                tenorApiKey={"AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ"}
                                categoryHeight={100}
                                theme="dark"
                            />
                        </div>
                    )}

                    {/* Media and Options Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                            {/* Image Upload */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <ImageIcon className="h-5 w-5" />
                            </Button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

                            {/* Emoji Picker Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowEmojiPicker(!showEmojiPicker)
                                    setShowGifPicker(false)
                                }}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <Smile className="h-5 w-5" />
                            </Button>

                            {/* GIF Picker Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowGifPicker(!showGifPicker)
                                    setShowEmojiPicker(false)
                                }}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <ImagePlay className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Privacy Selector */}
                        <Select
                            value={privacy}
                            onValueChange={(value: "public" | "almost-private" | "private") => setPrivacy(value)}
                        >
                            <SelectTrigger className="w-48">
                                <div className="flex items-center gap-2">
                                    {getPrivacyIcon(privacy)}
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">
                                    <div className="flex items-center gap-2">
                                        <span>Public</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="almost-private">
                                    <div className="flex items-center gap-2">
                                        
                                        <span>Followers</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="private">
                                    <div className="flex items-center gap-2">
                                        
                                        <span>Private</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Privacy Description */}
                    <p className="text-sm text-muted-foreground">{getPrivacyLabel(privacy)}</p>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 cursor-pointer">
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePost}
                            disabled={!content.trim() && !selectedImage}
                            className="bg-primary hover:bg-primary/90 cursor-pointer"
                        >
                            Post
                        </Button>
                    </div>
>>>>>>> 897dc49deab185c91edd92e5dab08b4639be375a
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <span>Public</span>
                  </div>
                </SelectItem>
                <SelectItem value="almost-private">
                  <div className="flex items-center gap-2">
                    <span>Followers</span>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <span>Private</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Privacy Description */}
          <p className="text-sm text-muted-foreground">
            {getPrivacyLabel(privacy)}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 cursor-pointer">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={!content.trim() && !selectedImage}
              className="bg-primary hover:bg-primary/90 cursor-pointer"
            >
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { NewPostModal };
export default NewPostModal;
