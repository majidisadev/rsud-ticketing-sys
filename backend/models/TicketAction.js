const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketAction = sequelize.define('TicketAction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tickets',
      key: 'id'
    }
  },
  actionType: {
    type: DataTypes.ENUM('in-progress', 'waiting', 'confirmed'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'ticket_actions',
  timestamps: true
});

module.exports = TicketAction;

