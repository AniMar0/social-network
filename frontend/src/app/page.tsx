"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { HomeFeed } from "@/components/home";
import { NewPostModal } from "@/components/newpost";
import { authUtils } from "@/lib/navigation";

// WebSocket hook
export function useWebSocket(userId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket("ws://localhost:8080/ws");
    wsRef.current = ws;

    ws.onopen = () => console.log("WebSocket connected");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WS message received:", data);
    };
    ws.onclose = () => console.log("WebSocket closed");

    return () => {
      ws.close(); 
      wsRef.current = null;
    };
  }, [userId]);
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

  // Run WebSocket after user is logged in
  useWebSocket(userId);

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
