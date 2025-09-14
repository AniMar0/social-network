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
let notificationUpdateListeners: (() => void)[] = [];

const triggerNotificationUpdate = () => {
  notificationUpdateListeners.forEach(listener => listener());
};

// Mock notifications data (replace with API call later)
let mockNotifications: Notification[] = [
  {
    id: "1",
    type: "like",
    user: { id: "1", name: "John Doe", username: "johndoe", avatar: "https://i.imgur.com/aSlIJks.png" },
    content: "liked your post",
    timestamp: "Sep 3",
    isRead: false,
  },
  {
    id: "2",
    type: "follow",
    user: { id: "2", name: "Sarah Wilson", username: "sarah_w", avatar: "https://i.imgur.com/aSlIJks.png" },
    content: "started following you",
    timestamp: "Aug 30",
    isRead: true,
  },
  {
    id: "3",
    type: "comment",
    user: { id: "3", name: "Mike Chen", username: "mike_c", avatar: "https://i.imgur.com/aSlIJks.png" },
    content: "commented on your post",
    timestamp: "Aug 17",
    isRead: false,
  },
  {
    id: "4",
    type: "follow_request",
    user: { id: "4", name: "Alex Johnson", username: "alex_j", avatar: "https://i.imgur.com/aSlIJks.png" },
    content: "wants to follow you",
    timestamp: "2h",
    isRead: false,
  },
];

const getMockNotifications = (): Notification[] => {
  return [...mockNotifications];
};

// Hook to get unread notification count
export const useNotificationCount = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  const updateCount = useCallback(() => {
    const notifications = getMockNotifications();
    const unreadCount = notifications.filter(n => !n.isRead).length;
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
      notificationUpdateListeners = notificationUpdateListeners.filter(l => l !== updateCount);
      clearInterval(interval);
    };
  }, [updateCount]);

  return notificationCount;
};

// Function to fetch notifications from API (placeholder)
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    // TODO: Replace with actual API call
    // const response = await fetch('/api/notifications', {
    //   credentials: 'include'
    // });
    // if (!response.ok) throw new Error('Failed to fetch notifications');
    // return await response.json();
    
    // For now, return mock data
    return getMockNotifications();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    // TODO: Replace with actual API call
    // await fetch(`/api/notifications/${notificationId}/read`, {
    //   method: 'POST',
    //   credentials: 'include'
    // });
    
    // Update mock data
    const notification = mockNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      triggerNotificationUpdate();
    }
    
    console.log(`Marking notification ${notificationId} as read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Function to delete notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    // TODO: Replace with actual API call
    // await fetch(`/api/notifications/${notificationId}`, {
    //   method: 'DELETE',
    //   credentials: 'include'
    // });
    
    // Update mock data
    mockNotifications = mockNotifications.filter(n => n.id !== notificationId);
    triggerNotificationUpdate();
    
    console.log(`Deleting notification ${notificationId}`);
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};