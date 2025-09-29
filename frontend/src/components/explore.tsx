"use client";

import { useState } from "react";
import { SidebarNavigation } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, UserCheck } from "lucide-react";
import { useNotificationCount } from "@/lib/notifications";

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  isFollowing: boolean;
}

interface ExplorePageProps {
  onNavigate?: (page: string) => void;
  onNewPost?: () => void;
}

const sampleUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    username: "@johndoe",
    avatar: "https://i.imgur.com/aSlIJks.png",
    bio: "Software engineer passionate about building great products",
    followers: 1234,
    following: 567,
    isFollowing: false,
  },
  {
    id: "2",
    name: "Jane Smith",
    username: "@janesmith",
    avatar: "https://i.imgur.com/aSlIJks.png",
    bio: "Designer & creator. Love to make things beautiful ✨",
    followers: 890,
    following: 234,
    isFollowing: true,
  },
  {
    id: "3",
    name: "Alex Johnson",
    username: "@alexj",
    avatar: "https://i.imgur.com/aSlIJks.png",
    bio: "Basketball player 🏀 | Coffee enthusiast ☕",
    followers: 2345,
    following: 123,
    isFollowing: false,
  },
  {
    id: "4",
    name: "Sarah Wilson",
    username: "@sarahw",
    avatar: "https://i.imgur.com/aSlIJks.png",
    bio: "Travel blogger exploring the world 🌎",
    followers: 567,
    following: 789,
    isFollowing: false,
  },
];

export function ExplorePage({ onNavigate, onNewPost }: ExplorePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get notification count for sidebar
  const notificationCount = useNotificationCount();

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      try {
        console.log("Searching for users:", query);
        // TODO: Replace with actual API call
        // const response = await fetch(`${siteConfig.domain}/api/users/search?q=${encodeURIComponent(query)}`);
        // const searchResults = await response.json();
        // setUsers(searchResults);

        // For now, using filtered sample data
        setTimeout(() => {
          setIsSearching(false);
        }, 500);
      } catch (error) {
        console.error("Error searching users:", error);
        setIsSearching(false);
      }
    } else {
      // Reset to all users when search is cleared
      setUsers(sampleUsers);
    }
  };

  const handleFollowToggle = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      console.log(
        user.isFollowing ? "Unfollowing user:" : "Following user:",
        userId
      );
      // TODO: Replace with actual API call
      // const response = await fetch(`${siteConfig.domain}/api/users/${userId}/follow`, {
      //     method: user.isFollowing ? 'DELETE' : 'POST',
      //     headers: {
      //         'Content-Type': 'application/json',
      //     }
      // });
      //
      // if (!response.ok) {
      //     throw new Error('Failed to update follow status');
      // }

      // Update local state immediately for instant feedback
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                isFollowing: !u.isFollowing,
                followers: u.isFollowing ? u.followers - 1 : u.followers + 1,
              }
            : u
        )
      );
    } catch (error) {
      console.error("Error updating follow status:", error);
    }
  };

  const handleUserClick = (user: User) => {
    console.log("Navigating to user profile:", user.username);
    // TODO: Navigate to user profile
    // onNavigate?.(`/profile/${user.username}`);
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New post clicked");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation
        activeItem="explore"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
      />

      <div className="flex-1 lg:ml-64 min-w-0">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="p-6 border-b border-border bg-card">
            <h1 className="text-2xl font-bold text-foreground mb-4 lg:ml-0 ml-12">
              Explore
            </h1>

            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-muted/50"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {searchQuery && filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No users found
                </h3>
                <p className="text-muted-foreground">
                  Try searching for a different name or username
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleUserClick(user)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-4">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-muted text-foreground text-lg">
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex items-center gap-1 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {user.name}
                        </h3>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {user.username}
                      </p>

                      <p className="text-sm text-foreground mb-4 line-clamp-2">
                        {user.bio}
                      </p>

                      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                        <span>
                          <strong className="text-foreground">
                            {user.followers.toLocaleString()}
                          </strong>{" "}
                          followers
                        </span>
                        <span>
                          <strong className="text-foreground">
                            {user.following.toLocaleString()}
                          </strong>{" "}
                          following
                        </span>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowToggle(user.id);
                        }}
                        variant={user.isFollowing ? "outline" : "default"}
                        size="sm"
                        className="w-full"
                      >
                        {user.isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExplorePage;
