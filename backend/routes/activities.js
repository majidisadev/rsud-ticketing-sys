const express = require("express");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { body, validationResult } = require("express-validator");
const upload = require("../utils/fileUpload");
const {
  TechnicianActivity,
  User,
  Ticket,
  CoAssignment,
  ProblemType,
} = require("../models");
const { authenticate, authorize } = require("../middleware/auth");
const logActivity = require("../middleware/activityLogger");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const moment = require("moment");
const {
  drawLetterhead,
  addVerificationSection,
} = require("../utils/pdfHelpers");

const router = express.Router();

function unlinkProofFile(proofPhotoUrl) {
  if (!proofPhotoUrl || typeof proofPhotoUrl !== "string") return;
  if (!proofPhotoUrl.startsWith("/uploads/")) return;
  const safeName = path.basename(proofPhotoUrl);
  if (!safeName || safeName.includes("..")) return;
  const filePath = path.join(__dirname, "../uploads", safeName);
  fs.unlink(filePath, () => {});
}

// Shared: build report data for technician (activities + my tasks) with filters
async function getReportDataForTechnician(userId, filters) {
  const { status, dateFrom, dateTo, search, problemTypeId } = filters;

  const activityWhere = { userId };
  if (status) activityWhere.status = status;
  if (dateFrom || dateTo) {
    activityWhere.currentDate = {};
    if (dateFrom) activityWhere.currentDate[Op.gte] = dateFrom;
    if (dateTo) activityWhere.currentDate[Op.lte] = dateTo;
  }
  if (search) activityWhere.title = { [Op.iLike]: `%${search}%` };
  if (problemTypeId) activityWhere.problemTypeId = problemTypeId;

  const activities = await TechnicianActivity.findAll({
    where: activityWhere,
    include: [
      {
        model: ProblemType,
        as: "problemType",
        attributes: ["id", "name", "slug"],
      },
    ],
    order: [["currentDate", "DESC"]],
  });

  const coAssignments = await CoAssignment.findAll({
    where: { technicianId: userId },
    attributes: ["ticketId"],
  });
  const coAssignedTicketIds = coAssignments.map((ca) => ca.ticketId);

  const ticketWhere = {
    isActive: true,
    [Op.or]: [{ assignedTo: userId }, { id: { [Op.in]: coAssignedTicketIds } }],
  };
  if (status) {
    const ticketStatusMap = {
      diproses: "Diproses",
      selesai: "Selesai",
      batal: "Batal",
    };
    if (ticketStatusMap[status]) ticketWhere.status = ticketStatusMap[status];
  }
  if (dateFrom || dateTo) {
    ticketWhere.createdAt = {};
    if (dateFrom) ticketWhere.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) ticketWhere.createdAt[Op.lte] = new Date(dateTo + "T23:59:59");
  }
  if (search) ticketWhere.description = { [Op.iLike]: `%${search}%` };
  if (problemTypeId) ticketWhere.problemTypeId = problemTypeId;

  const tickets = await Ticket.findAll({
    where: ticketWhere,
    include: [
      {
        model: ProblemType,
        as: "problemType",
        attributes: ["id", "name", "slug"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  const reportData = [
    ...activities.map((a) => {
      const entryTime = a.startTime;
      const completedAt =
        a.status === "selesai" || a.status === "batal" ? a.endTime : null;
      const durationMinutes =
        entryTime && completedAt
          ? Math.round((new Date(completedAt) - new Date(entryTime)) / 60000)
          : null;
      return {
        id: `activity-${a.id}`,
        type: "activity",
        date: a.currentDate,
        entryTime: entryTime ? new Date(entryTime).toISOString() : null,
        completedAt: completedAt ? new Date(completedAt).toISOString() : null,
        durationMinutes,
        title: a.title,
        status: a.status,
        ticketNumber: null,
        problemTypeName: a.problemType?.name || "-",
      };
    }),
    ...tickets.map((t) => {
      const entryTime = t.createdAt;
      const completedAt =
        t.status === "Selesai" || t.status === "Batal"
          ? t.lastStatusChangeAt
          : null;
      const durationMinutes =
        entryTime && completedAt
          ? Math.round((new Date(completedAt) - new Date(entryTime)) / 60000)
          : null;
      return {
        id: `ticket-${t.id}`,
        type: "ticket",
        date: t.createdAt.toISOString().split("T")[0],
        entryTime: entryTime ? new Date(entryTime).toISOString() : null,
        completedAt: completedAt ? new Date(completedAt).toISOString() : null,
        durationMinutes,
        title: t.description,
        status:
          t.status.toLowerCase() === "baru"
            ? "diproses"
            : t.status.toLowerCase(),
        ticketNumber: t.ticketNumber,
        problemTypeName: t.problemType?.name || "-",
      };
    }),
  ];
  reportData.sort((a, b) => new Date(b.date) - new Date(a.date));
  return reportData;
}

// Get activities for technician (own activities only)
// Tanpa carryover: aktivitas tanggal lalu tetap di tanggal tersebut, tidak ditampilkan di hari ini
router.get(
  "/",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  async (req, res) => {
    try {
      const { date, search } = req.query;

      const where = { userId: req.user.id };

      if (date) {
        where.currentDate = date;
      }

      if (search) {
        where.title = { [Op.iLike]: `%${search}%` };
      }

      const activities = await TechnicianActivity.findAll({
        where,
        include: [
          {
            model: ProblemType,
            as: "problemType",
            attributes: ["id", "name", "slug"],
          },
        ],
        order: [["startTime", "DESC"]],
      });

      res.json(activities);
    } catch (error) {
      console.error("Get activities error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Get calendar dates with activities (for dot indicators)
router.get(
  "/calendar-dates",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  async (req, res) => {
    try {
      const { month, year, search } = req.query;

      const where = { userId: req.user.id };

      // Filter by month/year if provided
      if (month && year) {
        const startDate = new Date(year, month - 1, 1)
          .toISOString()
          .split("T")[0];
        const endDate = new Date(year, month, 0).toISOString().split("T")[0];
        where.currentDate = { [Op.between]: [startDate, endDate] };
      }

      if (search) {
        where.title = { [Op.iLike]: `%${search}%` };
      }

      const activities = await TechnicianActivity.findAll({
        where,
        attributes: ["currentDate", "status"],
        raw: true,
      });

      const toDateStr = (d) => {
        if (!d) return "";
        const s =
          typeof d === "string"
            ? d
            : d.toISOString
              ? d.toISOString().slice(0, 10)
              : String(d);
        return s.slice(0, 10);
      };

      const byDate = {};
      activities.forEach((a) => {
        const dateStr = toDateStr(a.currentDate);
        if (!dateStr) return;
        if (!byDate[dateStr])
          byDate[dateStr] = { diproses: false, selesaiBatal: false };
        if (a.status === "diproses") byDate[dateStr].diproses = true;
        else if (["selesai", "batal"].includes(a.status))
          byDate[dateStr].selesaiBatal = true;
      });

      const datesWithDiproses = [];
      const datesWithOnlySelesaiBatal = [];
      Object.entries(byDate).forEach(([dateStr, flags]) => {
        if (flags.diproses) datesWithDiproses.push(dateStr);
        else if (flags.selesaiBatal) datesWithOnlySelesaiBatal.push(dateStr);
      });

      res.json({ datesWithDiproses, datesWithOnlySelesaiBatal });
    } catch (error) {
      console.error("Get calendar dates error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Get report data (activities + my tasks combined)
router.get(
  "/report",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status || "",
        dateFrom: req.query.dateFrom || "",
        dateTo: req.query.dateTo || "",
        search: req.query.search || "",
        problemTypeId: req.query.problemTypeId || "",
      };
      const activities = await TechnicianActivity.findAll({
        where: (() => {
          const w = { userId: req.user.id };
          if (filters.status) w.status = filters.status;
          if (filters.dateFrom || filters.dateTo) {
            w.currentDate = {};
            if (filters.dateFrom) w.currentDate[Op.gte] = filters.dateFrom;
            if (filters.dateTo) w.currentDate[Op.lte] = filters.dateTo;
          }
          if (filters.search) w.title = { [Op.iLike]: `%${filters.search}%` };
          if (filters.problemTypeId) w.problemTypeId = filters.problemTypeId;
          return w;
        })(),
        include: [
          {
            model: ProblemType,
            as: "problemType",
            attributes: ["id", "name", "slug"],
          },
        ],
        order: [["currentDate", "DESC"]],
      });
      const coAssignments = await CoAssignment.findAll({
        where: { technicianId: req.user.id },
        attributes: ["ticketId"],
      });
      const coAssignedTicketIds = coAssignments.map((ca) => ca.ticketId);
      const ticketWhere = {
        isActive: true,
        [Op.or]: [
          { assignedTo: req.user.id },
          { id: { [Op.in]: coAssignedTicketIds } },
        ],
      };
      if (filters.status) {
        const m = { diproses: "Diproses", selesai: "Selesai", batal: "Batal" };
        if (m[filters.status]) ticketWhere.status = m[filters.status];
      }
      if (filters.dateFrom || filters.dateTo) {
        ticketWhere.createdAt = {};
        if (filters.dateFrom)
          ticketWhere.createdAt[Op.gte] = new Date(filters.dateFrom);
        if (filters.dateTo)
          ticketWhere.createdAt[Op.lte] = new Date(
            filters.dateTo + "T23:59:59",
          );
      }
      if (filters.search)
        ticketWhere.description = { [Op.iLike]: `%${filters.search}%` };
      if (filters.problemTypeId)
        ticketWhere.problemTypeId = filters.problemTypeId;
      const tickets = await Ticket.findAll({
        where: ticketWhere,
        include: [
          {
            model: ProblemType,
            as: "problemType",
            attributes: ["id", "name", "slug"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      const reportData = [
        ...activities.map((a) => {
          const entryTime = a.startTime;
          const completedAt =
            a.status === "selesai" || a.status === "batal" ? a.endTime : null;
          const durationMinutes =
            entryTime && completedAt
              ? Math.round(
                  (new Date(completedAt) - new Date(entryTime)) / 60000,
                )
              : null;
          return {
            id: `activity-${a.id}`,
            type: "activity",
            date: a.currentDate,
            entryTime: entryTime ? new Date(entryTime).toISOString() : null,
            completedAt: completedAt
              ? new Date(completedAt).toISOString()
              : null,
            durationMinutes,
            title: a.title,
            status: a.status,
            startTime: a.startTime,
            endTime: a.endTime,
            problemTypeName: a.problemType?.name || "-",
            proofPhotoUrl: a.proofPhotoUrl || null,
          };
        }),
        ...tickets.map((t) => {
          const entryTime = t.createdAt;
          const completedAt =
            t.status === "Selesai" || t.status === "Batal"
              ? t.lastStatusChangeAt
              : null;
          const durationMinutes =
            entryTime && completedAt
              ? Math.round(
                  (new Date(completedAt) - new Date(entryTime)) / 60000,
                )
              : null;
          return {
            id: `ticket-${t.id}`,
            type: "ticket",
            date: t.createdAt.toISOString().split("T")[0],
            entryTime: entryTime ? new Date(entryTime).toISOString() : null,
            completedAt: completedAt
              ? new Date(completedAt).toISOString()
              : null,
            durationMinutes,
            title: t.description,
            status:
              t.status.toLowerCase() === "baru"
                ? "diproses"
                : t.status.toLowerCase(),
            ticketNumber: t.ticketNumber,
            problemTypeName: t.problemType?.name || "-",
            proofPhotoUrl: t.proofPhotoUrl || null,
          };
        }),
      ];
      reportData.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json(reportData);
    } catch (error) {
      console.error("Get report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Export report to Excel (filter affects result)
router.get(
  "/report/export/excel",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  logActivity,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status || "",
        dateFrom: req.query.dateFrom || "",
        dateTo: req.query.dateTo || "",
        search: req.query.search || "",
        problemTypeId: req.query.problemTypeId || "",
      };
      const reportData = await getReportDataForTechnician(req.user.id, filters);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Aktivitas");

      worksheet.columns = [
        { header: "Waktu Masuk", key: "entryTimeDisplay", width: 18 },
        { header: "Waktu Selesai/Batal", key: "completedAtDisplay", width: 20 },
        { header: "Selisih Waktu", key: "durationMinutesDisplay", width: 18 },
        {
          header: "Judul Aktivitas / Deskripsi Masalah",
          key: "title",
          width: 45,
        },
        { header: "Tipe Masalah", key: "problemTypeName", width: 18 },
        { header: "Status", key: "statusLabel", width: 12 },
      ];
      worksheet.getRow(1).font = { bold: true };

      const statusLabels = {
        diproses: "Diproses",
        selesai: "Selesai",
        batal: "Batal",
      };
      reportData.forEach((item) => {
        const entryTimeStr = item.entryTime
          ? moment(item.entryTime).format("DD/MM/YYYY HH:mm")
          : "-";
        const completedAtStr = item.completedAt
          ? moment(item.completedAt).format("DD/MM/YYYY HH:mm")
          : "-";
        const durationStr =
          item.durationMinutes != null ? `${item.durationMinutes} menit` : "-";
        const titleStr =
          (item.title || "-") +
          (item.ticketNumber ? ` (${item.ticketNumber})` : "");
        worksheet.addRow({
          entryTimeDisplay: entryTimeStr,
          completedAtDisplay: completedAtStr,
          durationMinutesDisplay: durationStr,
          title: titleStr,
          problemTypeName: item.problemTypeName || "-",
          statusLabel: statusLabels[item.status] || item.status,
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=laporan-aktivitas.xlsx",
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export Excel (activities report) error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Export report to PDF (kop surat, kota & tanggal, QR, nama teknisi)
router.get(
  "/report/export/pdf",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  logActivity,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status || "",
        dateFrom: req.query.dateFrom || "",
        dateTo: req.query.dateTo || "",
        search: req.query.search || "",
        problemTypeId: req.query.problemTypeId || "",
      };
      const reportData = await getReportDataForTechnician(req.user.id, filters);

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=laporan-aktivitas.pdf",
      );
      doc.pipe(res);

      const contentStartY = drawLetterhead(doc);
      doc.y = contentStartY;

      doc
        .fontSize(20)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text("Laporan Aktivitas Saya", { align: "center" });
      doc.moveDown();

      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [70, 78, 58, 162, 90, 42];
      const headers = [
        "Waktu Masuk",
        "Selesai/Batal",
        "Selisih",
        "Judul / Deskripsi",
        "Tipe Masalah",
        "Status",
      ];

      let y = tableTop;
      doc.fontSize(9).font("Helvetica-Bold");
      headers.forEach((header, i) => {
        doc.text(
          header,
          50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
          y,
          { width: colWidths[i], ellipsis: true },
        );
      });
      y += rowHeight;

      const statusLabels = {
        diproses: "Diproses",
        selesai: "Selesai",
        batal: "Batal",
      };
      doc.font("Helvetica").fontSize(8);
      reportData.forEach((item) => {
        if (y > 700) {
          doc.addPage();
          const newPageY = drawLetterhead(doc);
          y = newPageY + 10;
          doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
          headers.forEach((header, i) => {
            doc.text(
              header,
              50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
              y,
              { width: colWidths[i], ellipsis: true },
            );
          });
          y += rowHeight;
          doc.font("Helvetica").fontSize(8).fillColor("#000000");
        }

        const entryTimeStr = item.entryTime
          ? moment(item.entryTime).format("DD/MM/YY HH:mm")
          : "-";
        const completedAtStr = item.completedAt
          ? moment(item.completedAt).format("DD/MM/YY HH:mm")
          : "-";
        const durationStr =
          item.durationMinutes != null ? `${item.durationMinutes} menit` : "-";
        const titleStr =
          (item.title || "-").substring(0, 80) +
          ((item.title || "").length > 80 ? "..." : "");
        const problemTypeStr =
          (item.problemTypeName || "-").substring(0, 30) +
          ((item.problemTypeName || "").length > 30 ? "..." : "");
        const statusStr = statusLabels[item.status] || item.status;

        [
          entryTimeStr,
          completedAtStr,
          durationStr,
          titleStr,
          problemTypeStr,
          statusStr,
        ].forEach((cell, i) => {
          doc.text(
            cell,
            50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            y,
            { width: colWidths[i], ellipsis: true },
          );
        });
        y += rowHeight;
      });

      await addVerificationSection(doc, req.user.fullName, y);
      doc.end();
    } catch (error) {
      console.error("Export PDF (activities report) error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Helper: get combined activities + tickets for admin (filter affects result, no pagination)
async function getCombinedDataForAdmin(filters) {
  const { dateFrom, dateTo, search, technicianId, problemTypeId } = filters;

  const activityWhere = {};
  if (dateFrom || dateTo) {
    activityWhere.currentDate = {};
    if (dateFrom) activityWhere.currentDate[Op.gte] = dateFrom;
    if (dateTo) activityWhere.currentDate[Op.lte] = dateTo;
  }
  if (search) activityWhere.title = { [Op.iLike]: `%${search}%` };
  if (technicianId) activityWhere.userId = technicianId;
  if (problemTypeId) activityWhere.problemTypeId = problemTypeId;

  const activities = await TechnicianActivity.findAll({
    where: activityWhere,
    include: [
      {
        model: User,
        as: "technician",
        attributes: ["id", "fullName", "username"],
      },
      {
        model: ProblemType,
        as: "problemType",
        attributes: ["id", "name", "slug"],
      },
    ],
    order: [
      ["currentDate", "DESC"],
      ["startTime", "DESC"],
    ],
  });

  const ticketWhere = { isActive: true };
  if (dateFrom || dateTo) {
    ticketWhere.createdAt = {};
    if (dateFrom) ticketWhere.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) ticketWhere.createdAt[Op.lte] = new Date(dateTo + "T23:59:59");
  }
  if (search) ticketWhere.description = { [Op.iLike]: `%${search}%` };
  if (problemTypeId) ticketWhere.problemTypeId = problemTypeId;
  if (technicianId) {
    const coRows = await CoAssignment.findAll({
      where: { technicianId },
      attributes: ["ticketId"],
    });
    const coTicketIds = coRows.map((c) => c.ticketId);
    ticketWhere[Op.or] = [
      { assignedTo: technicianId },
      { id: { [Op.in]: coTicketIds.length ? coTicketIds : [0] } },
    ];
  }

  const tickets = await Ticket.findAll({
    where: ticketWhere,
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
    order: [["createdAt", "DESC"]],
  });

  const activityRows = activities.map((a) => {
    const entryTime = a.startTime;
    const completedAt =
      a.status === "selesai" || a.status === "batal" ? a.endTime : null;
    const durationMinutes =
      entryTime && completedAt
        ? Math.round((new Date(completedAt) - new Date(entryTime)) / 60000)
        : null;
    return {
      id: `activity-${a.id}`,
      type: "activity",
      date: a.currentDate,
      entryTime: entryTime ? new Date(entryTime).toISOString() : null,
      completedAt: completedAt ? new Date(completedAt).toISOString() : null,
      durationMinutes,
      title: a.title,
      status: a.status,
      technicianDisplay: a.technician ? a.technician.fullName : "-",
      ticketNumber: null,
      problemTypeName: a.problemType?.name || "-",
      proofPhotoUrl: a.proofPhotoUrl || null,
    };
  });

  const ticketRows = tickets.map((t) => {
    const main = t.assignedTechnician ? t.assignedTechnician.fullName : "";
    const coNames = (t.coAssignments || [])
      .map((c) => c.technician && c.technician.fullName)
      .filter(Boolean);
    const technicianDisplay = main
      ? coNames.length
        ? `${main}, Co: ${coNames.join(", ")}`
        : main
      : coNames.length
        ? `Co: ${coNames.join(", ")}`
        : "-";
    const entryTime = t.createdAt;
    const completedAt =
      t.status === "Selesai" || t.status === "Batal"
        ? t.lastStatusChangeAt
        : null;
    const durationMinutes =
      entryTime && completedAt
        ? Math.round((new Date(completedAt) - new Date(entryTime)) / 60000)
        : null;
    return {
      id: `ticket-${t.id}`,
      type: "ticket",
      date: t.createdAt.toISOString().split("T")[0],
      entryTime: entryTime ? new Date(entryTime).toISOString() : null,
      completedAt: completedAt ? new Date(completedAt).toISOString() : null,
      durationMinutes,
      title: t.description,
      status: t.status === "Baru" ? "diproses" : t.status.toLowerCase(),
      technicianDisplay,
      ticketNumber: t.ticketNumber,
      problemTypeName: t.problemType?.name || "-",
      proofPhotoUrl: t.proofPhotoUrl || null,
    };
  });

  const combined = [...activityRows, ...ticketRows];
  combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  return combined;
}

// Get all activities (admin only - read only)
router.get("/all", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { dateFrom, dateTo, search, technicianId } = req.query;

    const where = {};

    if (dateFrom || dateTo) {
      where.currentDate = {};
      if (dateFrom) where.currentDate[Op.gte] = dateFrom;
      if (dateTo) where.currentDate[Op.lte] = dateTo;
    }

    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }

    if (technicianId) {
      where.userId = technicianId;
    }

    const activities = await TechnicianActivity.findAll({
      where,
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "fullName", "username", "role"],
        },
        {
          model: ProblemType,
          as: "problemType",
          attributes: ["id", "name", "slug"],
        },
      ],
      order: [
        ["currentDate", "DESC"],
        ["startTime", "DESC"],
      ],
    });

    res.json(activities);
  } catch (error) {
    console.error("Get all activities error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all activities + tickets combined (admin only) – for table: Teknisi, Tanggal, Judul/Deskripsi, Tipe, Status
router.get(
  "/all-combined",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom || "",
        dateTo: req.query.dateTo || "",
        search: req.query.search || "",
        technicianId: req.query.technicianId || "",
        problemTypeId: req.query.problemTypeId || "",
      };
      const combined = await getCombinedDataForAdmin(filters);
      res.json(combined);
    } catch (error) {
      console.error("Get all-combined error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Export all-combined to Excel (admin only; filter affects result, no pagination)
router.get(
  "/all-combined/export/excel",
  authenticate,
  authorize("admin"),
  logActivity,
  async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom || "",
        dateTo: req.query.dateTo || "",
        search: req.query.search || "",
        technicianId: req.query.technicianId || "",
        problemTypeId: req.query.problemTypeId || "",
      };
      const data = await getCombinedDataForAdmin(filters);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Semua Aktivitas");

      worksheet.columns = [
        { header: "Teknisi", key: "technicianDisplay", width: 35 },
        { header: "Waktu Masuk", key: "entryTimeDisplay", width: 18 },
        { header: "Waktu Selesai/Batal", key: "completedAtDisplay", width: 20 },
        { header: "Selisih Waktu", key: "durationMinutesDisplay", width: 18 },
        {
          header: "Judul Aktivitas / Deskripsi Masalah",
          key: "title",
          width: 45,
        },
        { header: "Tipe Masalah", key: "problemTypeName", width: 18 },
        { header: "Tipe", key: "typeLabel", width: 12 },
        { header: "Status", key: "statusLabel", width: 12 },
      ];
      worksheet.getRow(1).font = { bold: true };

      const statusLabels = {
        diproses: "Diproses",
        selesai: "Selesai",
        batal: "Batal",
      };
      data.forEach((item) => {
        const entryTimeStr = item.entryTime
          ? moment(item.entryTime).format("DD/MM/YYYY HH:mm")
          : "-";
        const completedAtStr = item.completedAt
          ? moment(item.completedAt).format("DD/MM/YYYY HH:mm")
          : "-";
        const durationStr =
          item.durationMinutes != null ? `${item.durationMinutes} menit` : "-";
        const titleStr =
          (item.title || "-") +
          (item.ticketNumber ? ` (${item.ticketNumber})` : "");
        const techStr = (item.technicianDisplay || "-").replace(
          /, Co: /g,
          ", ",
        );
        worksheet.addRow({
          technicianDisplay: techStr,
          entryTimeDisplay: entryTimeStr,
          completedAtDisplay: completedAtStr,
          durationMinutesDisplay: durationStr,
          title: titleStr,
          problemTypeName: item.problemTypeName || "-",
          typeLabel: item.type === "activity" ? "Aktivitas" : "Tugas",
          statusLabel: statusLabels[item.status] || item.status,
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=semua-aktivitas.xlsx",
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export Excel (all-combined) error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Export all-combined to PDF (admin only; kop surat, kota & tanggal, QR, nama pemohon)
router.get(
  "/all-combined/export/pdf",
  authenticate,
  authorize("admin"),
  logActivity,
  async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom || "",
        dateTo: req.query.dateTo || "",
        search: req.query.search || "",
        technicianId: req.query.technicianId || "",
        problemTypeId: req.query.problemTypeId || "",
      };
      const data = await getCombinedDataForAdmin(filters);

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=semua-aktivitas.pdf",
      );
      doc.pipe(res);

      const contentStartY = drawLetterhead(doc);
      doc.y = contentStartY;

      doc
        .fontSize(20)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text("Laporan Semua Aktivitas", { align: "center" });
      doc.moveDown();

      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [52, 48, 48, 34, 110, 60, 40, 40];
      const headers = [
        "Teknisi",
        "Waktu Masuk",
        "Selesai/Batal",
        "Selisih",
        "Judul / Deskripsi",
        "Tipe Masalah",
        "Tipe",
        "Status",
      ];

      let y = tableTop;
      doc.fontSize(9).font("Helvetica-Bold");
      headers.forEach((header, i) => {
        doc.text(
          header,
          50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
          y,
          { width: colWidths[i], ellipsis: true },
        );
      });
      y += rowHeight;

      const statusLabels = {
        diproses: "Diproses",
        selesai: "Selesai",
        batal: "Batal",
      };
      doc.font("Helvetica").fontSize(8);
      data.forEach((item) => {
        if (y > 700) {
          doc.addPage();
          const newPageY = drawLetterhead(doc);
          y = newPageY + 10;
          doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
          headers.forEach((header, i) => {
            doc.text(
              header,
              50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
              y,
              { width: colWidths[i], ellipsis: true },
            );
          });
          y += rowHeight;
          doc.font("Helvetica").fontSize(8).fillColor("#000000");
        }

        const techStr =
          (item.technicianDisplay || "-")
            .replace(/, Co: /g, ", ")
            .substring(0, 18) +
          ((item.technicianDisplay || "").length > 18 ? "..." : "");
        const entryTimeStr = item.entryTime
          ? moment(item.entryTime).format("DD/MM/YY HH:mm")
          : "-";
        const completedAtStr = item.completedAt
          ? moment(item.completedAt).format("DD/MM/YY HH:mm")
          : "-";
        const durationStr =
          item.durationMinutes != null ? `${item.durationMinutes} menit` : "-";
        const titleStr =
          (item.title || "-").substring(0, 45) +
          ((item.title || "").length > 45 ? "..." : "");
        const problemTypeStr =
          (item.problemTypeName || "-").substring(0, 20) +
          ((item.problemTypeName || "").length > 20 ? "..." : "");
        const typeStr = item.type === "activity" ? "Aktivitas" : "Tugas";
        const statusStr = statusLabels[item.status] || item.status;

        [
          techStr,
          entryTimeStr,
          completedAtStr,
          durationStr,
          titleStr,
          problemTypeStr,
          typeStr,
          statusStr,
        ].forEach((cell, i) => {
          doc.text(
            cell,
            50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            y,
            { width: colWidths[i], ellipsis: true },
          );
        });
        y += rowHeight;
      });

      await addVerificationSection(doc, req.user.fullName, y);
      doc.end();
    } catch (error) {
      console.error("Export PDF (all-combined) error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Create activity (currentDate = tanggal dipilih di kalender, default hari ini)
router.post(
  "/",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  upload.single("photo"),
  [
    body("title").notEmpty().withMessage("Judul aktivitas required"),
    body("currentDate")
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("Tanggal harus format YYYY-MM-DD"),
    body("problemTypeId")
      .optional({ nullable: true })
      .custom(
        (value) =>
          value === "" ||
          value == null ||
          (Number.isInteger(Number(value)) && Number(value) > 0),
      )
      .withMessage("problemTypeId must be a positive integer or omit to clear"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const currentDate =
        req.body.currentDate || new Date().toISOString().split("T")[0];
      const problemTypeId = req.body.problemTypeId
        ? parseInt(req.body.problemTypeId, 10)
        : null;
      if (problemTypeId != null) {
        const exists = await ProblemType.findByPk(problemTypeId);
        if (!exists)
          return res
            .status(400)
            .json({ message: "Tipe masalah tidak ditemukan" });
      }

      const proofPhotoUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const activity = await TechnicianActivity.create({
        userId: req.user.id,
        title: req.body.title,
        problemTypeId,
        status: "diproses",
        startTime: new Date(),
        currentDate,
        proofPhotoUrl,
      });

      const created = await TechnicianActivity.findByPk(activity.id, {
        include: [
          {
            model: ProblemType,
            as: "problemType",
            attributes: ["id", "name", "slug"],
          },
        ],
      });
      res.status(201).json(created || activity);
    } catch (error) {
      console.error("Create activity error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Update activity
router.put(
  "/:id",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  upload.single("photo"),
  [
    body("title").optional().notEmpty().withMessage("Judul tidak boleh kosong"),
    body("status")
      .optional()
      .isIn(["diproses", "selesai", "batal"])
      .withMessage("Status tidak valid"),
    body("problemTypeId")
      .optional({ nullable: true })
      .custom(
        (value) =>
          value === "" ||
          value == null ||
          (Number.isInteger(Number(value)) && Number(value) > 0),
      )
      .withMessage("problemTypeId must be a positive integer or omit to clear"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const activity = await TechnicianActivity.findByPk(req.params.id);

      if (!activity) {
        return res.status(404).json({ message: "Aktivitas tidak ditemukan" });
      }

      // Check ownership
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      if (req.file) {
        unlinkProofFile(activity.proofPhotoUrl);
        activity.proofPhotoUrl = `/uploads/${req.file.filename}`;
      }

      // Update fields
      if (req.body.title) {
        activity.title = req.body.title;
      }

      if ("problemTypeId" in req.body) {
        const problemTypeId = req.body.problemTypeId
          ? parseInt(req.body.problemTypeId, 10)
          : null;
        if (problemTypeId != null) {
          const exists = await ProblemType.findByPk(problemTypeId);
          if (!exists)
            return res
              .status(400)
              .json({ message: "Tipe masalah tidak ditemukan" });
        }
        activity.problemTypeId = problemTypeId;
      }

      if (req.body.status) {
        const oldStatus = activity.status;
        activity.status = req.body.status;

        // Set endTime when changing to selesai or batal
        if (
          oldStatus === "diproses" &&
          ["selesai", "batal"].includes(req.body.status)
        ) {
          activity.endTime = new Date();
        }

        // Clear endTime if moving back to diproses
        if (req.body.status === "diproses" && oldStatus !== "diproses") {
          activity.endTime = null;
        }
      }

      await activity.save();

      const updated = await TechnicianActivity.findByPk(activity.id, {
        include: [
          {
            model: ProblemType,
            as: "problemType",
            attributes: ["id", "name", "slug"],
          },
        ],
      });
      res.json(updated || activity);
    } catch (error) {
      console.error("Update activity error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Update activity status only (for drag and drop)
router.patch(
  "/:id/status",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  [
    body("status")
      .isIn(["diproses", "selesai", "batal"])
      .withMessage("Status tidak valid"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const activity = await TechnicianActivity.findByPk(req.params.id);

      if (!activity) {
        return res.status(404).json({ message: "Aktivitas tidak ditemukan" });
      }

      // Check ownership
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      const oldStatus = activity.status;
      activity.status = req.body.status;

      // Set endTime when changing to selesai or batal
      if (
        oldStatus === "diproses" &&
        ["selesai", "batal"].includes(req.body.status)
      ) {
        activity.endTime = new Date();
      }

      // Clear endTime if moving back to diproses
      if (req.body.status === "diproses" && oldStatus !== "diproses") {
        activity.endTime = null;
      }

      await activity.save();

      res.json(activity);
    } catch (error) {
      console.error("Update activity status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Delete proof photo only
router.delete(
  "/:id/proof",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  async (req, res) => {
    try {
      const activity = await TechnicianActivity.findByPk(req.params.id);

      if (!activity) {
        return res.status(404).json({ message: "Aktivitas tidak ditemukan" });
      }

      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      unlinkProofFile(activity.proofPhotoUrl);
      activity.proofPhotoUrl = null;
      await activity.save();

      const updated = await TechnicianActivity.findByPk(activity.id, {
        include: [
          {
            model: ProblemType,
            as: "problemType",
            attributes: ["id", "name", "slug"],
          },
        ],
      });
      res.json(updated || activity);
    } catch (error) {
      console.error("Delete activity proof error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Delete activity
router.delete(
  "/:id",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  async (req, res) => {
    try {
      const activity = await TechnicianActivity.findByPk(req.params.id);

      if (!activity) {
        return res.status(404).json({ message: "Aktivitas tidak ditemukan" });
      }

      // Check ownership
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      unlinkProofFile(activity.proofPhotoUrl);
      await activity.destroy();

      res.json({ message: "Aktivitas berhasil dihapus" });
    } catch (error) {
      console.error("Delete activity error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
