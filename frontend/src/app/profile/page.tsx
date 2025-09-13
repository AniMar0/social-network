"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authUtils, getUserProfileUrl } from "@/lib/navigation";

export default function ProfileRedirectPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const redirectToUserProfile = async () => {
      try {
        // Check if user is authenticated and get user data
        const { loggedIn, user } = await authUtils.checkAuth();

        if (!loggedIn || !user) {
          // User not logged in, redirect to auth
          router.push("/");
          return;
        }

        console.log("Authenticated user:", user);

        // Get user's profile URL/username
        const profileUrl = getUserProfileUrl(user);
        
        // Redirect to user's dynamic profile page with /profile/ prefix
        router.push(`/profile/${profileUrl}`);
        
      } catch (err) {
        console.error("Error redirecting to profile:", err);
        // If there's an error, redirect to home
        router.push("/home");
      }
    };

    redirectToUserProfile();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div>Redirecting to your profile...</div>
    </div>
  );
}