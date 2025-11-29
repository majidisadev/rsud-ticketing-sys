const { sequelize } = require('../config/database');

const addPhoneNumberColumn = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if column exists
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.phoneNumber) {
      await queryInterface.addColumn('users', 'phoneNumber', {
        type: sequelize.Sequelize.STRING,
        allowNull: true
      });
      console.log('Column phoneNumber added to users table');
    } else {
      console.log('Column phoneNumber already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

if (require.main === module) {
  addPhoneNumberColumn()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addPhoneNumberColumn;

