"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Heart,
  UserPlus,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Check,
  MailOpen,
  Trash,
} from "lucide-react";
import { SidebarNavigation } from "./sidebar";
import {
  useNotificationCount,
  fetchNotifications,
  markNotificationAsRead,
  deleteNotification,
  type Notification,
} from "@/lib/notifications";

interface NotificationsPageProps {
  onNavigate?: (page: string) => void;
  onNewPost?: () => void;
}

function NotificationsPage({ onNewPost, onNavigate }: NotificationsPageProps) {
  // Use shared notification utilities
  const notificationCount = useNotificationCount();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications when component mounts
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const fetchedNotifications = await fetchNotifications();
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    loadNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-pink-500" />;
      case "follow":
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "comment":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "follow_request":
        return <UserPlus className="h-4 w-4 text-yellow-500" />;
      default:
        return <Star className="h-4 w-4 text-purple-500" />;
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleFollowRequest = async (
    notificationId: number,
    action: "accept" | "decline"
  ) => {
    console.log(`Follow request ${action}ed for notification:`, notificationId);
    // TODO: Add backend logic here to handle follow requests
    await fetch(`/api/${action}-follow-request/${notificationId}`, {
      method: "POST",
      credentials: "include",
    });
    // Remove the notification after handling
    handleDelete(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(
        (notif) => !notif.isRead
      );
      await Promise.all(
        unreadNotifications.map((notif) => markNotificationAsRead(notif.id))
      );
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleNewPost = () => {
    onNewPost?.();
    console.log("New post clicked");
  };

  return (
    <div className="flex h-screen bg-background">
      <SidebarNavigation
        activeItem="notifications"
        onNewPost={handleNewPost}
        notificationCount={notificationCount}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="bg-muted hover:bg-primary/70 cursor-pointer"
          >
            <MailOpen className="h-5 w-5" /> Mark all as read
          </Button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-muted/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Notification Icon */}
                    <div className="flex-shrink-0 mt-1 bg-accent p-3 rounded-sm">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* User Avatar */}
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage
                        src={
                          `http://localhost:8080/${notification.user.avatar}` ||
                          "http://localhost:8080/uploads/default.jpg"
                        }
                      />
                      <AvatarFallback className="bg-muted text-foreground">
                        {notification.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-semibold text-foreground">
                              {notification.user.name}
                            </span>{" "}
                            <br />
                            <span className="text-muted-foreground">
                              {notification.content}
                            </span>
                          </p>

                          {/* Follow Request Actions */}
                          {notification.type === "follow_request" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleFollowRequest(notification.id, "accept")
                                }
                                className="bg-primary hover:bg-primary/90 cursor-pointer"
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleFollowRequest(
                                    notification.id,
                                    "decline"
                                  )
                                }
                                className="bg-muted hover:bg-destructive cursor-pointer"
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {notification.timestamp}
                          </span>

                          {!notification.isRead && (
                            <Badge
                              variant="secondary"
                              className="h-2 w-2 p-0 bg-blue-500"
                            />
                          )}

                          {/* Options Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!notification.isRead && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleMarkAsRead(notification.id)
                                  }
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(notification.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { NotificationsPage };
export default NotificationsPage;
