"use client";

import { useState, useEffect, useRef } from "react";
import { SidebarNavigation } from "./sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Send,
  ImagePlay,
  Smile,
} from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";
import EmojiPicker, { Theme } from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import { getWebSocket } from "@/lib/websocket";
import { ca } from "date-fns/locale";
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

interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  image?: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  privacy: "public" | "almost-private" | "private";
  commentsList?: Comment[];
}

interface HomeFeedProps {
  onNewPost?: () => void;
  onNavigate?: (itemId: string) => void;
}

function HomeFeed({ onNewPost, onNavigate }: HomeFeedProps) {
  // Get notification count for sidebar
  const notificationCount = useNotificationCount();
  const [postsState, setPostsState] = useState<Post[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const wsRef = useRef<WebSocket | null>(null);

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
  }, []);

  const handleWsEvent = (data: any) => {
    switch (data.channel) {
      case "new-post":
        setPostsState((prevPosts) => [data.payload.post, ...prevPosts]);
        break;
      default:
        break;
    }
  };

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
      const res = await fetch(`/api/get-comments/${postId}`, {
        method: "POST",
        credentials: "include",
      });
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
    } catch (err) {}
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
      const res = await fetch(`/api/create-comment`, {
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
      
      // Update the post with new comment
      setPostsState((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments + 1,
                commentsList: post.commentsList
                  ? [data, ...post.commentsList]
                  : [data],
              }
            : post
        )
      );

      // Clear the comment input
      setNewComment((prev) => ({
        ...prev,
        [postId]: "",
      }));

      // Clear reply state
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
        `http://localhost:8080/api/like-comment/${commentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await res.json();

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

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New Post button clicked from HomeFeed");
  };

  const handleNavigation = (itemId: string) => {
    // bubble up navigation to parent if provided
    onNavigate?.(itemId);
    console.log("Navigating from HomeFeed to:", itemId);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
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
              src={`http://localhost:8080/${comment.author.avatar}`}
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <SidebarNavigation
        activeItem="home"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-w-0">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border p-4 z-10">
            <h2 className="text-xl font-bold text-foreground lg:ml-0 ml-12">
              Home
            </h2>
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
                          {new Date(post.createdAt).toLocaleString()}
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
                          className="w-full h-full object-cover"
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
                        className={`flex items-center gap-2 cursor-pointer ${
                          post.isLiked
                            ? "text-red-500"
                            : "text-muted-foreground"
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
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-2 text-muted-foreground cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {showComments[post.id] && (
                    <div className="mt-4 pt-4 border-t border-border">
                      {/* Comment Input */}
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`http://localhost:8080/${post.author.avatar}`}
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
                            onGifClick={(g) => handleGifSelect(g.url, post.id)}
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
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setReplyingTo((prev) => ({
                                ...prev,
                                [post.id]: null,
                              }))
                            }
                            className="text-xs text-muted-foreground"
                          >
                            Cancel Reply
                          </Button>
                        </div>
                      )}

                      {/* Comments List */}
                      <div className="space-y-2">
                        {post.commentsList &&
                          post.commentsList.map((comment) =>
                            renderComment(comment, post.id)
                          )}
                        {(!post.commentsList ||
                          post.commentsList.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No comments yet. Be the first to comment!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { HomeFeed };
export default HomeFeed;
