// User Profile Page Component
// Displays user info, posts, and handles follow, like, and profile update actions
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ProfileSettings } from "./account-settings";
import type { UserData } from "./account-settings";
import { SidebarNavigation } from "./sidebar";
import {
  Heart,
  MessageCircle,
  Share2,
  Mail,
  Calendar,
  Users,
  MessageSquare,
  Lock,
  Smile,
  ImagePlay,
  Send,
} from "lucide-react";
import { authUtils } from "@/lib/navigation";
import { useNotificationCount } from "@/lib/notifications";
import EmojiPicker, { Theme } from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import { siteConfig } from "@/config/site.config";

interface Comment {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

// Post interface for user posts
export interface Post {
  id: string; // Unique post ID
  content: string; // Post text content
  image?: string; // Optional image URL
  createdAt: string; // ISO date string
  likes: number; // Number of likes
  comments: number; // Number of comments
  isLiked: boolean; // If current user liked this post
  commentsList?: Comment[];
}

// Props for UserProfile component
interface UserProfileProps {
  isOwnProfile?: boolean; // Is this the current user's profile?
  isFollowing?: boolean; // Is the current user following this profile?
  isFollower?: boolean;
  userData: UserData; // User profile data
  posts: Post[]; // List of user posts
  onNewPost?: () => void; // Callback to open new post dialog
  onNavigate?: (itemId: string) => void;
}

function UserProfile({
  isOwnProfile = false,
  isFollowing = false,
  isFollower = false,
  userData,
  posts = [],
  onNewPost,
  onNavigate,
}: UserProfileProps) {
  // Get notification count for sidebar
  const notificationCount = useNotificationCount();
  const router = useRouter();
  // State for profile data (can be updated by settings dialog)
  const [profileData, setProfileData] = useState(userData);
  // State for following/unfollowing this user
  const [followingState, setFollowingState] = useState(
    userData.isfollowing || isFollowing
  );
  // State for follow request status
  const [followRequestStatus, setFollowRequestStatus] = useState<
    "none" | "pending" | "accepted" | "declined"
  >(userData.followRequestStatus || "none");
  // State for liked posts (IDs)
  const [postsState, setPostsState] = useState(posts);
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State for message dialog
  const [messageDialogOpen, setMessageDialogOpen] = useState(
    userData.isfollowing || isFollowing || userData.isfollower || isFollower
  );

  // Comment-related states
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<{
    [key: string]: string | null;
  }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<{
    [key: string]: boolean;
  }>({});
  const [showGifPicker, setShowGifPicker] = useState<{
    [key: string]: boolean;
  }>({});

  // Called when profile settings are saved
  const handleProfileUpdate = (updatedData: UserData) => {
    setProfileData(updatedData);
  };

  // Toggle follow/unfollow state or send follow request for private profiles
  const handleFollowToggle = async () => {
    try {
      const currentUser = await authUtils.CurrentUser();
      if (!currentUser) {
        console.error("No logged in user");
        return;
      }

      const body = {
        follower: currentUser.id,
        following: profileData.id,
      };

      if (followingState) {
        // Unfollow user
        await fetch(`${siteConfig.domain}/api/unfollow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        setProfileData((prev) => ({
          ...prev,
          followersCount: prev.followersCount - 1,
        }));
        setFollowingState(false);
        setFollowRequestStatus("none");
        setMessageDialogOpen(false);
      } else if (followRequestStatus === "pending") {
        // Cancel pending follow request

        console.log("sending cancel request", body);
        await fetch(`${siteConfig.domain}/api/cancel-follow-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        setFollowRequestStatus("none");
        setMessageDialogOpen(false);
      } else {
        // Check if profile is private
        if (profileData.isPrivate) {
          // Send follow request for private profile
          await fetch(`${siteConfig.domain}/api/send-follow-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });

          setFollowRequestStatus("pending");
          setMessageDialogOpen(false);
        } else {
          // Follow public profile instantly
          await fetch(`${siteConfig.domain}/api/follow`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });

          setProfileData((prev) => ({
            ...prev,
            followersCount: prev.followersCount + 1,
          }));
          setFollowingState(true);
          setFollowRequestStatus("accepted");
          setMessageDialogOpen(true);
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  // Like or unlike a post
  // TODO: Call backend to like/unlike post
  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(
        `${siteConfig.domain}/api/like/${postId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await res.json();
      const isLiked = data.liked ?? false;

      // حدّث state
      setPostsState((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked,
                likes: isLiked ? post.likes + 1 : post.likes - 1,
              }
            : post
        )
      );
    } catch (err) {
      console.error("Failed to like post", err);
    }
  };

  // Comment handling functions
  const handleEmojiSelect = (emoji: string, postId: string) => {
    setNewComment((prev) => ({
      ...prev,
      [postId]: (prev[postId] || "") + emoji,
    }));
    // Don't close emoji picker - let user add multiple emojis
  };

  const handleGifSelect = (gifUrl: string, postId: string) => {
    // For comments, we'll treat GIFs as image content that gets submitted
    setNewComment((prev) => ({
      ...prev,
      [postId]: (prev[postId] || "") + `![GIF](${gifUrl})`,
    }));
    setShowGifPicker((prev) => ({
      ...prev,
      [postId]: false,
    }));
  };

  const toggleComments = async (postId: string) => {
    try {
      const res = await fetch(
        `${siteConfig.domain}/api/get-comments/${postId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setPostsState((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                commentsList: data || [],
              }
            : post
        )
      );
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleCommentSubmit = async (
    postId: string,
    parentCommentId?: string
  ) => {
    const commentText = newComment[postId];
    if (!commentText?.trim()) return;

    try {
      const res = await fetch(`${siteConfig.domain}/api/create-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: commentText,
          parentCommentId: parentCommentId || null,
          postId: postId,
        }),
      });

      const data = await res.json();

      console.log(" New comment: ", data);

      // Update the post with new comment
      setPostsState((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments + 1,
                commentsList: post.commentsList
                  ? parentCommentId
                    ? post.commentsList.map((comment) => {
                        if (comment.id === parentCommentId) {
                          return {
                            ...comment,
                            replies: [...(comment.replies || []), data],
                          };
                        }
                        return comment;
                      })
                    : [...post.commentsList, data]
                  : [data],
              }
            : post
        )
      );

      // Clear input
      setNewComment((prev) => ({
        ...prev,
        [postId]: "",
      }));

      // clear reply
      setReplyingTo((prev) => ({
        ...prev,
        [postId]: null,
      }));
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  };

  const handleCommentLike = async (commentId: string, postId: string) => {
    try {
      const res = await fetch(
        `${siteConfig.domain}/api/like-comment/${commentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to like comment");
      const data = await res.json();

      console.log("Comment liked:", data);

      // Update the comment likes in the post
      setPostsState((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId && post.commentsList) {
            return {
              ...post,
              commentsList: updateCommentLikes(
                post.commentsList,
                commentId,
                data.liked
              ),
            };
          }
          return post;
        })
      );
    } catch (err) {
      console.error("Failed to like comment", err);
    }
  };

  const updateCommentLikes = (
    comments: Comment[],
    commentId: string,
    isLiked: boolean
  ): Comment[] => {
    return comments.map((comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked,
          likes: isLiked ? comment.likes + 1 : comment.likes - 1,
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentLikes(comment.replies, commentId, isLiked),
        };
      }
      return comment;
    });
  };

  const handleReply = (postId: string, commentId: string) => {
    setReplyingTo((prev) => ({
      ...prev,
      [postId]: commentId,
    }));
  };

  const renderComment = (comment: Comment, postId: string, isReply = false) => {
    return (
      <div
        key={comment.id}
        className={`${
          isReply ? "ml-8 mt-2" : "mt-4"
        } border-l-2 border-muted pl-4`}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={`${siteConfig.domain}/${comment.author.avatar}`}
              alt={comment.author.name}
            />
            <AvatarFallback className="bg-muted text-foreground text-xs">
              {comment.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-foreground">
                  {comment.author.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground">{comment.content}</p>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCommentLike(comment.id, postId)}
                className={`flex items-center gap-1 h-6 px-2 ${
                  comment.isLiked ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                <Heart
                  className={`h-3 w-3 ${comment.isLiked ? "fill-current" : ""}`}
                />
                <span className="text-xs">{comment.likes}</span>
              </Button>
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReply(postId, comment.id)}
                  className="flex items-center gap-1 h-6 px-2 text-muted-foreground"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
            </div>
            {/* Render replies */}
            {comment.replies &&
              comment.replies.map((reply) =>
                renderComment(reply, postId, true)
              )}
          </div>
        </div>
      </div>
    );
  };

  // Can the current user view posts? (private logic)
  const canViewPosts =
    isOwnProfile ||
    !profileData.isPrivate ||
    followingState ||
    followRequestStatus === "accepted";

  // Get follow button text based on current state
  const getFollowButtonText = () => {
    if (followingState) {
      return "Following";
    }

    if (profileData.isPrivate) {
      switch (followRequestStatus) {
        case "pending":
          return "Cancel Request";
        case "declined":
          return "Request Declined";
        default:
          return "Send Follow Request";
      }
    }

    return "Follow";
  };

  // Get follow button variant based on current state
  const getFollowButtonVariant = () => {
    if (followingState) {
      return "outline" as const;
    }

    if (followRequestStatus === "pending") {
      return "outline" as const;
    }

    if (followRequestStatus === "declined") {
      return "destructive" as const;
    }

    return "default" as const;
  };

  const handleMessage = async () => {
    console.log("Sending message to:", profileData.id);
    try {
      const res = await fetch(
        `${siteConfig.domain}/api/make-message/${profileData.id}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      console.log("Message sent successfully:", data);
      window.location.href = `/messages/${data}`;
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleNavigation = (itemId: string) => {
    // If parent provides navigation handler, use it
    if (onNavigate) {
      onNavigate(itemId);
      console.log("Navigating via parent handler:", itemId);
    } else {
      // Fallback navigation for standalone usage
      console.log("Using fallback navigation:", itemId);
      // This component can be used independently, so provide basic routing
      // Note: You may want to use Next.js router here if this component
      // is used in pages without proper navigation handlers
    }
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("Opening new post dialog");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Main render
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <SidebarNavigation
        activeItem={isOwnProfile ? "profile" : ""}
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      {/* Main content with left margin for sidebar */}
      <main className="flex-1 lg:ml-64">
        {/* Profile Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto p-6 relative">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Settings button (top-right) - only for profile owner */}
              {isOwnProfile && (
                <div className="absolute right-6 top-6">
                  <ProfileSettings
                    userData={profileData}
                    onSave={handleProfileUpdate}
                  />
                </div>
              )}
              {/* Avatar */}
              {/* User avatar (profile picture) */}
              <Avatar className="h-32 w-32 border-4 border-primary/20 flex-shrink-0">
                <AvatarImage
                  src={
                    `${siteConfig.domain}/${profileData.avatar}` ||
                    `${siteConfig.domain}/uploads/default.jpg`
                  }
                  alt={`${profileData.firstName} ${profileData.lastName}`}
                />
                <AvatarFallback className="text-2xl bg-muted text-foreground font-semibold">
                  {profileData.firstName[0]}
                  {profileData.lastName[0]}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              {/* User info, bio, stats, and actions */}
              <div className="flex-1 space-y-4">
                {/* Name and nickname */}
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {profileData.firstName} {profileData.lastName}
                  </h1>
                  {profileData.nickname && (
                    <p className="text-lg text-muted-foreground">
                      @{profileData.nickname}
                    </p>
                  )}
                </div>

                {/* Bio */}
                {/* About me / bio */}
                {profileData.aboutMe && (
                  <p className="text-foreground leading-relaxed max-w-2xl">
                    {profileData.aboutMe}
                  </p>
                )}

                {/* Contact Info */}
                {/* Contact info (email, birthdate) */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {profileData.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(profileData.dateOfBirth).toLocaleDateString()}
                  </div>
                </div>

                {/* Stats */}
                {/* Follower/following stats */}
                <div className="flex gap-6 text-sm">
                  <span className="text-foreground">
                    <strong>{profileData.followersCount}</strong> Followers
                  </span>
                  <span className="text-foreground">
                    <strong>{profileData.followingCount}</strong> Following
                  </span>
                </div>

                {/* Action Buttons (follow/message); settings moved to top-right */}
                {!isOwnProfile && (
                  <div className="flex gap-3">
                    {messageDialogOpen && (
                      <Button
                        variant="default"
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={handleMessage}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                    )}
                    <Button
                      onClick={handleFollowToggle}
                      variant={getFollowButtonVariant()}
                      className="flex items-center gap-2 cursor-pointer"
                      disabled={followRequestStatus === "declined"}
                    >
                      <Users className="h-4 w-4" />
                      {getFollowButtonText()}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section (user's posts or private message) */}
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground border-b border-primary pb-2">
              Posts
            </h2>
          </div>

          {canViewPosts ? (
            <div className="space-y-6">
              {/* List of posts if any */}
              {posts.length > 0 ? (
                postsState.map((post) => (
                  // Single post card
                  <Card key={post.id} className="bg-card border-border">
                    <CardContent className="p-6">
                      {/* Post Header */}
                      {/* Post header: avatar, name, date */}
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={
                              `${siteConfig.domain}/${profileData.avatar}` ||
                              `${siteConfig.domain}/uploads/default.jpg`
                            }
                            alt={`${profileData.firstName} ${profileData.lastName}`}
                          />
                          <AvatarFallback className="bg-muted text-foreground text-sm font-semibold">
                            {profileData.firstName[0]}
                            {profileData.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">
                            {profileData.firstName} {profileData.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Post Content */}
                      {/* Post content and image */}
                      <div className="space-y-4">
                        <p className="text-foreground leading-relaxed">
                          {post.content}
                        </p>

                        {/* Post Image */}
                        {/* Post image if present */}
                        {post.image && (
                          <div className="rounded-lg overflow-hidden">
                            <img
                              src={
                                post.image.startsWith("http")
                                  ? post.image // external URL
                                  : `${siteConfig.domain}/${post.image}` // internal URL
                              }
                              alt="Post content"
                              className="w-full h-auto max-h-96 object-cover"
                            />
                          </div>
                        )}

                        {/* Post Actions */}
                        {/* Post actions: like, comment, share */}
                        <div className="flex items-center gap-6 pt-2 border-t border-border">
                          {/* Like button */}
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className={`flex items-center gap-2 text-sm hover:text-primary transition-colors ${
                              post.isLiked
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                post.isLiked ? "fill-current" : ""
                              }`}
                            />
                            {post.likes}
                          </button>
                          {/* Comment button */}
                          <button
                            onClick={() => toggleComments(post.id)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            {post.comments}
                          </button>
                          {/* Share button */}
                          {/* <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <Share2 className="h-4 w-4" />
                            Share
                          </button> */}
                        </div>

                        {/* Comments Section */}
                        {showComments[post.id] && (
                          <div className="mt-4 pt-4 border-t border-border">
                            {/* Comment Input */}
                            <div className="flex items-center gap-3 mb-4">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`${siteConfig.domain}/${profileData.avatar}`}
                                  alt="You"
                                />
                                <AvatarFallback className="bg-muted text-foreground text-xs">
                                  You
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 flex items-center gap-2">
                                <Input
                                  placeholder={
                                    replyingTo[post.id]
                                      ? "Write a reply..."
                                      : "Write a comment..."
                                  }
                                  value={newComment[post.id] || ""}
                                  onChange={(e) =>
                                    setNewComment((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                      handleCommentSubmit(
                                        post.id,
                                        replyingTo[post.id] || undefined
                                      );
                                    }
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  variant={"outline"}
                                  onClick={() => {
                                    setShowGifPicker((prev) => ({
                                      ...prev,
                                      [post.id]: !prev[post.id],
                                    }));
                                    setShowEmojiPicker((prev) => ({
                                      ...prev,
                                      [post.id]: false,
                                    }));
                                  }}
                                  className="h-8 w-8 p-0 flex items-center justify-center cursor-pointer"
                                >
                                  <ImagePlay className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={"outline"}
                                  onClick={() => {
                                    setShowEmojiPicker((prev) => ({
                                      ...prev,
                                      [post.id]: !prev[post.id],
                                    }));
                                    setShowGifPicker((prev) => ({
                                      ...prev,
                                      [post.id]: false,
                                    }));
                                  }}
                                  className="h-8 w-8 p-0 flex items-center justify-center cursor-pointer"
                                >
                                  <Smile className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleCommentSubmit(
                                      post.id,
                                      replyingTo[post.id] || undefined
                                    )
                                  }
                                  disabled={!newComment[post.id]?.trim()}
                                  className="h-8 w-8 p-0 flex items-center justify-center cursor-pointer"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Emoji & GIF Pickers for this post */}
                            {showEmojiPicker[post.id] && (
                              <div className="mb-4">
                                <EmojiPicker
                                  onEmojiClick={(e) =>
                                    handleEmojiSelect(e.emoji, post.id)
                                  }
                                  theme={Theme.DARK}
                                />
                              </div>
                            )}
                            {showGifPicker[post.id] && (
                              <div className="mb-4">
                                <GifPicker
                                  onGifClick={(g) =>
                                    handleGifSelect(g.url, post.id)
                                  }
                                  tenorApiKey="AIzaSyB78CUkLJjdlA67853bVqpcwjJaywRAlaQ"
                                  categoryHeight={100}
                                  theme={Theme.DARK}
                                />
                              </div>
                            )}

                            {/* Cancel Reply Button */}
                            {replyingTo[post.id] && (
                              <div className="mb-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setReplyingTo((prev) => ({
                                      ...prev,
                                      [post.id]: null,
                                    }))
                                  }
                                  className="text-xs"
                                >
                                  Cancel Reply
                                </Button>
                              </div>
                            )}

                            {/* Comments List */}
                            <div className="space-y-2">
                              {post.commentsList &&
                              post.commentsList.length > 0 ? (
                                post.commentsList.map((comment) =>
                                  renderComment(comment, post.id)
                                )
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No comments yet. Be the first to comment!
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                // No posts fallback
                <Card className="bg-card border-border">
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No posts yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Private profile fallback (locked)
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  This profile is private
                </h3>
                <p className="text-muted-foreground mb-6">
                  {followRequestStatus === "pending"
                    ? `Your follow request to ${profileData.firstName} is pending approval.`
                    : followRequestStatus === "declined"
                    ? `Your follow request to ${profileData.firstName} was declined.`
                    : `Follow ${profileData.firstName} to see their posts and activity.`}
                </p>
                {/* Show follow button if not own profile */}
                {!isOwnProfile && (
                  <div className="flex justify-center">
                    <Button
                      onClick={handleFollowToggle}
                      variant={getFollowButtonVariant()}
                      className="flex items-center gap-2 cursor-pointer"
                      disabled={followRequestStatus === "declined"}
                    >
                      <Users className="h-4 w-4" />
                      {getFollowButtonText()}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export { UserProfile };
export default UserProfile;
