const express = require("express");
const { Op } = require("sequelize");
const { Ticket, User, CoAssignment } = require("../models");
const { authenticate, authorize } = require("../middleware/auth");
const logActivity = require("../middleware/activityLogger");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

const router = express.Router();

// Helper function to draw letterhead
function drawLetterhead(doc) {
  const pageWidth = doc.page.width;
  const leftMargin = 50;
  const rightMargin = 50;
  const topMargin = 30;
  
  // Save current position
  const startY = topMargin;
  
  // Logo (left side)
  const logoSize = 60;
  
  // Try to find logo file with different extensions
  const logoExtensions = ['.png', '.jpg', '.jpeg'];
  let logoPath = null;
  
  for (const ext of logoExtensions) {
    const testPath = path.join(__dirname, `../assets/logo${ext}`);
    if (fs.existsSync(testPath)) {
      logoPath = testPath;
      break;
    }
  }
  
  // Check if logo file exists and draw it, otherwise use placeholder
  if (logoPath) {
    try {
      doc.image(logoPath, leftMargin, startY, { 
        width: logoSize, 
        height: logoSize,
        fit: [logoSize, logoSize],
        align: 'center'
      });
    } catch (error) {
      console.error('Error loading logo:', error);
      // Fallback to placeholder if image fails to load
      doc
        .rect(leftMargin, startY, logoSize, logoSize)
        .lineWidth(1)
        .stroke('#cccccc');
      doc
        .fontSize(8)
        .fillColor('#999999')
        .text('LOGO', leftMargin + 15, startY + 26, { width: logoSize, align: 'center' });
    }
  } else {
    // Draw placeholder if logo file doesn't exist
    doc
      .rect(leftMargin, startY, logoSize, logoSize)
      .lineWidth(1)
      .stroke('#cccccc');
    doc
      .fontSize(8)
      .fillColor('#999999')
      .text('LOGO', leftMargin + 15, startY + 26, { width: logoSize, align: 'center' });
  }
  
  // Text content (centered across full width)
  const textLeftMargin = leftMargin;
  const textWidth = pageWidth - leftMargin - rightMargin;
  
  // Line 1: PEMERINTAH KOTA X
  doc
    .fontSize(11)
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .text('PEMERINTAH KOTA X', textLeftMargin, startY, { 
      width: textWidth, 
      align: 'center' 
    });
  
  // Line 2: RSUD KOTA X (largest text)
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('RSUD KOTA X', textLeftMargin, startY + 14, { 
      width: textWidth, 
      align: 'center' 
    });
  
  // Line 3: Address
  doc
    .fontSize(9)
    .font('Helvetica')
    .text('Jl. Raya RT.0/RW.0. City, Province', 
      textLeftMargin, startY + 35, { 
      width: textWidth, 
      align: 'center' 
    });
  
  // Line 4: Phone
  doc
    .fontSize(9)
    .font('Helvetica')
    .text('Telp. (0123) 4567890', textLeftMargin, startY + 48, { 
      width: textWidth, 
      align: 'center' 
    });
  
  // Double horizontal line separator
  const lineY = startY + logoSize + 10;
  doc
    .strokeColor('#000000')
    .lineWidth(2)
    .moveTo(leftMargin, lineY)
    .lineTo(pageWidth - rightMargin, lineY)
    .stroke();
  
  doc
    .strokeColor('#000000')
    .lineWidth(0.5)
    .moveTo(leftMargin, lineY + 3)
    .lineTo(pageWidth - rightMargin, lineY + 3)
    .stroke();
  
  // Return the Y position after letterhead for content to continue
  return lineY + 15;
}

