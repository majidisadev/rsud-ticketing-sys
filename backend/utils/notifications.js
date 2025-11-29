const webpush = require('web-push');
const { Notification, User } = require('../models');

// Initialize web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@rsud.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const sendNotification = async (userId, ticketId, title, message, type) => {
  try {
    // Save notification to database
    const notification = await Notification.create({
      userId,
      ticketId,
      title,
      message,
      type,
      isRead: false
    });

    // Get user's push subscription
    const user = await User.findByPk(userId);
    if (user && user.pushSubscription) {
      try {
        await webpush.sendNotification(
          user.pushSubscription,
          JSON.stringify({
            title,
            body: message,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
              ticketId,
              notificationId: notification.id,
              type
            },
            requireInteraction: true,
            vibrate: [200, 100, 200],
            sound: '/notification-sound.mp3'
          })
        );
      } catch (error) {
        console.error('Push notification error:', error);
        // If subscription is invalid, remove it
        if (error.statusCode === 410) {
          await user.update({ pushSubscription: null });
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error);
    throw error;
  }
};

const notifyNewTicket = async (ticket) => {
  // Find all technicians with matching role
  const roleMap = {
    'SIMRS': 'teknisi_simrs',
    'IPSRS': 'teknisi_ipsrs'
  };

  const technicians = await User.findAll({
    where: {
      role: roleMap[ticket.category],
      isActive: true
    }
  });

  const promises = technicians.map(tech =>
    sendNotification(
      tech.id,
      ticket.id,
      'Tiket Baru',
      `Tiket baru ${ticket.ticketNumber} - ${ticket.category}`,
      'new_ticket'
    )
  );

  await Promise.all(promises);
};

const notifyCoAssignment = async (ticketId, assignedToId, coAssignedToId) => {
  // Get ticket to retrieve ticketNumber
  const { Ticket } = require('../models');
  const ticket = await Ticket.findByPk(ticketId);
  
  if (!ticket) {
    console.error('Ticket not found for co-assignment notification');
    return;
  }

  await sendNotification(
    coAssignedToId,
    ticketId,
    'Co-Assignment',
    `Anda di-assign sebagai teknisi bantuan untuk tiket ${ticket.ticketNumber}`,
    'co_assigned'
  );
};

module.exports = {
  sendNotification,
  notifyNewTicket,
  notifyCoAssignment
};

