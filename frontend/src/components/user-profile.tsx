// User Profile Page Component
// Displays user info, posts, and handles follow, like, and profile update actions
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import { authUtils } from "@/lib/navigation";

// Post interface for user posts
export interface Post {
  id: string; // Unique post ID
  content: string; // Post text content
  image?: string; // Optional image URL
  createdAt: string; // ISO date string
  likes: number; // Number of likes
  comments: number; // Number of comments
  isLiked: boolean; // If current user liked this post
}

// Props for UserProfile component
interface UserProfileProps {
  isOwnProfile?: boolean; // Is this the current user's profile?
  isFollowing?: boolean; // Is the current user following this profile?
  userData: UserData; // User profile data
  posts: Post[]; // List of user posts
  onNewPost?: () => void; // Callback to open new post dialog
  onNavigate?: (itemId: string) => void;
}

function UserProfile({
  isOwnProfile = false,
  isFollowing = false,
  userData,
  posts = [],
  onNewPost,
  onNavigate,
}: UserProfileProps) {
  // State for profile data (can be updated by settings dialog)
  const [profileData, setProfileData] = useState(userData);
  // State for following/unfollowing this user
  const [followingState, setFollowingState] = useState(
    userData.isfollowing || isFollowing
  );
  // State for liked posts (IDs)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Called when profile settings are saved
  const handleProfileUpdate = (updatedData: UserData) => {
    setProfileData(updatedData);
    // TODO: Send updated profile data to backend
    console.log("Profile updated:", updatedData);
  };

  // Toggle follow/unfollow state
  // TODO: Call backend to follow/unfollow user
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
        await fetch("http://localhost:8080/api/unfollow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        setProfileData((prev) => ({
          ...prev,
          followersCount: prev.followersCount - 1,
        }));
      } else {
        await fetch("http://localhost:8080/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        setProfileData((prev) => ({
          ...prev,
          followersCount: prev.followersCount + 1,
        }));
      }

      setFollowingState(!followingState);
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  // Like or unlike a post
  // TODO: Call backend to like/unlike post
  const handleLikePost = (postId: string) => {
    const newLikedPosts = new Set(likedPosts);
    if (likedPosts.has(postId)) {
      newLikedPosts.delete(postId);
    } else {
      newLikedPosts.add(postId);
    }
    setLikedPosts(newLikedPosts);
    console.log("Post like toggled:", postId);
  };

  // Can the current user view posts? (private logic)
  const canViewPosts = isOwnProfile || !profileData.isPrivate || followingState;

  const handleNavigation = (itemId: string) => {
    // bubble navigation event to parent if provided
    onNavigate?.(itemId);
    console.log("Navigating to 1:", itemId);
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("Opening new post dialog");
  };

  // Main render
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation - fixed and full height */}
      <aside className="fixed top-0 left-0 h-screen w-64 z-30 border-r border-border bg-card">
        <SidebarNavigation
          activeItem={isOwnProfile ? "profile" : ""}
          onNavigate={handleNavigation}
          onNewPost={handleNewPost}
        />
      </aside>

      {/* Main content with left margin for sidebar */}
      <main className="flex-1 ml-64">
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
                    `http://localhost:8080/${profileData.avatar}` ||
                    "http://localhost:8080/uploads/default.jpg"
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
                    <Button
                      variant="default"
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => console.log(" Message button clicked")}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                    <Button
                      onClick={handleFollowToggle}
                      variant={followingState ? "outline" : "default"}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="h-4 w-4" />
                      {followingState ? "Following" : "Follow"}
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
                posts.map((post) => (
                  // Single post card
                  <Card key={post.id} className="bg-card border-border">
                    <CardContent className="p-6">
                      {/* Post Header */}
                      {/* Post header: avatar, name, date */}
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={
                              `http://localhost:8080/${profileData.avatar}` ||
                              "http://localhost:8080/uploads/default.jpg"
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
                                  : `http://localhost:8080/${post.image}` // internal URL 
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
                              likedPosts.has(post.id)
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                likedPosts.has(post.id) ? "fill-current" : ""
                              }`}
                            />
                            {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                          </button>
                          {/* Comment button */}
                          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <MessageCircle className="h-4 w-4" />
                            {post.comments}
                          </button>
                          {/* Share button */}
                          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <Share2 className="h-4 w-4" />
                            Share
                          </button>
                        </div>
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
                  Follow {profileData.firstName} to see their posts and
                  activity.
                </p>
                {/* Show follow button if not own profile */}
                {!isOwnProfile && (
                  <div className="flex justify-center">
                    <Button
                      onClick={handleFollowToggle}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="h-4 w-4" />
                      Send Follow Request
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
