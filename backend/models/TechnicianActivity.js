const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TechnicianActivity = sequelize.define('TechnicianActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('diproses', 'selesai', 'batal'),
    defaultValue: 'diproses'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  currentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'technician_activities',
  timestamps: true,
  hooks: {
    beforeCreate: (activity) => {
      // Auto-fill startTime and currentDate on creation
      if (!activity.startTime) {
        activity.startTime = new Date();
      }
      if (!activity.currentDate) {
        activity.currentDate = new Date().toISOString().split('T')[0];
      }
    },
    beforeUpdate: (activity) => {
      // Auto-fill endTime when status changes to 'selesai' or 'batal'
      if (activity.changed('status') && ['selesai', 'batal'].includes(activity.status)) {
        activity.endTime = new Date();
      }
    }
  }
});

module.exports = TechnicianActivity;
