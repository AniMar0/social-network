"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  Bell,
  MessageSquare,
  Users,
  User,
  Plus,
  LogOut,
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  isActive?: boolean;
}

interface SidebarNavigationProps {
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
  onNewPost?: () => void;
}

function SidebarNavigation({
  activeItem = "home",
  onNavigate,
  onNewPost,
}: SidebarNavigationProps) {
  const [currentActive, setCurrentActive] = useState(activeItem);

  const navigationItems: NavigationItem[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "explore", label: "Explore", icon: Search },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "groups", label: "Groups", icon: Users },
    { id: "profile", label: "Profile", icon: User },
  ];

  const handleItemClick = (itemId: string) => {
    if (currentActive === itemId) return;
    if (itemId === "profile"){
      // Navigate to /profile${user.url}
      
    }
    setCurrentActive(itemId);
    onNavigate?.(itemId);
    console.log("Navigation item clicked:", itemId);
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New Post button clicked");
  };

  const handleLogout = (event: React.MouseEvent) => {
    event.preventDefault();
    fetch("/api/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status != 200 && res.status != 401 && res.status != 201) {
          // Handle unexpected status codes
        }
        if (!res.ok) throw new Error("logout failed");
        return res.text();
      })
      .then(() => {
        localStorage.setItem("logout", Date.now().toString());
        window.location.reload();
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground pb-2">
          {" "}
          Social Network
        </h1>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentActive === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* logout Button */}
      <div className="p-4">
        <Button
          onClick={handleLogout}
          className="w-full bg-destructive hover:bg-destructive/90 hover:text-white text-destructive-foreground font-medium cursor-pointer"
          size="lg"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* New Post Button */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleNewPost}
          className="w-full bg-primary hover:bg-primary/90 hover:text-white text-primary-foreground font-medium cursor-pointer"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>
    </div>
  );
}

export { SidebarNavigation };
export default SidebarNavigation;
