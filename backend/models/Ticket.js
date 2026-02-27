const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticketNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  reporterName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reporterUnit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reporterPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('SIMRS', 'IPSRS'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Baru', 'Diproses', 'Selesai', 'Batal'),
    defaultValue: 'Baru'
  },
  priority: {
    type: DataTypes.ENUM('tinggi', 'sedang', 'rendah'),
    allowNull: true
  },
  problemTypeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'problem_types',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reporterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  proofPhotoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pickedUpAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastStatusChangeAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tickets',
  timestamps: true
});

module.exports = Ticket;

