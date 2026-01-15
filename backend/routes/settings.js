const express = require("express");
const { Settings, sequelize } = require("../models");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Helper function to ensure Settings table exists
const ensureSettingsTable = async () => {
  try {
    await Settings.findOne({ limit: 1 });
  } catch (error) {
    const errorMessage = error.message || "";
    const errorName = error.name || "";

    // Check for PostgreSQL table doesn't exist errors
    if (
      errorName === "SequelizeDatabaseError" ||
      errorMessage.toLowerCase().includes("does not exist") ||
      (errorMessage.toLowerCase().includes("relation") &&
        errorMessage.toLowerCase().includes("does not exist")) ||
      (errorMessage.toLowerCase().includes("table") &&
        errorMessage.toLowerCase().includes("does not exist"))
    ) {
      console.log("Settings table does not exist, creating it...");
      try {
        await sequelize.sync({ alter: true });
        console.log("Settings table created successfully.");
      } catch (syncError) {
        console.error("Error syncing database:", syncError);
        throw syncError;
      }
    } else {
      throw error;
    }
  }
};

// Get settings (public endpoint for IPSRS enabled status)
router.get("/public/ipsrs-enabled", async (req, res) => {
  try {
    await ensureSettingsTable();

    const setting = await Settings.findOne({
      where: { key: "ipsrs_enabled" },
    });

    // Default to false if setting doesn't exist
    const isEnabled = setting ? setting.value === "true" : false;

    res.json({ ipsrsEnabled: isEnabled });
  } catch (error) {
    console.error("Error fetching IPSRS setting:", error);
    res.status(500).json({
      message: "Error fetching setting",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get all settings (admin only)
router.get("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    await ensureSettingsTable();

    const settings = await Settings.findAll();
    const settingsObj = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({
      message: "Error fetching settings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Update setting (admin only)
router.put("/:key", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ message: "Value is required" });
    }

    await ensureSettingsTable();

    const [setting, created] = await Settings.upsert(
      {
        key,
        value: String(value),
      },
      {
        returning: true,
      }
    );

    res.json({
      key: setting.key,
      value: setting.value,
      message: created ? "Setting created" : "Setting updated",
    });
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({
      message: "Error updating setting",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