// Helper function to add verification section with QR code
async function addVerificationSection(doc, exporterName, yPosition) {
  const pageWidth = doc.page.width;
  const leftMargin = 50;
  const rightMargin = 50;
  const qrSize = 70; // Smaller QR code size
  
  // Add some space before verification section
  let y = yPosition + 30;
  
  // Check if we need a new page
  if (y > 650) {
    doc.addPage();
    y = 50;
  }
  
  // Location and date - aligned to the right
  const exportDate = moment().locale('id').format('DD MMMM YYYY');
  const cityName = "Kota X"; // Ganti dengan nama kota yang sesuai
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#000000')
    .text(`${cityName}, ${exportDate}`, leftMargin, y, { 
      width: pageWidth - leftMargin - rightMargin,
      align: 'right' 
    });
  
  y += 30;
  
  // Generate QR Code
  const qrText = "Laporan ini telah diverifikasi, tercatat secara resmi pada sistem ticketing, dan dinyatakan VALID";
  
  try {
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrText, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
    
    // Calculate position for right alignment
    const qrXPosition = pageWidth - rightMargin - qrSize;
    
    // Draw QR code on the right
    doc.image(qrCodeDataURL, qrXPosition, y, { 
      width: qrSize, 
      height: qrSize 
    });
    
    // Add exporter name below QR code (centered under QR)
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(exporterName, qrXPosition, y + qrSize + 5, { 
        width: qrSize,
        align: 'center',
        underline: true 
      });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback if QR generation fails
    doc
      .fontSize(9)
      .font('Helvetica')
      .text('(QR Code tidak dapat di-generate)', leftMargin, y, {
        width: pageWidth - leftMargin - rightMargin,
        align: 'right'
      });
  }
  
  return y + qrSize + 30; // Return new Y position after verification section
}

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
  }
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
              {
                model: User,
                as: "technician",
                attributes: ["id", "fullName"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Tiket");

      worksheet.columns = [
        { header: "Kategori", key: "category", width: 10 },
        { header: "Nomor Tiket", key: "ticketNumber", width: 20 },
        { header: "Tanggal Masuk", key: "createdAt", width: 20 },
        { header: "Pelapor", key: "reporterName", width: 20 },
        { header: "Asal Unit", key: "reporterUnit", width: 20 },
        { header: "Teknisi", key: "technician", width: 20 },
        { header: "Deskripsi Masalah", key: "description", width: 50 },
        { header: "Status", key: "status", width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };

      tickets.forEach((ticket) => {
        // Combine assigned technician and co-assigned technicians
        const technicians = [];
        if (ticket.assignedTechnician?.fullName) {
          technicians.push(ticket.assignedTechnician.fullName);
        }
        if (ticket.coAssignments && ticket.coAssignments.length > 0) {
          ticket.coAssignments.forEach((ca) => {
            if (ca.technician?.fullName) {
              technicians.push(ca.technician.fullName);
            }
          });
        }
        const technicianText =
          technicians.length > 0 ? technicians.join(", ") : "-";

        worksheet.addRow({
          category: ticket.category,
          ticketNumber: ticket.ticketNumber,
          createdAt: moment(ticket.createdAt).format("YYYY-MM-DD HH:mm:ss"),
          reporterName: ticket.reporterName,
          reporterUnit: ticket.reporterUnit,
          technician: technicianText,
          description: ticket.description || "-",
          status: ticket.status || "-",
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=laporan-tiket.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export Excel error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
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
              {
                model: User,
                as: "technician",
                attributes: ["id", "fullName"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=laporan-tiket.pdf"
      );

      doc.pipe(res);

      // Draw letterhead
      const contentStartY = drawLetterhead(doc);
      
      // Move to position after letterhead
      doc.y = contentStartY;

      // Header
      doc.fontSize(20).fillColor('#000000').font('Helvetica-Bold').text("Laporan Tiket", { align: "center" });
      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [50, 80, 70, 70, 70, 70, 120];
      const headers = [
        "Kategori",
        "Nomor Tiket",
        "Tanggal Masuk",
        "Pelapor",
        "Asal Unit",
        "Teknisi",
        "Deskripsi Masalah",
      ];

      let y = tableTop;
      doc.fontSize(9).font("Helvetica-Bold");
      headers.forEach((header, i) => {
        doc.text(
          header,
          50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
          y,
          { width: colWidths[i], ellipsis: true }
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
          doc.fontSize(9).font("Helvetica-Bold").fillColor('#000000');
          headers.forEach((header, i) => {
            doc.text(
              header,
              50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
              y,
              { width: colWidths[i], ellipsis: true }
            );
          });
          y += rowHeight;
          doc.font("Helvetica").fontSize(8).fillColor('#000000');
        }

        // Combine assigned technician and co-assigned technicians
        const technicians = [];
        if (ticket.assignedTechnician?.fullName) {
          technicians.push(ticket.assignedTechnician.fullName);
        }
        if (ticket.coAssignments && ticket.coAssignments.length > 0) {
          ticket.coAssignments.forEach((ca) => {
            if (ca.technician?.fullName) {
              technicians.push(ca.technician.fullName);
            }
          });
        }
        const technicianText =
          technicians.length > 0 ? technicians.join(", ") : "-";

        const row = [
          ticket.category,
          ticket.ticketNumber,
          moment(ticket.createdAt).format("DD/MM/YYYY HH:mm"),
          ticket.reporterName,
          ticket.reporterUnit,
          technicianText,
          ticket.description || "-",
        ];

        row.forEach((cell, i) => {
          const cellText = cell || "-";
          doc.text(
            cellText,
            50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            y,
            { width: colWidths[i], ellipsis: true }
          );
        });

        y += rowHeight;
      });

      // Add verification section
      await addVerificationSection(doc, req.user.fullName, y);

      doc.end();
    } catch (error) {
      console.error("Export PDF error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Export to Excel for Technician (My Tasks)
router.get(
  "/export/technician/excel",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  logActivity,
  async (req, res) => {
    try {
      const technicianId = req.user.id;
      const { status, search } = req.query;

      // Get co-assigned ticket IDs
      const coAssignments = await CoAssignment.findAll({
        where: { technicianId: technicianId },
        attributes: ["ticketId"],
      });
      const coAssignedTicketIds = coAssignments.map((ca) => ca.ticketId);

      const where = {
        isActive: true,
        [Op.or]: [
          { assignedTo: technicianId },
          { id: { [Op.in]: coAssignedTicketIds } },
        ],
      };

      if (status) {
        where.status = status;
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
              {
                model: User,
                as: "technician",
                attributes: ["id", "fullName"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Tugas Saya");

      worksheet.columns = [
        { header: "Kategori", key: "category", width: 10 },
        { header: "Nomor Tiket", key: "ticketNumber", width: 20 },
        { header: "Tanggal Masuk", key: "createdAt", width: 20 },
        { header: "Pelapor", key: "reporterName", width: 20 },
        { header: "Asal Unit", key: "reporterUnit", width: 20 },
        { header: "Teknisi", key: "technician", width: 20 },
        { header: "Deskripsi Masalah", key: "description", width: 50 },
        { header: "Status", key: "status", width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };

      tickets.forEach((ticket) => {
        // Combine assigned technician and co-assigned technicians
        const technicians = [];
        if (ticket.assignedTechnician?.fullName) {
          technicians.push(ticket.assignedTechnician.fullName);
        }
        if (ticket.coAssignments && ticket.coAssignments.length > 0) {
          ticket.coAssignments.forEach((ca) => {
            if (ca.technician?.fullName) {
              technicians.push(ca.technician.fullName);
            }
          });
        }
        const technicianText =
          technicians.length > 0 ? technicians.join(", ") : "-";

        worksheet.addRow({
          category: ticket.category,
          ticketNumber: ticket.ticketNumber,
          createdAt: moment(ticket.createdAt).format("YYYY-MM-DD HH:mm:ss"),
          reporterName: ticket.reporterName,
          reporterUnit: ticket.reporterUnit,
          technician: technicianText,
          description: ticket.description || "-",
          status: ticket.status || "-",
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tugas-saya.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export Excel error (Technician):", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Export to PDF for Technician (My Tasks)
router.get(
  "/export/technician/pdf",
  authenticate,
  authorize("teknisi_simrs", "teknisi_ipsrs"),
  logActivity,
  async (req, res) => {
    try {
      const technicianId = req.user.id;
      const { status, search } = req.query;

      // Get co-assigned ticket IDs
      const coAssignments = await CoAssignment.findAll({
        where: { technicianId: technicianId },
        attributes: ["ticketId"],
      });
      const coAssignedTicketIds = coAssignments.map((ca) => ca.ticketId);

      const where = {
        isActive: true,
        [Op.or]: [
          { assignedTo: technicianId },
          { id: { [Op.in]: coAssignedTicketIds } },
        ],
      };

      if (status) {
        where.status = status;
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
              {
                model: User,
                as: "technician",
                attributes: ["id", "fullName"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tugas-saya.pdf"
      );

      doc.pipe(res);

      // Draw letterhead
      const contentStartY = drawLetterhead(doc);
      
      // Move to position after letterhead
      doc.y = contentStartY;

      // Header
      doc.fontSize(20).fillColor('#000000').font('Helvetica-Bold').text("Laporan Tugas Saya", { align: "center" });
      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [50, 80, 70, 70, 70, 120];
      const headers = [
        "Kategori",
        "Nomor Tiket",
        "Tanggal",
        "Pelapor",
        "Unit",
        "Deskripsi",
      ];

      let y = tableTop;
      doc.fontSize(9).font("Helvetica-Bold");
      headers.forEach((header, i) => {
        doc.text(
          header,
          50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
          y,
          { width: colWidths[i], ellipsis: true }
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
          doc.fontSize(9).font("Helvetica-Bold").fillColor('#000000');
          headers.forEach((header, i) => {
            doc.text(
              header,
              50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
              y,
              { width: colWidths[i], ellipsis: true }
            );
          });
          y += rowHeight;
          doc.font("Helvetica").fontSize(8).fillColor('#000000');
        }

        const row = [
          ticket.category,
          ticket.ticketNumber,
          moment(ticket.createdAt).format("DD/MM/YYYY"),
          ticket.reporterName,
          ticket.reporterUnit,
          ticket.description || "-",
        ];

        row.forEach((cell, i) => {
          const cellText = cell || "-";
          doc.text(
            cellText,
            50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            y,
            { width: colWidths[i], ellipsis: true }
          );
        });

        y += rowHeight;
      });

      // Add verification section
      await addVerificationSection(doc, req.user.fullName, y);

      doc.end();
    } catch (error) {
      console.error("Export PDF error (Technician):", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
