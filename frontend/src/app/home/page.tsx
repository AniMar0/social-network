"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeFeed } from "@/components/home";
import { NewPostModal } from "@/components/newpost";
import { authUtils } from "@/lib/navigation";

export default function HomePageRoute() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/logged", {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          // User not logged in, redirect to auth
          router.push("/");
          return;
        }

        const data = await res.json();
        if (!data.loggedIn) {
          // User not logged in, redirect to auth
          router.push("/");
          return;
        }

        setUserLoggedIn(true);
      } catch (err) {
        console.error("Error checking auth:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleNewPost = () => {
    setIsNewPostModalOpen(true);
  };

  const handleNavigate = async (itemId: string) => {
    switch (itemId) {
      case "home":
        router.push("/home");
        break;
      case "profile":
        // Navigate to /profile which will redirect to current user's profile
        // TODO: ADD YOUR BACKEND LOGIC HERE - Get user's profile URL from database
        const user = await authUtils.CurrentUser();
        handleUserProfileClick(user.url);
        break;
      case "auth":
        // Handle logout
        router.push("/");
        break;
      default:
        router.push("/home");
    }
  };

  const handleUserProfileClick = (url: string) => {
    // Navigate to user profile using their username/url
    router.push(`/profile/${url}`);
  };

  const handlePostSubmit = (postData: any) => {
    console.log("New post submitted:", postData);
    // TODO: Send the post to the backend
    setIsNewPostModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!userLoggedIn) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeFeed 
        onNewPost={handleNewPost} 
        onNavigate={handleNavigate}
      />

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}