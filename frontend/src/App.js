import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import TrackTicket from './pages/TrackTicket';

// Protected pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import AllTicketsAdmin from './pages/admin/AllTickets';
import AdminTicketDetail from './pages/admin/TicketDetail';

import TechnicianMyTasks from './pages/technician/MyTasks';
import TechnicianAllTasks from './pages/technician/AllTasks';
import TicketDetail from './pages/technician/TicketDetail';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/track/:ticketNumber" element={<TrackTicket />} />
      
      <Route
        path="/admin/*"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Layout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="tickets" element={<AllTicketsAdmin />} />
                <Route path="ticket/:id" element={<AdminTicketDetail />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
      
      <Route
        path="/technician/*"
        element={
          <PrivateRoute allowedRoles={['teknisi_simrs', 'teknisi_ipsrs']}>
            <Layout>
              <Routes>
                <Route path="my-tasks" element={<TechnicianMyTasks />} />
                <Route path="all-tasks" element={<TechnicianAllTasks />} />
                <Route path="ticket/:id" element={<TicketDetail />} />
                <Route path="*" element={<Navigate to="/technician/my-tasks" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Register service worker
    serviceWorkerRegistration.register();
    
    // Request notification permission and setup push subscription
    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Setup push subscription when service worker is ready
      navigator.serviceWorker.ready.then(async (registration) => {
        try {
          const subscription = await registration.pushManager.getSubscription();
          if (!subscription && Notification.permission === 'granted') {
            // Subscribe to push notifications
            const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
            if (vapidPublicKey) {
              const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
              });
              
              // Send subscription to server if user is logged in
              const token = localStorage.getItem('token');
              if (token) {
                try {
                  const api = (await import('./config/api')).default;
                  await api.post('/auth/push-subscription', newSubscription);
                } catch (error) {
                  console.error('Failed to save push subscription:', error);
                }
              }
            }
          }
        } catch (error) {
          console.error('Push subscription error:', error);
        }

        // Listen for push notifications
        registration.addEventListener('push', (event) => {
          const data = event.data ? event.data.json() : {};
          const options = {
            body: data.body || 'Notifikasi baru',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [200, 100, 200],
            data: data.data || {},
            requireInteraction: true
          };

          event.waitUntil(
            registration.showNotification(data.title || 'Notifikasi', options)
          );

          // Play notification sound
          const audio = new Audio('/notification-sound.mp3');
          audio.play().catch(err => console.error('Audio play error:', err));
        });
      });
    }
  }, []);

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
