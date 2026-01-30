import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../config/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const playedNotificationIds = useRef(new Set());
  const audioRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.error('Error playing notification sound:', err);
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    let isInitialLoad = true;
    let previousNotificationIds = new Set();

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        const newNotifications = res.data;
        
        // On initial load, just set the notifications without playing sound
        if (isInitialLoad) {
          setNotifications(newNotifications);
          const unread = newNotifications.filter(n => !n.isRead).length;
          setUnreadCount(unread);
          // Store IDs of notifications that existed on initial load
          previousNotificationIds = new Set(newNotifications.map(n => n.id));
          isInitialLoad = false;
          return;
        }

        // Find new unread notifications that weren't in previous fetch
        const currentNotificationIds = new Set(newNotifications.map(n => n.id));
        const newUnreadNotifications = newNotifications.filter(
          n => !n.isRead && !previousNotificationIds.has(n.id)
        );

        // Play sound only for truly new notifications that haven't been played
        newUnreadNotifications.forEach(notification => {
          if (!playedNotificationIds.current.has(notification.id)) {
            playNotificationSound();
            playedNotificationIds.current.add(notification.id);
          }
        });

        setNotifications(newNotifications);
        const unread = newNotifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
        previousNotificationIds = currentNotificationIds;
      } catch (error) {
        console.error('Fetch notifications error:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

