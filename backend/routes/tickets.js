const express = require("express");
const { Op } = require("sequelize");
const { body, validationResult } = require("express-validator");
const { Ticket, TicketAction, User, CoAssignment, ProblemType } = require("../models");
const { authenticate, authorize } = require("../middleware/auth");
const logActivity = require("../middleware/activityLogger");
const upload = require("../utils/fileUpload");
const { generateTicketNumber } = require("../utils/ticketNumber");
const {
  notifyNewTicket,
  notifyCoAssignment,
} = require("../utils/notifications");
const path = require("path");

const router = express.Router();

// Public: Create ticket (no auth required)
router.post(
  "/",
  upload.single("photo"),
  [
    body("reporterName").notEmpty().withMessage("Nama pelapor required"),
    body("reporterUnit").notEmpty().withMessage("Unit required"),
    body("reporterPhone").notEmpty().withMessage("Nomor telepon required"),
    body("category")
      .isIn(["SIMRS", "IPSRS"])
      .withMessage("Kategori harus SIMRS atau IPSRS"),
    body("description").notEmpty().withMessage("Deskripsi required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticketNumber = generateTicketNumber();
      const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const ticket = await Ticket.create({
        ticketNumber,
        reporterName: req.body.reporterName,
        reporterUnit: req.body.reporterUnit,
        reporterPhone: req.body.reporterPhone,
        category: req.body.category,
        description: req.body.description,
        photoUrl,
        status: "Baru",
      });

      // Notify technicians
      await notifyNewTicket(ticket);

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Create ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Public: Get ticket by number (for tracking)
router.get("/track/:ticketNumber", async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: { ticketNumber: req.params.ticketNumber, isActive: true },
      include: [
        {
          model: User,
          as: "assignedTechnician",
          attributes: ["id", "fullName", "phoneNumber"],
        },
        {
          model: ProblemType,
          as: "problemType",
          attributes: ["id", "name", "slug"],
        },
        {
          model: CoAssignment,
          as: "coAssignments",
          include: [
            {
              model: User,
              as: "technician",
              attributes: ["id", "fullName", "phoneNumber"],
            },
          ],
        },
        {
          model: TicketAction,
          as: "actions",
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "fullName"],
            },
          ],
          order: [["createdAt", "DESC"]],
        },
      ],
      order: [[{ model: TicketAction, as: "actions" }, "createdAt", "DESC"]],
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

function parseLimit(queryLimit) {
  const n = parseInt(queryLimit, 10);
  return PER_PAGE_OPTIONS.includes(n) ? n : 20;
}

// Get all tickets (with filters and pagination)
router.get("/", authenticate, logActivity, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const where = { isActive: true };
    const search = req.query.search;
    const statusFilter = req.query.status;
    const problemTypeIdFilter = req.query.problemTypeId;
    const categoryFilter = req.query.category;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Role-based category filter
    if (req.user.role === "teknisi_simrs") {
      where.category = "SIMRS";
    } else if (req.user.role === "teknisi_ipsrs") {
      where.category = "IPSRS";
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (problemTypeIdFilter) {
      where.problemTypeId = problemTypeIdFilter;
    }

    if (categoryFilter && req.user.role === "admin") {
      where.category = categoryFilter;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + "T23:59:59");
    }

    if (search) {
      where[Op.or] = [
        { ticketNumber: { [Op.iLike]: `%${search}%` } },
        { reporterName: { [Op.iLike]: `%${search}%` } },
        { reporterUnit: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Prepare includes array
    const includes = [
      {
        model: User,
        as: "assignedTechnician",
        attributes: ["id", "fullName"],
      },
      {
        model: ProblemType,
        as: "problemType",
        attributes: ["id", "name", "slug"],
      },
    ];

    const { count, rows } = await Ticket.findAndCountAll({
      where,
      include: includes,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      tickets: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Get tickets error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get my tasks (assigned to me or co-assigned)
router.get("/my-tasks", authenticate, logActivity, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status;
    const search = req.query.search;

    // Get co-assigned ticket IDs
    const coAssignments = await CoAssignment.findAll({
      where: { technicianId: req.user.id },
      attributes: ["ticketId"],
    });
    const coAssignedTicketIds = coAssignments.map((ca) => ca.ticketId);

    const where = {
      isActive: true,
      [Op.or]: [
        { assignedTo: req.user.id },
        { id: { [Op.in]: coAssignedTicketIds } },
      ],
    };

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (search) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [
            { ticketNumber: { [Op.iLike]: `%${search}%` } },
            { reporterName: { [Op.iLike]: `%${search}%` } },
            { reporterUnit: { [Op.iLike]: `%${search}%` } },
          ],
        },
      ];
    }

    const includes = [
      {
        model: User,
        as: "assignedTechnician",
        attributes: ["id", "fullName"],
      },
      {
        model: ProblemType,
        as: "problemType",
        attributes: ["id", "name", "slug"],
      },
      {
        model: CoAssignment,
        as: "coAssignments",
        include: [
          {
            model: User,
            as: "technician",
            attributes: ["id", "fullName", "username"],
          },
        ],
      },
      {
        model: TicketAction,
        as: "actions",
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "fullName"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 1,
        separate: true,
      },
    ];

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where,
      include: includes,
      order: [["updatedAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      tickets,
      total: count,
      page,
      totalPages: Math.ceil(count / limit) || 1,
    });
  } catch (error) {
    console.error("Get my tasks error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get ticket by ID
router.get("/:id", authenticate, logActivity, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: { id: req.params.id, isActive: true },
      include: [
        {
          model: User,
          as: "assignedTechnician",
          attributes: ["id", "fullName", "username"],
        },
        {
          model: ProblemType,
          as: "problemType",
          attributes: ["id", "name", "slug"],
        },
        {
          model: TicketAction,
          as: "actions",
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "fullName"],
            },
          ],
          order: [["createdAt", "DESC"]],
        },
        {
          model: CoAssignment,
          as: "coAssignments",
          include: [
            {
              model: User,
              as: "technician",
              attributes: ["id", "fullName", "username"],
            },
          ],
        },
      ],
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check access
    // Admin can see all tickets
    // Technicians can see tickets that match their role category (regardless of who took it)
    const hasAccess =
      req.user.role === "admin" ||
      ticket.assignedTo === req.user.id ||
      ticket.coAssignments?.some((ca) => ca.technicianId === req.user.id) ||
      (ticket.status === "Baru" &&
        ((req.user.role === "teknisi_simrs" && ticket.category === "SIMRS") ||
          (req.user.role === "teknisi_ipsrs" &&
            ticket.category === "IPSRS"))) ||
      // Allow technicians to view tickets taken by other technicians with same role
      (req.user.role === "teknisi_simrs" && ticket.category === "SIMRS") ||
      (req.user.role === "teknisi_ipsrs" && ticket.category === "IPSRS");

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Take ticket (assign to self)
router.post(
  "/:id/take",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  logActivity,
  async (req, res) => {
    try {
      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket || !ticket.isActive) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.status !== "Baru") {
        return res.status(400).json({ message: "Ticket already taken" });
      }

      // Check category match
      const roleCategory = {
        teknisi_simrs: "SIMRS",
        teknisi_ipsrs: "IPSRS",
      };

      if (ticket.category !== roleCategory[req.user.role]) {
        return res.status(403).json({ message: "Category mismatch" });
      }

      ticket.assignedTo = req.user.id;
      ticket.status = "Diproses";
      if (ticket.pickedUpAt == null) {
        ticket.pickedUpAt = new Date();
      }
      await ticket.save();

      res.json(ticket);
    } catch (error) {
      console.error("Take ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Co-assign ticket
router.post(
  "/:id/co-assign",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  logActivity,
  async (req, res) => {
    try {
      const { technicianId } = req.body;

      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket || !ticket.isActive) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check if user has access to this ticket
      if (
        ticket.assignedTo !== req.user.id &&
        !(await CoAssignment.findOne({
          where: { ticketId: ticket.id, technicianId: req.user.id },
        }))
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if technician exists and has same role
      const technician = await User.findByPk(technicianId);
      if (
        !technician ||
        technician.role !== req.user.role ||
        !technician.isActive
      ) {
        return res.status(400).json({ message: "Invalid technician" });
      }

      // Check if already co-assigned
      const existing = await CoAssignment.findOne({
        where: { ticketId: ticket.id, technicianId },
      });

      if (existing) {
        return res.status(400).json({ message: "Already co-assigned" });
      }

      await CoAssignment.create({
        ticketId: ticket.id,
        technicianId,
        assignedBy: req.user.id,
      });

      // Notify co-assigned technician
      await notifyCoAssignment(ticket.id, req.user.id, technicianId);

      res.json({ message: "Co-assigned successfully" });
    } catch (error) {
      console.error("Co-assign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update ticket status
router.patch(
  "/:id/status",
  authenticate,
  logActivity,
  [
    body("status")
      .isIn(["Baru", "Diproses", "Selesai", "Batal"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket || !ticket.isActive) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check access - only assigned or co-assigned can update
      const isAssigned = ticket.assignedTo === req.user.id;
      const isCoAssigned = await CoAssignment.findOne({
        where: { ticketId: ticket.id, technicianId: req.user.id },
      });

      if (!isAssigned && !isCoAssigned && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Admin cannot update status
      if (req.user.role === "admin") {
        return res.status(403).json({ message: "Admin cannot update status" });
      }

      ticket.status = req.body.status;
      ticket.lastStatusChangeAt = new Date();
      if (req.body.status === "Selesai") {
        ticket.completedAt = new Date();
      }
      await ticket.save();

      res.json(ticket);
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update problem type (tipe masalah)
router.patch(
  "/:id/problem-type",
  authenticate,
  logActivity,
  [
    body("problemTypeId")
      .optional()
      .isInt({ min: 1 })
      .withMessage("problemTypeId must be a positive integer or omit to clear"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket || !ticket.isActive) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const isAssigned = ticket.assignedTo === req.user.id;
      const isCoAssigned = await CoAssignment.findOne({
        where: { ticketId: ticket.id, technicianId: req.user.id },
      });

      if (!isAssigned && !isCoAssigned && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      if (req.user.role === "admin") {
        return res
          .status(403)
          .json({ message: "Admin cannot update tipe masalah from this endpoint" });
      }

      const problemTypeId = req.body.problemTypeId ? parseInt(req.body.problemTypeId, 10) : null;
      if (problemTypeId != null) {
        const exists = await ProblemType.findByPk(problemTypeId);
        if (!exists) {
          return res.status(400).json({ message: "Tipe masalah tidak ditemukan" });
        }
      }
      ticket.problemTypeId = problemTypeId;
      await ticket.save();

      const updated = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: "assignedTechnician", attributes: ["id", "fullName"] },
          { model: ProblemType, as: "problemType", attributes: ["id", "name", "slug"] },
        ],
      });
      res.json(updated);
    } catch (error) {
      console.error("Update problem type error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Add action
router.post(
  "/:id/actions",
  authenticate,
  logActivity,
  upload.single("photo"),
  [
    body("actionType")
      .isIn(["in-progress", "waiting", "confirmed"])
      .withMessage("Invalid action type"),
    body("description").optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket || !ticket.isActive) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check access
      const isAssigned = ticket.assignedTo === req.user.id;
      const isCoAssigned = await CoAssignment.findOne({
        where: { ticketId: ticket.id, technicianId: req.user.id },
      });

      if (!isAssigned && !isCoAssigned && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      if (req.user.role === "admin") {
        return res.status(403).json({ message: "Admin cannot add actions" });
      }

      const action = await TicketAction.create({
        ticketId: ticket.id,
        actionType: req.body.actionType,
        description: req.body.description,
        createdBy: req.user.id,
      });

      const actionWithUser = await TicketAction.findByPk(action.id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "fullName"],
          },
        ],
      });

      res.status(201).json(actionWithUser);
    } catch (error) {
      console.error("Add action error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Upload proof photo
router.post(
  "/:id/proof",
  authenticate,
  logActivity,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Photo required" });
      }

      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket || !ticket.isActive) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check access
      const isAssigned = ticket.assignedTo === req.user.id;
      const isCoAssigned = await CoAssignment.findOne({
        where: { ticketId: ticket.id, technicianId: req.user.id },
      });

      if (!isAssigned && !isCoAssigned && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      if (req.user.role === "admin") {
        return res.status(403).json({ message: "Admin cannot upload proof" });
      }

      ticket.proofPhotoUrl = `/uploads/${req.file.filename}`;
      await ticket.save();

      res.json(ticket);
    } catch (error) {
      console.error("Upload proof error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Admin: update ticket timestamps (waktu masuk, waktu ambil, waktu terakhir update)
router.patch(
  "/:id/admin",
  authenticate,
  authorize("admin"),
  logActivity,
  [
    body("createdAt").optional().isISO8601().withMessage("createdAt must be valid ISO date"),
    body("pickedUpAt").optional().isISO8601().withMessage("pickedUpAt must be valid ISO date"),
    body("lastStatusChangeAt").optional().isISO8601().withMessage("lastStatusChangeAt must be valid ISO date"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const ticket = await Ticket.findByPk(req.params.id);
      if (!ticket || !ticket.isActive) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const updateFields = [];
      if (req.body.createdAt != null) {
        ticket.changed("createdAt", true);
        ticket.set("createdAt", new Date(req.body.createdAt), { raw: true });
        updateFields.push("createdAt");
      }
      if (req.body.pickedUpAt != null) {
        ticket.pickedUpAt = new Date(req.body.pickedUpAt);
        updateFields.push("pickedUpAt");
      }
      if (req.body.lastStatusChangeAt != null) {
        ticket.lastStatusChangeAt = new Date(req.body.lastStatusChangeAt);
        updateFields.push("lastStatusChangeAt");
      }
      if (updateFields.length > 0) {
        await ticket.save({ silent: true, fields: updateFields });
      }
      const updated = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: "assignedTechnician", attributes: ["id", "fullName"] },
          { model: ProblemType, as: "problemType", attributes: ["id", "name", "slug"] },
        ],
      });
      res.json(updated);
    } catch (error) {
      console.error("Admin update ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Soft delete (admin only)
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  logActivity,
  async (req, res) => {
    try {
      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      ticket.isActive = false;
      await ticket.save();

      res.json({ message: "Ticket deleted" });
    } catch (error) {
      console.error("Delete ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
