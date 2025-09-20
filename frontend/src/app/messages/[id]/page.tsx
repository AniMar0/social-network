"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MessagesPage from "@/components/messages";
import { NewPostModal } from "@/components/newpost";

function Messages() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const params = useParams();

  const resiverID = params.id as string;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/logged", {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          router.push("/");
          return;
        }

        const data = await res.json();
        if (!data.loggedIn) {
          router.push("/auth");
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

  const setSeenChat = (chatId: string) => {
    fetch(`/api/set-seen-chat/${chatId}`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to set seen chat");
      })
      .then(() => {
        console.log("Chat seen");
      })
      .catch((err) => console.error(err));
  };
  setSeenChat(resiverID);

  if (!userLoggedIn) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <MessagesPage onUserProfileClick={resiverID} onNewPost={handleNewPost} />

      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onPost={handlePostSubmit}
      />
    </div>
  );
}

export { Messages };
export default Messages;
