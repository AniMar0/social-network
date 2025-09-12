"use client"

import { useState } from "react"
import { AuthForm } from "@/components/auth"
import { UserProfile } from "@/components/user-profile"
import { Button } from "@/components/ui/button"

const sampleUserData = {
  id: "1",
  firstName: "Thomas",
  lastName: "T link",
  nickname: "thomaslink",
  email: "Thomas.tlink@email.com",
  dateOfBirth: "1994-03-01",
  avatar: "https://i.imgur.com/aSlIJks.png",
  aboutMe:
    "I'm Thomas T Link, a curious and motivated individual who enjoys learning, solving problems, and creating meaningful connections. Passionate about growth and new challenges, I strive to bring creativity and integrity into everything I do.",
  isPrivate: false,
  followersCount: 24,
  followingCount: 16,
  postsCount: 12,
  joinedDate: "2023-01-15",
}

const samplePosts = [
  {
    id: "1",
    content:
      "When navigating the social network the user should be able to follow and unfollow other users. Needless to say that to unfollow a user you have to be following him/her. 🔥🔥",
    image: "https://pbs.twimg.com/media/EdYcDByWsAAdokm?format=jpg&name=small",
    createdAt: "2025-12-09",
    likes: 15,
    comments: 3,
    isLiked: false,
  },
  {
    id: "2",
    content:
      "Just finished working on an amazing new project! The intersection of AI and user experience design continues to fascinate me. What are your thoughts on how AI will shape the future of digital interfaces?",
    createdAt: "2025-12-08",
    likes: 28,
    comments: 7,
    isLiked: true,
  },
]

const sampleFollowers = [
  {
    id: "2",
    firstName: "Alex",
    lastName: "Chen",
    nickname: "alexc",
    email: "alex@example.com",
    dateOfBirth: "1992-03-20",
    avatar: "/man-avatar-glasses.png",
    isPrivate: false,
    followersCount: 890,
    followingCount: 234,
    postsCount: 156,
    joinedDate: "2022-08-10",
  },
]

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"auth" | "profile">("profile")
  const [isOwnProfile, setIsOwnProfile] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button variant={currentView === "auth" ? "default" : "outline"} onClick={() => setCurrentView("auth")}>
          Auth Form
        </Button>
        <Button variant={currentView === "profile" ? "default" : "outline"} onClick={() => setCurrentView("profile")}>
          Profile Page
        </Button>
        {currentView === "profile" && (
          <Button variant={isOwnProfile ? "secondary" : "outline"} onClick={() => setIsOwnProfile(!isOwnProfile)}>
            {isOwnProfile ? "Owner View" : "Visitor View"}
          </Button>
        )}
      </div>

      {currentView === "auth" ? (
        <AuthForm />
      ) : (
        <UserProfile
          isOwnProfile={isOwnProfile}
          userData={sampleUserData}
          posts={samplePosts}
        />
      )}
    </div>
  )
}
