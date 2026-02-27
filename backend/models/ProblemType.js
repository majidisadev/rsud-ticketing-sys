const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProblemType = sequelize.define('ProblemType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'problem_types',
  timestamps: true
});

module.exports = ProblemType;
