"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeFeed } from "@/components/home";
import { NewPostModal } from "@/components/newpost";
import { authUtils } from "@/lib/navigation";

// WebSocket singleton (module-level variable)
let ws: WebSocket | null = null;

function initWebSocket(userId: number) {
  if (ws) return ws;

  ws = new WebSocket("ws://localhost:8080/ws");

  ws.onopen = () => console.log("WebSocket connected for user", userId);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("WS message received:", data);
    
  };

  ws.onclose = () => {
    console.log("WebSocket closed for user", userId);
    ws = null;
  };

  return ws;
}

export default function HomePage() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { loggedIn, user } = await authUtils.checkAuth();

        if (loggedIn) {
          setUserId(user.id);
          setUserLoggedIn(true);
          initWebSocket(user.id); // init WS once when user is logged in
        } else {
          router.push("/auth");
        }
      } catch (err) {
        console.error("Error checking auth:", err);
        router.push("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleNewPost = () => setIsNewPostModalOpen(true);

  const handleNavigate = async (itemId: string) => {
    switch (itemId) {
      case "home":
        router.push("/");
        break;
      case "notifications":
        router.push("/notifications");
        break;
      case "profile":
        const user = await authUtils.CurrentUser();
        router.push(`/profile/${user.url}`);
        break;
      case "auth":
        // close WS on logout
        if (ws) {
          ws.close();
          ws = null;
        }
        router.push("/auth");
        break;
      default:
        router.push("/");
    }
  };

  const handlePostSubmit = (postData: any) => {
    console.log("New post submitted:", postData);
    setIsNewPostModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!userLoggedIn) return null; // will redirect

  return (
    <div className="min-h-screen bg-background">
      <HomeFeed onNewPost={handleNewPost} onNavigate={handleNavigate} />

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}
