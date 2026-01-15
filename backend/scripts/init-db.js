const initializeDatabase = require('../db/init');

(async () => {
  try {
    console.log('Starting database initialization...');
    await initializeDatabase();
    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
})();

