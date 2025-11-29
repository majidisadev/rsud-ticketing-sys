const express = require('express');
const { Op, Sequelize } = require('sequelize');
const { Ticket } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logActivity = require('../middleware/activityLogger');
const moment = require('moment');

const router = express.Router();

// Admin dashboard stats
router.get('/stats', authenticate, authorize('admin'), logActivity, async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();
    const endOfToday = moment().endOf('day').toDate();

    // Count by status
    const statusCounts = await Ticket.findAll({
      where: { isActive: true },
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const statusStats = {
      Baru: 0,
      Diproses: 0,
      Selesai: 0,
      Batal: 0
    };

    statusCounts.forEach(item => {
      statusStats[item.status] = parseInt(item.count);
    });

    // Today's tickets by category
    const todayTickets = await Ticket.findAll({
      where: {
        isActive: true,
        createdAt: {
          [Op.between]: [today, endOfToday]
        }
      },
      attributes: [
        'category',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    const todayStats = {
      SIMRS: 0,
      IPSRS: 0
    };

    todayTickets.forEach(item => {
      todayStats[item.category] = parseInt(item.count);
    });

    res.json({
      statusCounts: statusStats,
      todayByCategory: todayStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Monthly chart data (current month)
router.get('/monthly', authenticate, authorize('admin'), logActivity, async (req, res) => {
  try {
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();

    const tickets = await Ticket.findAll({
      where: {
        isActive: true,
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      },
      attributes: [
        'category',
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['category', Sequelize.fn('DATE', Sequelize.col('createdAt'))],
      raw: true
    });

    // Group by date
    const dateMap = {};
    tickets.forEach(ticket => {
      const date = moment(ticket.date).format('YYYY-MM-DD');
      if (!dateMap[date]) {
        dateMap[date] = { date, SIMRS: 0, IPSRS: 0 };
      }
      dateMap[date][ticket.category] = parseInt(ticket.count);
    });

    // Fill all dates in month
    const result = [];
    const current = moment(startOfMonth);
    const end = moment(endOfMonth);

    while (current.isSameOrBefore(end)) {
      const dateStr = current.format('YYYY-MM-DD');
      result.push(dateMap[dateStr] || { date: dateStr, SIMRS: 0, IPSRS: 0 });
      current.add(1, 'day');
    }

    res.json(result);
  } catch (error) {
    console.error('Monthly chart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Yearly chart data (last 12 months)
router.get('/yearly', authenticate, authorize('admin'), logActivity, async (req, res) => {
  try {
    const startDate = moment().subtract(11, 'months').startOf('month').toDate();
    const endDate = moment().endOf('month').toDate();

    const tickets = await Ticket.findAll({
      where: {
        isActive: true,
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'category',
        [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['category', Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt'))],
      raw: true
    });

    // Group by month
    const monthMap = {};
    tickets.forEach(ticket => {
      const month = moment(ticket.month).format('YYYY-MM');
      const monthName = moment(ticket.month).format('MMM');
      if (!monthMap[month]) {
        monthMap[month] = { month: monthName, SIMRS: 0, IPSRS: 0 };
      }
      monthMap[month][ticket.category] = parseInt(ticket.count);
    });

    // Fill all months
    const result = [];
    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end, 'month')) {
      const monthKey = current.format('YYYY-MM');
      const monthName = current.format('MMM');
      result.push(monthMap[monthKey] || { month: monthName, SIMRS: 0, IPSRS: 0 });
      current.add(1, 'month');
    }

    res.json(result);
  } catch (error) {
    console.error('Yearly chart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

