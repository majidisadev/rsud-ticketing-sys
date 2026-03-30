const { sequelize, User, Ticket, ProblemType } = require("../models");
const { Op, DataTypes } = require("sequelize");

const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log("Database connection established.");

    // Sync models
    await sequelize.sync({ alter: true });
    console.log("Database models synchronized.");

    // Ensure technician_activities.proofPhotoUrl exists (sync alter can skip new columns in some PG setups)
    try {
      const qi = sequelize.getQueryInterface();
      const desc = await qi.describeTable("technician_activities");
      if (!desc.proofPhotoUrl && !desc.proofphotourl) {
        await qi.addColumn("technician_activities", "proofPhotoUrl", {
          type: DataTypes.STRING,
          allowNull: true,
        });
        console.log("Added column proofPhotoUrl to technician_activities.");
      }
    } catch (migrationErr) {
      console.warn(
        "technician_activities proofPhotoUrl migration:",
        migrationErr.message,
      );
    }

    // Backfill problemTypeId from priority for existing tickets
    const ticketsWithPriority = await Ticket.findAll({
      where: { priority: { [Op.ne]: null } },
      attributes: ["id", "priority"],
    });
    for (const ticket of ticketsWithPriority) {
      const pt = await ProblemType.findOne({
        where: { slug: ticket.priority },
      });
      if (pt) {
        await ticket.update({ problemTypeId: pt.id });
      }
    }
    if (ticketsWithPriority.length > 0) {
      console.log(
        `Backfilled problemTypeId for ${ticketsWithPriority.length} ticket(s).`,
      );
    }

    // Create default admin user if not exists
    const adminExists = await User.findOne({ where: { username: "admin" } });
    if (!adminExists) {
      await User.create({
        username: "admin",
        password: "admin123",
        fullName: "Administrator",
        role: "admin",
      });
      console.log(
        "Default admin user created (username: admin, password: admin123)",
      );
    }

    console.log("Database initialization complete.");
    return true;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error; // Throw error instead of process.exit
  }
};

module.exports = initializeDatabase;
