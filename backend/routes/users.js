const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logActivity = require('../middleware/activityLogger');

const router = express.Router();

// Public: Get technicians by category (for public ticket tracking)
router.get('/public/technicians/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!['SIMRS', 'IPSRS'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Map category to role
    const role = category === 'SIMRS' ? 'teknisi_simrs' : 'teknisi_ipsrs';

    const technicians = await User.findAll({
      where: {
        role,
        isActive: true,
        phoneNumber: {
          [Op.ne]: null
        }
      },
      attributes: ['id', 'fullName', 'phoneNumber'],
      order: [['fullName', 'ASC']]
    });

    res.json(technicians);
  } catch (error) {
    console.error('Get public technicians error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), logActivity, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'phoneNumber', 'fullName', 'role', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, authorize('admin'), logActivity, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'phoneNumber', 'fullName', 'role', 'isActive', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', authenticate, authorize('admin'), logActivity, [
  body('username').notEmpty().withMessage('Username required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name required'),
  body('role').isIn(['admin', 'teknisi_simrs', 'teknisi_ipsrs']).withMessage('Invalid role'),
  body('phoneNumber').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, phoneNumber, fullName, role } = req.body;

    // Check if username exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = await User.create({
      username,
      password,
      phoneNumber,
      fullName,
      role
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', authenticate, authorize('admin'), logActivity, [
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('role').optional().isIn(['admin', 'teknisi_simrs', 'teknisi_ipsrs']).withMessage('Invalid role'),
  body('phoneNumber').optional(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { fullName, phoneNumber, role, password, isActive } = req.body;

    if (fullName) user.fullName = fullName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (role) user.role = role;
    if (password) user.password = password;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      id: user.id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get technicians by role
router.get('/technicians/:role', authenticate, logActivity, async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['teknisi_simrs', 'teknisi_ipsrs'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Only same role can see each other, or admin
    if (req.user.role !== 'admin' && req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const technicians = await User.findAll({
      where: {
        role,
        isActive: true
      },
      attributes: ['id', 'username', 'fullName', 'phoneNumber'],
      order: [['fullName', 'ASC']]
    });

    res.json(technicians);
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

