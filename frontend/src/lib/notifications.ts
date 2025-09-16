// Utility functions for managing notifications
"use client";

import { useState, useEffect, useCallback } from "react";

export interface Notification {
  id: string;
  type: "like" | "follow" | "comment" | "mention" | "follow_request";
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  content?: string;
  timestamp: string;
  isRead: boolean;
  actionData?: {
    postId?: string;
    commentId?: string;
  };
}

// Global state for notification updates
export let notificationUpdateListeners: (() => void)[] = [];

export const triggerNotificationUpdate = () => {
  notificationUpdateListeners.forEach((listener) => listener());
};
// Hook to get unread notification count
export const useNotificationCount = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  const updateCount = useCallback(async () => {
    const notifications = await fetchNotifications();
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    setNotificationCount(unreadCount);
  }, []);

  useEffect(() => {
    updateCount();

    // Register for updates
    notificationUpdateListeners.push(updateCount);

    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(updateCount, 30000);

    return () => {
      // Cleanup listener
      notificationUpdateListeners = notificationUpdateListeners.filter(
        (l) => l !== updateCount
      );
      clearInterval(interval);
    };
  }, [updateCount]);

  return notificationCount;
};
// Function to fetch notifications from API (placeholder)
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    // TODO: Replace with actual API call
    const response = await fetch("/api/notifications", {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch notifications");
    const data = await response.json();
    console.log("Fetched notifications", data);

    if (!data) return [];
    return data;

    // For now, return mock data
    //return getMockNotifications();
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  try {
    // TODO: Replace with actual API call
    await fetch(`/api/mark-notification-as-read/${notificationId}`, {
      method: "POST",
      credentials: "include",
    });

    // Update mock data
    triggerNotificationUpdate();

    console.log(`Marking notification ${notificationId} as read`);
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

// Function to delete notification
export const deleteNotification = async (
  notificationId: string
): Promise<void> => {
  try {
    // TODO: Replace with actual API call
    await fetch(`/api/delete-notification/${notificationId}`, {
      method: "POST",
      credentials: "include",
    });

    // Update mock data
    triggerNotificationUpdate();

    console.log(`Deleting notification ${notificationId}`);
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};
