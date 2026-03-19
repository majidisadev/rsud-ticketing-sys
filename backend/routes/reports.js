const express = require("express");
const { Op } = require("sequelize");
const { Ticket, User, CoAssignment, ProblemType } = require("../models");
const { authenticate, authorize } = require("../middleware/auth");
const logActivity = require("../middleware/activityLogger");
const {
  drawLetterhead,
  addVerificationSection,
} = require("../utils/pdfHelpers");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const moment = require("moment");

const router = express.Router();

// Generate report data
router.get(
  "/data",
  authenticate,
  authorize("admin"),
  logActivity,
  async (req, res) => {
    try {
      const { category, status, dateFrom, dateTo } = req.query;

      const where = { isActive: true };

      if (category) {
        where.category = category;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + "T23:59:59");
      }

      const tickets = await Ticket.findAll({
        where,
        include: [
          {
            model: User,
            as: "assignedTechnician",
            attributes: ["id", "fullName"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const reportData = tickets.map((ticket) => ({
        kategori: ticket.category,
        nomorTiket: ticket.ticketNumber,
        tanggalMasuk: moment(ticket.createdAt).format("YYYY-MM-DD HH:mm:ss"),
        tanggalUpdate: moment(ticket.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
        pelapor: ticket.reporterName,
        asalUnit: ticket.reporterUnit,
        teknisi: ticket.assignedTechnician?.fullName || "-",
        deskripsiMasalah: ticket.description || "-",
      }));

      res.json(reportData);
    } catch (error) {
      console.error("Get report data error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Export to Excel
router.get(
  "/export/excel",
  authenticate,
  authorize("admin"),
  logActivity,
  async (req, res) => {
    try {
      const { category, status, dateFrom, dateTo } = req.query;

      const where = { isActive: true };

      if (category) {
        where.category = category;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + "T23:59:59");
      }

      const tickets = await Ticket.findAll({
        where,
        include: [
          {
            model: User,
            as: "assignedTechnician",
            attributes: ["id", "fullName"],
          },
          {
            model: CoAssignment,
            as: "coAssignments",
            include: [
              { model: User, as: "technician", attributes: ["id", "fullName"] },
            ],
          },
          { model: ProblemType, as: "problemType", attributes: ["id", "name"] },
        ],
        order: [["createdAt", "DESC"]],
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Tiket");
      worksheet.columns = [
        { header: "Nomor Tiket", key: "ticketNumber", width: 20 },
        { header: "Waktu Masuk", key: "createdAt", width: 20 },
        { header: "Waktu Ambil", key: "pickedUpAt", width: 20 },
        {
          header: "Response Time (menit)",
          key: "responseTimeMinutes",
          width: 18,
        },
        { header: "Waktu Selesai/Batal", key: "closedAt", width: 20 },
        { header: "Selisih Waktu (menit)", key: "durationMinutes", width: 18 },
        { header: "Pelapor", key: "pelapor", width: 35 },
        { header: "Teknisi", key: "technician", width: 20 },
        { header: "Tipe Masalah", key: "problemTypeName", width: 15 },
        { header: "Deskripsi Masalah", key: "description", width: 50 },
        { header: "Status", key: "status", width: 15 },
      ];
      worksheet.getRow(1).font = { bold: true };

      tickets.forEach((ticket) => {
        const technicians = [];
        if (ticket.assignedTechnician?.fullName)
          technicians.push(ticket.assignedTechnician.fullName);
        if (ticket.coAssignments?.length) {
          ticket.coAssignments.forEach((ca) => {
            if (ca.technician?.fullName)
              technicians.push(ca.technician.fullName);
          });
        }
        const technicianText = technicians.length
          ? technicians.join(", ")
          : "-";
        const responseTimeMinutes =
          ticket.pickedUpAt && ticket.createdAt
            ? Math.round(
                (new Date(ticket.pickedUpAt) - new Date(ticket.createdAt)) /
                  60000,
              )
            : null;
        const closedAtText =
          (ticket.status === "Selesai" || ticket.status === "Batal") &&
          ticket.lastStatusChangeAt
            ? moment(ticket.lastStatusChangeAt).format("YYYY-MM-DD HH:mm:ss")
            : "-";
        const durationMinutes =
          (ticket.status === "Selesai" || ticket.status === "Batal") &&
          ticket.lastStatusChangeAt &&
          ticket.createdAt
            ? Math.round(
                (new Date(ticket.lastStatusChangeAt) -
                  new Date(ticket.createdAt)) /
                  60000,
              )
            : null;
        const pelaporText =
          [ticket.reporterName, ticket.reporterUnit]
            .filter(Boolean)
            .join(" - ") || "-";
        worksheet.addRow({
          ticketNumber: ticket.ticketNumber,
          createdAt: moment(ticket.createdAt).format("YYYY-MM-DD HH:mm:ss"),
          pickedUpAt: ticket.pickedUpAt
            ? moment(ticket.pickedUpAt).format("YYYY-MM-DD HH:mm:ss")
            : "-",
          responseTimeMinutes:
            responseTimeMinutes != null ? responseTimeMinutes : "-",
          closedAt: closedAtText,
          durationMinutes: durationMinutes != null ? durationMinutes : "-",
          pelapor: pelaporText,
          technician: technicianText,
          problemTypeName: ticket.problemType?.name || "-",
          description: ticket.description || "-",
          status: ticket.status || "-",
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=laporan-tiket.xlsx",
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export Excel error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Export to PDF
router.get(
  "/export/pdf",
  authenticate,
  authorize("admin"),
  logActivity,
  async (req, res) => {
    try {
      const { category, status, dateFrom, dateTo } = req.query;

      const where = { isActive: true };

      if (category) {
        where.category = category;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + "T23:59:59");
      }

      const tickets = await Ticket.findAll({
        where,
        include: [
          {
            model: User,
            as: "assignedTechnician",
            attributes: ["id", "fullName"],
          },
          {
            model: CoAssignment,
            as: "coAssignments",
            include: [
              { model: User, as: "technician", attributes: ["id", "fullName"] },
            ],
          },
          { model: ProblemType, as: "problemType", attributes: ["id", "name"] },
        ],
        order: [["createdAt", "DESC"]],
      });

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=laporan-tiket.pdf",
      );
      doc.pipe(res);
      const contentStartY = drawLetterhead(doc);
      doc.y = contentStartY;
      doc
        .fontSize(20)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text("Laporan Tiket", { align: "center" });
      doc.moveDown();

      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [65, 60, 55, 58, 70, 50, 55, 100];
      const headers = [
        "Nomor Tiket",
        "Waktu Masuk",
        "Waktu Ambil",
        "Wkt Selesai/Batal",
        "Pelapor",
        "Teknisi",
        "Tipe Mslh",
        "Deskripsi",
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

      // Table rows
      doc.font("Helvetica").fontSize(8);
      tickets.forEach((ticket, index) => {
        if (y > 700) {
          doc.addPage();
          // Draw letterhead on new page
          const newPageY = drawLetterhead(doc);
          y = newPageY + 10;

          // Redraw header on new page
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

        const technicians = [];
        if (ticket.assignedTechnician?.fullName)
          technicians.push(ticket.assignedTechnician.fullName);
        if (ticket.coAssignments?.length) {
          ticket.coAssignments.forEach((ca) => {
            if (ca.technician?.fullName)
              technicians.push(ca.technician.fullName);
          });
        }
        const technicianText = technicians.length
          ? technicians.join(", ")
          : "-";
        const closedAtText =
          (ticket.status === "Selesai" || ticket.status === "Batal") &&
          ticket.lastStatusChangeAt
            ? moment(ticket.lastStatusChangeAt).format("DD/MM/YYYY HH:mm")
            : "-";
        const pelaporText =
          [ticket.reporterName, ticket.reporterUnit]
            .filter(Boolean)
            .join(" - ") || "-";

        const row = [
          ticket.ticketNumber,
          moment(ticket.createdAt).format("DD/MM/YYYY HH:mm"),
          ticket.pickedUpAt
            ? moment(ticket.pickedUpAt).format("DD/MM/YYYY HH:mm")
            : "-",
          closedAtText,
          pelaporText,
          technicianText,
          ticket.problemType?.name || "-",
          ticket.description || "-",
        ];
        row.forEach((cell, i) => {
          const cellText = String(cell ?? "-");
          doc.text(
            cellText,
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
      console.error("Export PDF error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Export to Excel for Technician (My Tasks or All Tasks when scope=all)
router.get(
  "/export/technician/excel",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  logActivity,
  async (req, res) => {
    try {
      const technicianId = req.user.id;
      const { status, search, scope, problemTypeId, dateFrom, dateTo } =
        req.query;
      const isAllTasks = scope === "all";

      const roleCategory = {
        teknisi_simrs: "SIMRS",
        teknisi_ipsrs: "IPSRS",
      };
      const where = { isActive: true };

      if (isAllTasks) {
        where.category = roleCategory[req.user.role];
      } else {
        const coAssignments = await CoAssignment.findAll({
          where: { technicianId },
          attributes: ["ticketId"],
        });
        const coAssignedTicketIds = coAssignments.map((ca) => ca.ticketId);
        where[Op.or] = [
          { assignedTo: technicianId },
          { id: { [Op.in]: coAssignedTicketIds } },
        ];
      }

      if (status) where.status = status;
      if (problemTypeId) where.problemTypeId = problemTypeId;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + "T23:59:59");
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

      const tickets = await Ticket.findAll({
        where,
        include: [
          {
            model: User,
            as: "assignedTechnician",
            attributes: ["id", "fullName"],
          },
          {
            model: CoAssignment,
            as: "coAssignments",
            include: [
              { model: User, as: "technician", attributes: ["id", "fullName"] },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        isAllTasks ? "Semua Tugas" : "Tugas Saya",
      );
      worksheet.columns = [
        { header: "Nomor Tiket", key: "ticketNumber", width: 20 },
        { header: "Waktu Masuk", key: "createdAt", width: 20 },
        { header: "Waktu Ambil", key: "pickedUpAt", width: 20 },
        {
          header: "Response Time (menit)",
          key: "responseTimeMinutes",
          width: 18,
        },
        { header: "Waktu Selesai/Batal", key: "closedAt", width: 20 },
        { header: "Selisih Waktu (menit)", key: "durationMinutes", width: 18 },
        { header: "Pelapor", key: "pelapor", width: 35 },
        { header: "Deskripsi Masalah", key: "description", width: 50 },
        { header: "Status", key: "status", width: 15 },
      ];
      worksheet.getRow(1).font = { bold: true };

      tickets.forEach((ticket) => {
        const pelaporText =
          [ticket.reporterName, ticket.reporterUnit]
            .filter(Boolean)
            .join(" - ") || "-";
        const responseTimeMinutes =
          ticket.pickedUpAt && ticket.createdAt
            ? Math.round(
                (new Date(ticket.pickedUpAt) - new Date(ticket.createdAt)) /
                  60000,
              )
            : null;
        const closedAtText =
          (ticket.status === "Selesai" || ticket.status === "Batal") &&
          ticket.lastStatusChangeAt
            ? moment(ticket.lastStatusChangeAt).format("YYYY-MM-DD HH:mm:ss")
            : "-";
        const durationMinutes =
          (ticket.status === "Selesai" || ticket.status === "Batal") &&
          ticket.lastStatusChangeAt &&
          ticket.createdAt
            ? Math.round(
                (new Date(ticket.lastStatusChangeAt) -
                  new Date(ticket.createdAt)) /
                  60000,
              )
            : null;
        worksheet.addRow({
          ticketNumber: ticket.ticketNumber,
          createdAt: moment(ticket.createdAt).format("YYYY-MM-DD HH:mm:ss"),
          pickedUpAt: ticket.pickedUpAt
            ? moment(ticket.pickedUpAt).format("YYYY-MM-DD HH:mm:ss")
            : "-",
          responseTimeMinutes:
            responseTimeMinutes != null ? `${responseTimeMinutes} menit` : "-",
          closedAt: closedAtText,
          durationMinutes:
            durationMinutes != null ? `${durationMinutes} menit` : "-",
          pelapor: pelaporText,
          description: ticket.description || "-",
          status: ticket.status || "-",
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" +
          (isAllTasks ? "semua-tugas.xlsx" : "tugas-saya.xlsx"),
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export Excel error (Technician):", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Export to PDF for Technician (My Tasks or All Tasks when scope=all)
router.get(
  "/export/technician/pdf",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  logActivity,
  async (req, res) => {
    try {
      const technicianId = req.user.id;
      const { status, search, scope, problemTypeId, dateFrom, dateTo } =
        req.query;
      const isAllTasks = scope === "all";

      const roleCategory = { teknisi_simrs: "SIMRS", teknisi_ipsrs: "IPSRS" };
      const where = { isActive: true };
      if (isAllTasks) {
        where.category = roleCategory[req.user.role];
      } else {
        const coAssignments = await CoAssignment.findAll({
          where: { technicianId },
          attributes: ["ticketId"],
        });
        const coAssignedTicketIds = coAssignments.map((ca) => ca.ticketId);
        where[Op.or] = [
          { assignedTo: technicianId },
          { id: { [Op.in]: coAssignedTicketIds } },
        ];
      }
      if (status) where.status = status;
      if (problemTypeId) where.problemTypeId = problemTypeId;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + "T23:59:59");
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

      const tickets = await Ticket.findAll({
        where,
        include: [
          {
            model: User,
            as: "assignedTechnician",
            attributes: ["id", "fullName"],
          },
          {
            model: CoAssignment,
            as: "coAssignments",
            include: [
              { model: User, as: "technician", attributes: ["id", "fullName"] },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" +
          (isAllTasks ? "semua-tugas.pdf" : "tugas-saya.pdf"),
      );
      doc.pipe(res);
      const contentStartY = drawLetterhead(doc);
      doc.y = contentStartY;
      doc
        .fontSize(20)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(isAllTasks ? "Laporan Semua Tugas" : "Laporan Tugas Saya", {
          align: "center",
        });
      doc.moveDown();

      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [52, 58, 58, 48, 68, 48, 72, 94];
      const headers = [
        "Nomor",
        "Masuk",
        "Ambil",
        "Respons",
        "Selesai/Batal",
        "Durasi",
        "Pelapor",
        "Deskripsi",
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

      doc.font("Helvetica").fontSize(8);
      for (const ticket of tickets) {
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
        const pelaporText =
          [ticket.reporterName, ticket.reporterUnit]
            .filter(Boolean)
            .join(" - ") || "-";
        const responseTimeMinutes =
          ticket.pickedUpAt && ticket.createdAt
            ? Math.round(
                (new Date(ticket.pickedUpAt) - new Date(ticket.createdAt)) /
                  60000,
              )
            : null;
        const closedAtText =
          (ticket.status === "Selesai" || ticket.status === "Batal") &&
          ticket.lastStatusChangeAt
            ? moment(ticket.lastStatusChangeAt).format("DD/MM/YYYY HH:mm")
            : "-";
        const durationMinutes =
          (ticket.status === "Selesai" || ticket.status === "Batal") &&
          ticket.lastStatusChangeAt &&
          ticket.createdAt
            ? Math.round(
                (new Date(ticket.lastStatusChangeAt) -
                  new Date(ticket.createdAt)) /
                  60000,
              )
            : null;
        const row = [
          ticket.ticketNumber,
          moment(ticket.createdAt).format("DD/MM/YYYY HH:mm"),
          ticket.pickedUpAt
            ? moment(ticket.pickedUpAt).format("DD/MM/YYYY HH:mm")
            : "-",
          responseTimeMinutes != null ? `${responseTimeMinutes} menit` : "-",
          closedAtText,
          durationMinutes != null ? `${durationMinutes} menit` : "-",
          pelaporText,
          ticket.description || "-",
        ];
        row.forEach((cell, i) => {
          const cellText = String(cell ?? "-");
          doc.text(
            cellText,
            50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            y,
            { width: colWidths[i], ellipsis: true },
          );
        });
        y += rowHeight;
      }

      await addVerificationSection(doc, req.user.fullName, y);
      doc.end();
    } catch (error) {
      console.error("Export PDF error (Technician):", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Formulir laporan masalah per tiket (PDF) – teknisi + admin
router.get(
  "/ticket/:id/form",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs", "admin"),
  logActivity,
  async (req, res) => {
    try {
      const ticket = await Ticket.findOne({
        where: { id: req.params.id, isActive: true },
        include: [
          {
            model: User,
            as: "assignedTechnician",
            attributes: ["id", "fullName"],
          },
          {
            model: CoAssignment,
            as: "coAssignments",
            include: [
              {
                model: User,
                as: "technician",
                attributes: ["id", "fullName"],
              },
            ],
          },
        ],
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const hasAccess =
        req.user.role === "admin" ||
        ticket.assignedTo === req.user.id ||
        ticket.coAssignments?.some((ca) => ca.technicianId === req.user.id) ||
        (ticket.status === "Baru" &&
          ((req.user.role === "teknisi_simrs" && ticket.category === "SIMRS") ||
            (req.user.role === "teknisi_ipsrs" &&
              ticket.category === "IPSRS"))) ||
        (req.user.role === "teknisi_simrs" && ticket.category === "SIMRS") ||
        (req.user.role === "teknisi_ipsrs" && ticket.category === "IPSRS");

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const pageWidth = 595;
      const leftMargin = 50;
      const rightMargin = 50;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=form-laporan-${ticket.ticketNumber || ticket.id}.pdf`,
      );
      doc.pipe(res);

      let y = drawLetterhead(doc);

      const titleSuffix =
        ticket.category === "SIMRS" ? " JARINGAN INFORMASI & SIMRS" : " IPSRS";
      const formTitle = "FORMULIR LAPORAN MASALAH" + titleSuffix;

      doc
        .fontSize(12)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(formTitle, leftMargin, y, {
          width: contentWidth,
          align: "center",
          underline: true,
        });
      y += 22;

      const labelFontSize = 10;
      const lineHeight = 16;
      const signatureBlankRows = 5;
      const signatureRowHeight = lineHeight;
      doc.fontSize(labelFontSize).font("Helvetica");

      const unitLabel = "UNIT KERJA INSTALASI:";
      doc.text(unitLabel, leftMargin, y);
      const unitValue = ticket.reporterUnit || "-";
      const unitX = leftMargin + 165;
      doc.text(unitValue, unitX, y);
      y += lineHeight;
      doc
        .strokeColor("#000000")
        .lineWidth(0.5)
        .moveTo(unitX, y - 2)
        .lineTo(pageWidth - rightMargin, y - 2)
        .stroke();
      y += 10;

      const tglLabel = "TANGGAL LAPORAN:";
      doc.text(tglLabel, leftMargin, y);
      const tglValue = moment(ticket.createdAt)
        .locale("id")
        .format("DD MMMM YYYY");
      doc.text(tglValue, leftMargin + 165, y);
      y += lineHeight;
      doc
        .moveTo(leftMargin + 165, y - 2)
        .lineTo(pageWidth - rightMargin, y - 2)
        .stroke();
      y += 14;

      doc.text("LAPORAN MASALAH:", leftMargin, y);
      y += lineHeight;
      const descText = ticket.description || "-";
      doc.font("Helvetica-Bold");
      const descTextH = doc.heightOfString(descText, { width: contentWidth });
      doc.text(descText, leftMargin, y, { width: contentWidth });
      doc.font("Helvetica");
      y += descTextH + 4;
      doc
        .moveTo(leftMargin, y)
        .lineTo(pageWidth - rightMargin, y)
        .stroke();
      y += 14;

      const sigBlockY = y;
      const colWidth = contentWidth / 2;
      const leftSignatureWidth = colWidth - 20;
      const rightSignatureWidth = colWidth;
      const sigTopLineY =
        sigBlockY + 12 + signatureBlankRows * signatureRowHeight;
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("DIKETAHUI", leftMargin, sigBlockY, {
        width: leftSignatureWidth,
        align: "center",
      });
      doc.text("KA. INSTALASI/KA. RUANGAN", leftMargin, sigBlockY + 12, {
        width: leftSignatureWidth,
        align: "center",
      });
      doc.font("Helvetica").fontSize(9);
      doc
        .moveTo(leftMargin, sigTopLineY)
        .lineTo(leftMargin + colWidth - 20, sigTopLineY)
        .stroke();

      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("DIBUAT OLEH", leftMargin + colWidth, sigBlockY, {
        width: rightSignatureWidth,
        align: "center",
      });
      doc.font("Helvetica").fontSize(9);
      doc
        .moveTo(leftMargin + colWidth, sigTopLineY)
        .lineTo(pageWidth - rightMargin, sigTopLineY)
        .stroke();

      y = sigTopLineY + 20;

      doc
        .strokeColor("#000000")
        .lineWidth(2)
        .moveTo(leftMargin, y)
        .lineTo(pageWidth - rightMargin, y)
        .stroke();
      y += 16;

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("HASIL PENINJAUAN", leftMargin, y, {
          width: contentWidth,
          align: "center",
          underline: true,
        });
      y += 22;
      doc.lineWidth(0.5);

      doc.fontSize(labelFontSize).font("Helvetica");
      doc.text("DITERIMA TANGGAL:", leftMargin, y);
      const diterimaAt = ticket.pickedUpAt
        ? moment(ticket.pickedUpAt).locale("id").format("DD MMMM YYYY")
        : moment(ticket.createdAt).locale("id").format("DD MMMM YYYY");
      doc.text(diterimaAt, leftMargin + 165, y);
      y += lineHeight;
      doc
        .moveTo(leftMargin + 165, y - 2)
        .lineTo(pageWidth - rightMargin, y - 2)
        .stroke();
      y += 10;

      doc.text("DIKERJAKAN OLEH:", leftMargin, y);
      const teknisiUtama = ticket.assignedTechnician?.fullName;
      const teknisiCo =
        ticket.coAssignments && ticket.coAssignments.length
          ? ticket.coAssignments
              .map((ca) => ca.technician?.fullName)
              .filter(Boolean)
          : [];
      const teknisiList = [
        ...(teknisiUtama ? [teknisiUtama] : []),
        ...teknisiCo,
      ];
      const dikerjakanOleh =
        teknisiList.length > 0 ? teknisiList.join(", ") : "-";
      doc.text(dikerjakanOleh, leftMargin + 165, y);
      y += lineHeight;
      doc
        .moveTo(leftMargin + 165, y - 2)
        .lineTo(pageWidth - rightMargin, y - 2)
        .stroke();
      y += 14;

      doc.text("HASIL PEKERJAAN:", leftMargin, y);
      y += lineHeight;
      const hasilText = ticket.workResult?.trim() || "-";
      doc.font("Helvetica-Bold");
      const hasilTextH = doc.heightOfString(hasilText, { width: contentWidth });
      doc.text(hasilText, leftMargin, y, { width: contentWidth });
      doc.font("Helvetica");
      y += hasilTextH + 4;
      doc
        .moveTo(leftMargin, y)
        .lineTo(pageWidth - rightMargin, y)
        .stroke();
      y += 22;

      const sigBottomY = y;
      const sigBottomLineY =
        sigBottomY + 12 + signatureBlankRows * signatureRowHeight;
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("DIKETAHUI", leftMargin, sigBottomY, {
        width: leftSignatureWidth,
        align: "center",
      });
      doc.text("KA. INSTALASI/KA. RUANGAN", leftMargin, sigBottomY + 12, {
        width: leftSignatureWidth,
        align: "center",
      });
      doc.font("Helvetica").fontSize(9);
      doc
        .moveTo(leftMargin, sigBottomLineY)
        .lineTo(leftMargin + colWidth - 20, sigBottomLineY)
        .stroke();

      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("PETUGAS", leftMargin + colWidth, sigBottomY, {
        width: rightSignatureWidth,
        align: "center",
      });
      doc.font("Helvetica").fontSize(9);
      doc
        .moveTo(leftMargin + colWidth, sigBottomLineY)
        .lineTo(pageWidth - rightMargin, sigBottomLineY)
        .stroke();
      doc.end();
    } catch (error) {
      console.error("Form PDF error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
