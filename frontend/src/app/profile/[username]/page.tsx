"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import UserProfile from "@/components/user-profile";
import { NewPostModal } from "@/components/newpost";

// Sample data - replace with actual backend data
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

export default function UserProfilePage() {
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [userData, setUserData] = useState(sampleUserData);
  const [posts, setPosts] = useState(samplePosts);
  const [loading, setLoading] = useState(true);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      try {
        // First check if user is logged in
        const authRes = await fetch("/api/logged", {
          method: "POST",
          credentials: "include",
        });

        if (!authRes.ok) {
          // User not logged in, redirect to auth
          console.log("User not logged in - auth check failed");
          router.push("/");
          return;
        }

        const authData = await authRes.json();
        if (!authData.loggedIn) {
          // User not logged in, redirect to auth
          console.log("User not logged in");
          router.push("/");
          return;
        }

        setUserLoggedIn(true);
        setCurrentUser(authData.user);

        // Check if viewing own profile vs another user's profile
        // TODO: ADD YOUR BACKEND LOGIC HERE - Compare username with current user's profile URL/nickname
        // Replace this logic to match how you store usernames/URLs in your database
        const isOwn =
          authData.user.nickname === username || authData.user.url === username;
        setIsOwnProfile(isOwn);

        if (isOwn) {
          // If viewing own profile, use the current user's data
          console.log("user url", authData.user.url);
          try {
            const res = await fetch(
              `http://localhost:8080/api/profile/${authData.user.url}`,
              {
                method: "POST",
                credentials: "include",
              }
            );

            if (!res.ok) {
              return { loggedIn: false, user: null };
            }

            const data = await res.json();
            setUserData(data.user);
            console.log("Using current user's data for profile:", data.user);
            console.log("Fetched posts:", data.posts);
            setPosts(data.posts || []);
          } catch (err) {
            console.error("Error checking auth:", err);
          }
        } else {
          // If viewing another user's profile, fetch their data
          // TODO: ADD YOUR BACKEND LOGIC HERE - Fetch other user's profile data
          // Replace this section with your backend call to get user profile by username
          try {
            const profileRes = await fetch(`/api/profile/${username}`, {
              method: "GET",
              credentials: "include",
            });

            if (!profileRes.ok) {
              // User not found, redirect to 404 or home
              router.push("/home");
              return;
            }

            const profileData = await profileRes.json();
            console.log("Fetched profile data:", profileData);
            setUserData(profileData.user);
            setPosts(profileData.posts || []);
          } catch (profileErr) {
            console.error("Error fetching profile:", profileErr);
            // Fallback to dummy data or redirect
            router.push("/home");
            return;
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        router.push("/home");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      checkAuthAndLoadProfile();
    }
  }, [username, router]);

  const handleNewPost = () => {
    setIsNewPostModalOpen(true);
  };

  const handleNavigate = (itemId: string) => {
    switch (itemId) {
      case "home":
        router.push("/home");
        break;
      case "profile":
        // Navigate to current user's profile
        if (currentUser) {
          // TODO: ADD YOUR BACKEND LOGIC HERE - Get user's profile URL from database
          // Replace this logic to use the actual profile URL field from your database
          const profileUrl =
            currentUser.url ||
            currentUser.nickname ||
            currentUser.email?.split("@")[0] ||
            currentUser.id;
          router.push(`/profile/${profileUrl}`);
        }
        break;
      case "auth":
        // Handle logout
        router.push("/");
        break;
      default:
        router.push("/home");
    }
  };

  const handlePostSubmit = (postData: any) => {
    console.log("New post submitted:", postData);
    // TODO: Send the post to the backend
    setIsNewPostModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading profile...</div>
      </div>
    );
  }

  if (!userLoggedIn) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <UserProfile
        isOwnProfile={isOwnProfile}
        userData={userData}
        posts={posts}
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
