"use client";

import Link from "next/link";
import type React from "react";
import { authUtils } from "@/lib/navigation";
import { closeWebSocket } from "@/lib/websocket";

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
}

interface SidebarNavigationProps {
  activeItem?: string;
  onNewPost?: () => void;
  notificationCount?: number;
}

function SidebarNavigation({
  activeItem,
  onNewPost,
  notificationCount = 0,
}: SidebarNavigationProps) {
  const [currentActive] = useState(activeItem);

  const navigationItems: NavigationItem[] = [
    { id: "home", label: "Home", icon: Home, href: "/" },
    { id: "explore", label: "Explore", icon: Search, href: "/explore" },
    { id: "notifications", label: "Notifications", icon: Bell, href: "/notifications" },
    { id: "messages", label: "Messages", icon: MessageSquare, href: "/messages" },
    { id: "groups", label: "Groups", icon: Users, href: "/groups" },
    { id: "profile", label: "Profile", icon: User, href: "/profile" }, // غادي نبدلها تحت
  ];

  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault();
    await fetch("/api/logout", { method: "POST" });
    closeWebSocket();
    localStorage.setItem("logout", Date.now().toString());
    window.location.href = "/auth"; // نقدر نستعمل replace هنا
  };

  const handleNewPost = () => {
    onNewPost?.();
  };

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground pb-2">Social Network</h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentActive === item.id;

            // special case for profile (بما أنو عندك url خاص بالمستخدم)
            if (item.id === "profile") {
              return (
                <li key={item.id}>
                  <button
                    onClick={async () => {
                      const user = await authUtils.CurrentUser();
                      window.location.href = `/profile/${user.url}`;
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors relative ${
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
            }

            return (
              <li key={item.id}>
                <Link
                  href={item.href || "/"}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {item.id === "notifications" && notificationCount > 0 && (
                    <span className="ml-auto bg-primary/90 text-white text-xs rounded-sm h-5 w-5 flex items-center justify-center">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

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
