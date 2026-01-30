const sequelize = require('../config/database');
const User = require('./User');
const Ticket = require('./Ticket');
const TicketAction = require('./TicketAction');
const Notification = require('./Notification');
const ActivityLog = require('./ActivityLog');
const CoAssignment = require('./CoAssignment');
const Settings = require('./Settings');
const TechnicianActivity = require('./TechnicianActivity');

// Define associations
User.hasMany(Ticket, { foreignKey: 'assignedTo', as: 'assignedTickets' });
Ticket.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedTechnician' });

User.hasMany(Ticket, { foreignKey: 'reporterId', as: 'reportedTickets' });
Ticket.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

Ticket.hasMany(TicketAction, { foreignKey: 'ticketId', as: 'actions' });
TicketAction.belongsTo(Ticket, { foreignKey: 'ticketId' });

TicketAction.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Ticket.hasMany(Notification, { foreignKey: 'ticketId' });
Notification.belongsTo(Ticket, { foreignKey: 'ticketId' });

Notification.belongsTo(User, { foreignKey: 'userId' });

Ticket.hasMany(CoAssignment, { foreignKey: 'ticketId', as: 'coAssignments' });
CoAssignment.belongsTo(Ticket, { foreignKey: 'ticketId' });
CoAssignment.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });
CoAssignment.belongsTo(User, { foreignKey: 'assignedBy', as: 'assignedByUser' });

User.hasMany(ActivityLog, { foreignKey: 'userId' });
ActivityLog.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(TechnicianActivity, { foreignKey: 'userId', as: 'technicianActivities' });
TechnicianActivity.belongsTo(User, { foreignKey: 'userId', as: 'technician' });

module.exports = {
  sequelize,
  User,
  Ticket,
  TicketAction,
  Notification,
  ActivityLog,
  CoAssignment,
  Settings,
  TechnicianActivity
};

