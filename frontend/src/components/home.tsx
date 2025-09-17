"use client";

import { useState, useEffect } from "react";
import { SidebarNavigation } from "./sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Share, MoreHorizontal } from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";

interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  };
  content: string;
  image?: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  privacy: "public" | "almost-private" | "private";
}

interface HomeFeedProps {
  onNewPost?: () => void;
  onNavigate?: (itemId: string) => void;
}

function HomeFeed({ onNewPost, onNavigate }: HomeFeedProps) {
  // Get notification count for sidebar
  const notificationCount = useNotificationCount();
  const [postsState, setPostsState] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/get-posts", {
          credentials: "include",
        });
        const data = await res.json();
        setPostsState(data.posts || []);
      } catch (err) {
        console.error("Failed to fetch posts", err);
      }
    };

    fetchPosts();
  }, []);

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/like/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await res.json();
      const isLiked = data.liked ?? false;

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

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New Post button clicked from HomeFeed");
  };

  const handleNavigation = (itemId: string) => {
    // bubble up navigation to parent if provided
    onNavigate?.(itemId);
    console.log("Navigating from HomeFeed to:", itemId);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="fixed top-0 left-0 h-screen w-64 z-30 border-r border-border bg-card">
        <SidebarNavigation
          activeItem="home"
          onNavigate={handleNavigation}
          onNewPost={handleNewPost}
          notificationCount={notificationCount}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border p-4 z-10">
          <h2 className="text-xl font-bold text-foreground">Home</h2>
        </div>

        {/* Posts Feed */}
        <div className="p-4 space-y-4">
          {postsState.map((post) => (
            <Card
              key={post.id}
              className="border border-border w-full max-w-3xl mx-auto"
            >
              <CardContent className="p-6">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={
                          `http://localhost:8080/${post.author.avatar}` ||
                          "http://localhost:8080/uploads/default.jpg"
                        }
                        alt={post.author.name}
                      />
                      <AvatarFallback className="bg-muted text-foreground">
                        {post.author.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {post.author.name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {post.author.username} •{" "}
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div className="mb-4">
                  <p className="text-foreground leading-relaxed">
                    {post.content}
                  </p>
                  {post.image && (
                    <div className="mt-3 rounded-lg overflow-hidden">
                      <img
                        src={
                          post.image.startsWith("http")
                            ? post.image // external URL
                            : `http://localhost:8080/${post.image}` // internal URL
                        }
                        alt="Post content"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 ${
                        post.isLiked ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          post.isLiked ? "fill-current" : ""
                        }`}
                      />
                      <span>{post.likes}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.comments}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export { HomeFeed };
export default HomeFeed;
