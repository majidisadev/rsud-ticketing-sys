const { sequelize, User } = require('../models');

const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized.');

    // Create default admin user if not exists
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: 'admin123',
        fullName: 'Administrator',
        role: 'admin',
        email: 'admin@rsud.local'
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

