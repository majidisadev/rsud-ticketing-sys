import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const NotificationMenu = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const handleViewTicket = (e, ticketId) => {
    e.stopPropagation(); // Prevent notification click event
    if (!ticketId) return;
    
    setIsOpen(false);
    
    // Navigate based on user role
    if (user?.role === 'admin') {
      navigate(`/admin/ticket/${ticketId}`);
    } else if (user?.role === 'teknisi_simrs' || user?.role === 'teknisi_ipsrs') {
      navigate(`/technician/ticket/${ticketId}`);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 z-50 max-h-[600px] flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Notifikasi</CardTitle>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Tandai semua
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Tidak ada notifikasi</p>
                </div>
              ) : (
                <>
                  {unreadNotifications.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 sticky top-0">
                        Baru
                      </div>
                      {unreadNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors",
                            !notification.isRead && "bg-blue-50"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 break-words">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-gray-400">
                                  {new Date(notification.createdAt).toLocaleString('id-ID')}
                                </p>
                                {notification.ticketId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => handleViewTicket(e, notification.ticketId)}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Lihat Tiket
                                  </Button>
                                )}
                              </div>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {readNotifications.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 sticky top-0">
                        Sudah dibaca
                      </div>
                      {readNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-700">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 break-words">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-gray-400">
                                  {new Date(notification.createdAt).toLocaleString('id-ID')}
                                </p>
                                {notification.ticketId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => handleViewTicket(e, notification.ticketId)}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Lihat Tiket
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default NotificationMenu;
