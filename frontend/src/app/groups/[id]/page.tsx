"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { GroupsPage } from "@/components/groups";
import { NewPostModal } from "@/components/newpost";
import { authUtils } from "@/lib/navigation";

export default function GroupPage() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  
  const groupId = params.id as string;

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { loggedIn } = await authUtils.checkAuth();

        if (loggedIn) {
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

  const handleNewPost = () => setIsNewPostModalOpen(true);

  const handleNavigate = async (itemId: string) => {
    switch (itemId) {
      case "home":
        router.push("/");
        break;
      case "explore":
        router.push("/explore");
        break;
      case "notifications":
        router.push("/notifications");
        break;
      case "messages":
        router.push("/messages");
        break;
      case "groups":
        router.push("/groups");
        break;
      case "profile":
        const user = await authUtils.CurrentUser();
        router.push(`/profile/${user.url}`);
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

  if (!userLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background">
      <GroupsPage onNewPost={handleNewPost} onNavigate={handleNavigate} />

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}