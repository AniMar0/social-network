"use client"

import { useState } from "react"
import { SidebarNavigation } from "./sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MessageCircle, Share, MoreHorizontal } from "lucide-react"

interface Post {
    id: string
    author: {
        name: string
        username: string
        avatar: string
        isVerified?: boolean
    }
    content: string
    image?: string
    timestamp: string
    likes: number
    comments: number
    shares: number
    isLiked: boolean
    privacy: "public" | "almost-private" | "private"
}

interface HomeFeedProps {
    onNewPost?: () => void
    onNavigate?: (itemId: string) => void
}

function HomeFeed({ onNewPost, onNavigate }: HomeFeedProps) {
    const [posts, setPosts] = useState<Post[]>([
        {
            id: "1",
            author: {
                name: "Thomas T Link",
                username: "@thomas.tlink",
                avatar: "https://i.imgur.com/aSlIJks.png",
                isVerified: true,
            },
            content:
                "When navigating the social network the user should be able to follow and unfollow other users. Needless to say that to unfollow a user you have to be following him/her. 🔥🔥",
            image: "https://media1.tenor.com/m/rF5ERf7ncqUAAAAC/oh-no-top-gear.gif",
            timestamp: "09.12.2025",
            likes: 24,
            comments: 8,
            shares: 3,
            isLiked: false,
            privacy: "public",
        },
        {
            id: "2",
            author: {
                name: "Sarah Johnson",
                username: "@sarah.j",
                avatar: "https://i.imgur.com/v1oBVXE.png",
            },
            content:
                "Just finished working on a new React component library! The developer experience is so much smoother now. Can't wait to share it with the team tomorrow. 💻✨",
            timestamp: "08.12.2025",
            image: "https://pbs.twimg.com/media/G0rKUx7WEAASmnH?format=jpg&name=small",
            likes: 156,
            comments: 23,
            shares: 12,
            isLiked: true,
            privacy: "public",
        },
        {
            id: "3",
            author: {
                name: "Alex Rivera",
                username: "@alex.dev",
                avatar: "https://i.imgur.com/aSlIJks.png",
            },
            content:
                "Coffee, code, repeat. Working on some exciting new features for our social platform. The future of social networking is looking bright! ☕",
            timestamp: "07.12.2025",
            likes: 89,
            comments: 15,
            shares: 7,
            isLiked: false,
            privacy: "almost-private",
        },
        {
            id: "4",
            author: {
                name: "Maya Chen",
                username: "@maya.design",
                avatar: "https://i.imgur.com/G6ohfGN.png",
                isVerified: true,
            },
            content:
                "Design systems are the backbone of great user experiences. Just published a new article about creating consistent UI patterns across teams. Link in bio! 🎨",
            timestamp: "06.12.2025",
            likes: 203,
            comments: 31,
            shares: 18,
            isLiked: true,
            privacy: "public",
        },
    ])

    const handleLike = (postId: string) => {
        setPosts(
            posts.map((post) =>
                post.id === postId
                    ? {
                        ...post,
                        isLiked: !post.isLiked,
                        likes: post.isLiked ? post.likes - 1 : post.likes + 1,
                    }
                    : post,
            ),
        )
    }

    const handleNewPost = () => {
        onNewPost?.()
        console.log("New Post button clicked from HomeFeed")
    }

    const handleNavigation = (itemId: string) => {
        // bubble up navigation to parent if provided
        onNavigate?.(itemId)
        console.log("Navigating from HomeFeed to:", itemId)
    }

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar Navigation */}
            <aside className="fixed top-0 left-0 h-screen w-64 z-30 border-r border-border bg-card">
                <SidebarNavigation
                    activeItem="home"
                    onNavigate={handleNavigation}
                    onNewPost={handleNewPost}
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
                    {posts.map((post) => (
                        <Card key={post.id} className="border border-border w-full max-w-3xl mx-auto">
                            <CardContent className="p-6">
                                {/* Post Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={post.author.avatar || "http://localhost:8080/uploads/default.jpg"} alt={post.author.name} />
                                            <AvatarFallback className="bg-muted text-foreground">
                                                {post.author.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-foreground">{post.author.name}</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {post.author.username} • {post.timestamp}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Post Content */}
                                <div className="mb-4">
                                    <p className="text-foreground leading-relaxed">{post.content}</p>
                                    {post.image && (
                                        <div className="mt-3 rounded-lg overflow-hidden">
                                            <img
                                                src={post.image || "/placeholder.svg"}
                                                alt="Post content"
                                                className="w-full h-auto object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Privacy Indicator */}
                                <div className="mb-4">
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${post.privacy === "public"
                                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                                : post.privacy === "almost-private"
                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                            }`}
                                    >
                                        {post.privacy === "public"
                                            ? "🌍 Public"
                                            : post.privacy === "almost-private"
                                                ? "👥 Followers"
                                                : "🔒 Private"}
                                    </span>
                                </div>

                                {/* Post Actions */}
                                <div className="flex items-center justify-between pt-4 border-t border-border">
                                    <div className="flex items-center gap-6">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleLike(post.id)}
                                            className={`flex items-center gap-2 ${post.isLiked ? "text-red-500" : "text-muted-foreground"}`}
                                        >
                                            <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
                                            <span>{post.likes}</span>
                                        </Button>
                                        <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground">
                                            <MessageCircle className="h-4 w-4" />
                                            <span>{post.comments}</span>
                                        </Button>
                                        <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground">
                                            <Share className="h-4 w-4" />
                                            <span>{post.shares}</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

        </div>
    )
}

export { HomeFeed }
export default HomeFeed
