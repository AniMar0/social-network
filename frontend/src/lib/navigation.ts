/**
 * Navigation utilities for the social network app
 */

import { useRouter } from "next/navigation";

export interface NavigationProps {
  onNavigate?: (itemId: string) => void;
  onUserProfileClick?: (username: string) => void;
}

/**
 * Hook for navigation between routes
 */
export const useAppNavigation = () => {
  const router = useRouter();

  const navigateTo = (route: string) => {
    router.push(route);
  };

  const navigateToProfile = (username: string) => {
    router.push(`/profile/${username}`);
  };

  const navigateToHome = () => {
    router.push("/home");
  };

  const navigateToAuth = () => {
    router.push("/");
  };

  const handleStandardNavigation = (itemId: string) => {
    switch (itemId) {
      case "home":
        navigateToHome();
        break;
      case "profile":
        // Navigate to /profile which will redirect to current user's profile
        navigateTo("/profile");
        break;
      case "auth":
        navigateToAuth();
        break;
      default:
        navigateToHome();
    }
  };

  return {
    navigateTo,
    navigateToProfile,
    navigateToHome,
    navigateToAuth,
    handleStandardNavigation,
  };
};

/**
 * Utility function to get user profile URL
 */
export const getUserProfileUrl = (user: any): string => {
  // TODO: Update this based on your backend user structure
  // If users have a custom URL field, use that, otherwise use nickname or id
  
  // Priority order: profileUrl > nickname > email (before @) > id
  if (user.profileUrl && user.profileUrl.trim()) {
    return user.profileUrl.trim();
  }
  
  if (user.nickname && user.nickname.trim()) {
    return user.nickname.trim();
  }
  
  // Fallback: use email username part (before @)
  if (user.email) {
    const emailUsername = user.email.split('@')[0];
    if (emailUsername && isValidProfileUrl(emailUsername)) {
      return emailUsername;
    }
  }
  
  // Final fallback: use user ID
  return user.id || 'user';
};

/**
 * Utility function to check if a URL is a valid username/profile URL
 */
export const isValidProfileUrl = (url: string): boolean => {
  // Add your validation logic here
  // For now, basic validation - no spaces, special characters, etc.
  return /^[a-zA-Z0-9_-]+$/.test(url);
};

/**
 * Utility function to extract username from current URL
 */
export const extractUsernameFromUrl = (pathname: string): string | null => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1 && isValidProfileUrl(segments[0])) {
    return segments[0];
  }
  return null;
};

/**
 * Authentication utilities
 */
export const authUtils = {
  checkAuth: async () => {
    try {
      const res = await fetch("http://localhost:8080/api/logged", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        return { loggedIn: false, user: null };
      }

      const data = await res.json();
      return { loggedIn: data.loggedIn, user: data.user };
    } catch (err) {
      console.error("Error checking auth:", err);
      return { loggedIn: false, user: null };
    }
  },

  logout: async () => {
    try {
      await fetch("http://localhost:8080/api/logout", {
        method: "POST",
        credentials: "include",
      });
      // Trigger storage event to notify other components
      localStorage.setItem("logout", Date.now().toString());
      localStorage.removeItem("logout");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  },
};

/**
 * User profile utilities
 */
export const profileUtils = {
  // TODO: Add function to fetch user profile by username
  fetchUserProfile: async (username: string) => {
    try {
      // TODO: Replace with actual backend endpoint
      const res = await fetch(`http://localhost:8080/api/profile/${username}`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.user;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  },

  // TODO: Add function to fetch user posts
  fetchUserPosts: async (username: string) => {
    try {
      // TODO: Replace with actual backend endpoint
      const res = await fetch(`http://localhost:8080/api/profile/${username}/posts`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return data.posts || [];
    } catch (err) {
      console.error("Error fetching user posts:", err);
      return [];
    }
  },
};