"use client";

import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth";
import UserProfile from "@/components/user-profile";
import { HomeFeed } from "@/components/home";
import { NewPostModal } from "@/components/newpost";
import { Button } from "@/components/ui/button";

window.addEventListener("storage", function (event) {
  if (event.key === "logout") {
    window.location.reload();
  }
});

let sampleUserData = {
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
};

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
];

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"auth" | "profile" | "home">("auth");
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/logged", {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          const text = await res.text();
          console.log("Error checking login status:", text);
          return;
        }

        const data = await res.json();
        if (data.loggedIn) {
          setCurrentView("home");
          sampleUserData = data.user;
        } else {
          setCurrentView("auth");
        }
      } catch (err) {
        console.error("Error fetching login:", err);
      }
    };

    checkLogin();
  }, []);

  const handleNewPost = () => {
    setIsNewPostModalOpen(true);
  };

  const handleNavigate = (itemId: string) => {
    switch (itemId) {
      case "home":
        setCurrentView("home");
        break;
      case "profile":
        setCurrentView("profile");
        break;
      case "auth":
        setCurrentView("auth");
        break;
      default:
        setCurrentView("home");
    }
  };

  const handlePostSubmit = (postData: any) => {
    console.log("New post submitted:", postData);
    // TODO: Send the post to the backend
    setIsNewPostModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant={currentView === "auth" ? "default" : "outline"}
          onClick={() => setCurrentView("auth")}
        >
          Auth Form
        </Button>
        <Button
          variant={currentView === "home" ? "default" : "outline"}
          onClick={() => setCurrentView("home")}
        >
          Home Feed
        </Button>
        <Button
          variant={currentView === "profile" ? "default" : "outline"}
          onClick={() => setCurrentView("profile")}
        >
          Profile Page
        </Button>
        {currentView === "profile" && (
          <Button
            variant={isOwnProfile ? "secondary" : "outline"}
            onClick={() => setIsOwnProfile(!isOwnProfile)}
          >
            {isOwnProfile ? "Owner View" : "Visitor View"}
          </Button>
        )}
      </div>

      {currentView === "auth" ? (
        <AuthForm />
      ) : currentView === "home" ? (
        <HomeFeed onNewPost={handleNewPost} onNavigate={handleNavigate} />
      ) : (
        <UserProfile
          isOwnProfile={isOwnProfile}
          userData={sampleUserData}
          posts={samplePosts}
          onNewPost={handleNewPost}
          onNavigate={handleNavigate}
        />
      )}

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}
