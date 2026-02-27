const { sequelize, User, Ticket, ProblemType } = require('../models');
const { Op } = require('sequelize');

const DEFAULT_PROBLEM_TYPES = [
  { name: 'Tinggi', slug: 'tinggi', order: 1 },
  { name: 'Sedang', slug: 'sedang', order: 2 },
  { name: 'Rendah', slug: 'rendah', order: 3 }
];

const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized.');

    // Create default problem types if none exist
    const problemTypeCount = await ProblemType.count();
    if (problemTypeCount === 0) {
      await ProblemType.bulkCreate(DEFAULT_PROBLEM_TYPES);
      console.log('Default problem types created (Tinggi, Sedang, Rendah).');
    }

    // Backfill problemTypeId from priority for existing tickets
    const ticketsWithPriority = await Ticket.findAll({
      where: { priority: { [Op.ne]: null } },
      attributes: ['id', 'priority']
    });
    for (const ticket of ticketsWithPriority) {
      const pt = await ProblemType.findOne({ where: { slug: ticket.priority } });
      if (pt) {
        await ticket.update({ problemTypeId: pt.id });
      }
    }
    if (ticketsWithPriority.length > 0) {
      console.log(`Backfilled problemTypeId for ${ticketsWithPriority.length} ticket(s).`);
    }

    // Create default admin user if not exists
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: 'admin123',
        fullName: 'Administrator',
        role: 'admin'
      });
      console.log('Default admin user created (username: admin, password: admin123)');
    }

    console.log('Database initialization complete.');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error; // Throw error instead of process.exit
  }
};

module.exports = initializeDatabase;

