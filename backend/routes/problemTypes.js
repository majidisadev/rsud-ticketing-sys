const express = require("express");
const { body, validationResult } = require("express-validator");
const { ProblemType, Ticket } = require("../models");
const { authenticate, authorize } = require("../middleware/auth");
const logActivity = require("../middleware/activityLogger");

const router = express.Router();

// GET all problem types (authenticated - for dropdowns and settings page)
router.get(
  "/",
  authenticate,
  logActivity,
  async (req, res) => {
    try {
      const types = await ProblemType.findAll({
        order: [["order", "ASC"], ["name", "ASC"]],
        attributes: ["id", "name", "slug", "order", "createdAt", "updatedAt"]
      });
      res.json(types);
    } catch (error) {
      console.error("List problem types error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST create problem type (admin only)
router.post(
  "/",
  authenticate,
  authorize("admin"),
  logActivity,
  [
    body("name").trim().notEmpty().withMessage("Nama tipe masalah wajib diisi"),
    body("slug").trim().optional(),
    body("order").isInt({ min: 0 }).optional().withMessage("Order harus bilangan bulat non-negatif")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { name, slug, order } = req.body;
      const slugToUse = slug || name.toLowerCase().replace(/\s+/g, "-");
      const problemType = await ProblemType.create({
        name,
        slug: slugToUse,
        order: order != null ? order : 0
      });
      res.status(201).json(problemType);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).json({ message: "Slug atau nama tipe masalah sudah ada" });
      }
      console.error("Create problem type error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PATCH update problem type (admin only)
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  logActivity,
  [
    body("name").trim().notEmpty().optional().withMessage("Nama tidak boleh kosong"),
    body("slug").trim().optional(),
    body("order").isInt({ min: 0 }).optional().withMessage("Order harus bilangan bulat non-negatif")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const problemType = await ProblemType.findByPk(req.params.id);
      if (!problemType) {
        return res.status(404).json({ message: "Tipe masalah tidak ditemukan" });
      }
      const { name, slug, order } = req.body;
      if (name != null) problemType.name = name;
      if (slug != null) problemType.slug = slug;
      if (order != null) problemType.order = order;
      await problemType.save();
      res.json(problemType);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).json({ message: "Slug atau nama tipe masalah sudah ada" });
      }
      console.error("Update problem type error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// DELETE problem type (admin only) - set tickets' problemTypeId to null if in use
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  logActivity,
  async (req, res) => {
    try {
      const problemType = await ProblemType.findByPk(req.params.id);
      if (!problemType) {
        return res.status(404).json({ message: "Tipe masalah tidak ditemukan" });
      }
      const ticketCount = await Ticket.count({ where: { problemTypeId: problemType.id } });
      if (ticketCount > 0) {
        await Ticket.update({ problemTypeId: null }, { where: { problemTypeId: problemType.id } });
      }
      await problemType.destroy();
      res.json({
        message: ticketCount > 0
          ? `Tipe masalah dihapus. ${ticketCount} tiket tidak lagi memiliki tipe masalah.`
          : "Tipe masalah dihapus."
      });
    } catch (error) {
      console.error("Delete problem type error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
