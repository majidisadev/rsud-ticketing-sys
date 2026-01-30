const express = require('express');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { TechnicianActivity, User, Ticket, CoAssignment } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logActivity = require('../middleware/activityLogger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { drawLetterhead, addVerificationSection } = require('../utils/pdfHelpers');

const router = express.Router();

// Shared: build report data for technician (activities + my tasks) with filters
async function getReportDataForTechnician(userId, filters) {
  const { status, dateFrom, dateTo, search } = filters;

  const activityWhere = { userId };
  if (status) activityWhere.status = status;
  if (dateFrom || dateTo) {
    activityWhere.currentDate = {};
    if (dateFrom) activityWhere.currentDate[Op.gte] = dateFrom;
    if (dateTo) activityWhere.currentDate[Op.lte] = dateTo;
  }
  if (search) activityWhere.title = { [Op.iLike]: `%${search}%` };

  const activities = await TechnicianActivity.findAll({
    where: activityWhere,
    order: [['currentDate', 'DESC']]
  });

  const coAssignments = await CoAssignment.findAll({
    where: { technicianId: userId },
    attributes: ['ticketId']
  });
  const coAssignedTicketIds = coAssignments.map(ca => ca.ticketId);

  const ticketWhere = {
    isActive: true,
    [Op.or]: [
      { assignedTo: userId },
      { id: { [Op.in]: coAssignedTicketIds } }
    ]
  };
  if (status) {
    const ticketStatusMap = { diproses: 'Diproses', selesai: 'Selesai', batal: 'Batal' };
    if (ticketStatusMap[status]) ticketWhere.status = ticketStatusMap[status];
  }
  if (dateFrom || dateTo) {
    ticketWhere.createdAt = {};
    if (dateFrom) ticketWhere.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) ticketWhere.createdAt[Op.lte] = new Date(dateTo + 'T23:59:59');
  }
  if (search) ticketWhere.description = { [Op.iLike]: `%${search}%` };

  const tickets = await Ticket.findAll({
    where: ticketWhere,
    order: [['createdAt', 'DESC']]
  });

  const reportData = [
    ...activities.map(a => ({
      id: `activity-${a.id}`,
      type: 'activity',
      date: a.currentDate,
      title: a.title,
      status: a.status,
      ticketNumber: null
    })),
    ...tickets.map(t => ({
      id: `ticket-${t.id}`,
      type: 'ticket',
      date: t.createdAt.toISOString().split('T')[0],
      title: t.description,
      status: t.status.toLowerCase() === 'baru' ? 'diproses' : t.status.toLowerCase(),
      ticketNumber: t.ticketNumber
    }))
  ];
  reportData.sort((a, b) => new Date(b.date) - new Date(a.date));
  return reportData;
}

// Get activities for technician (own activities only)
// Tanpa carryover: aktivitas tanggal lalu tetap di tanggal tersebut, tidak ditampilkan di hari ini
router.get('/', authenticate, authorize('teknisi_simrs', 'teknisi_ipsrs'), async (req, res) => {
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
      order: [['startTime', 'DESC']]
    });

    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get calendar dates with activities (for dot indicators)
router.get('/calendar-dates', authenticate, authorize('teknisi_simrs', 'teknisi_ipsrs'), async (req, res) => {
  try {
    const { month, year, search } = req.query;
    
    const where = { userId: req.user.id };
    
    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      where.currentDate = { [Op.between]: [startDate, endDate] };
    }

    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }

    const activities = await TechnicianActivity.findAll({
      where,
      attributes: ['currentDate', 'status'],
      raw: true
    });

    const toDateStr = (d) => {
      if (!d) return '';
      const s = typeof d === 'string' ? d : (d.toISOString ? d.toISOString().slice(0, 10) : String(d));
      return s.slice(0, 10);
    };

    const byDate = {};
    activities.forEach((a) => {
      const dateStr = toDateStr(a.currentDate);
      if (!dateStr) return;
      if (!byDate[dateStr]) byDate[dateStr] = { diproses: false, selesaiBatal: false };
      if (a.status === 'diproses') byDate[dateStr].diproses = true;
      else if (['selesai', 'batal'].includes(a.status)) byDate[dateStr].selesaiBatal = true;
    });

    const datesWithDiproses = [];
    const datesWithOnlySelesaiBatal = [];
    Object.entries(byDate).forEach(([dateStr, flags]) => {
      if (flags.diproses) datesWithDiproses.push(dateStr);
      else if (flags.selesaiBatal) datesWithOnlySelesaiBatal.push(dateStr);
    });

    res.json({ datesWithDiproses, datesWithOnlySelesaiBatal });
  } catch (error) {
    console.error('Get calendar dates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get report data (activities + my tasks combined)
router.get('/report', authenticate, authorize('teknisi_simrs', 'teknisi_ipsrs'), async (req, res) => {
  try {
    const filters = {
      status: req.query.status || '',
      dateFrom: req.query.dateFrom || '',
      dateTo: req.query.dateTo || '',
      search: req.query.search || ''
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
        return w;
      })(),
      order: [['currentDate', 'DESC']]
    });
    const coAssignments = await CoAssignment.findAll({
      where: { technicianId: req.user.id },
      attributes: ['ticketId']
    });
    const coAssignedTicketIds = coAssignments.map(ca => ca.ticketId);
    const ticketWhere = {
      isActive: true,
      [Op.or]: [
        { assignedTo: req.user.id },
        { id: { [Op.in]: coAssignedTicketIds } }
      ]
    };
    if (filters.status) {
      const m = { diproses: 'Diproses', selesai: 'Selesai', batal: 'Batal' };
      if (m[filters.status]) ticketWhere.status = m[filters.status];
    }
    if (filters.dateFrom || filters.dateTo) {
      ticketWhere.createdAt = {};
      if (filters.dateFrom) ticketWhere.createdAt[Op.gte] = new Date(filters.dateFrom);
      if (filters.dateTo) ticketWhere.createdAt[Op.lte] = new Date(filters.dateTo + 'T23:59:59');
    }
    if (filters.search) ticketWhere.description = { [Op.iLike]: `%${filters.search}%` };
    const tickets = await Ticket.findAll({
      where: ticketWhere,
      order: [['createdAt', 'DESC']]
    });
    const reportData = [
      ...activities.map(a => ({
        id: `activity-${a.id}`,
        type: 'activity',
        date: a.currentDate,
        title: a.title,
        status: a.status,
        startTime: a.startTime,
        endTime: a.endTime
      })),
      ...tickets.map(t => ({
        id: `ticket-${t.id}`,
        type: 'ticket',
        date: t.createdAt.toISOString().split('T')[0],
        title: t.description,
        status: t.status.toLowerCase() === 'baru' ? 'diproses' : t.status.toLowerCase(),
        ticketNumber: t.ticketNumber
      }))
    ];
    reportData.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(reportData);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export report to Excel (filter affects result)
router.get(
  '/report/export/excel',
  authenticate,
  authorize('teknisi_simrs', 'teknisi_ipsrs'),
  logActivity,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status || '',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        search: req.query.search || ''
      };
      const reportData = await getReportDataForTechnician(req.user.id, filters);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Aktivitas');

      worksheet.columns = [
        { header: 'Tanggal', key: 'date', width: 14 },
        { header: 'Judul Aktivitas / Deskripsi Masalah', key: 'title', width: 45 },
        { header: 'Tipe', key: 'typeLabel', width: 12 },
        { header: 'Status', key: 'statusLabel', width: 12 }
      ];
      worksheet.getRow(1).font = { bold: true };

      const statusLabels = { diproses: 'Diproses', selesai: 'Selesai', batal: 'Batal' };
      reportData.forEach((item) => {
        const dateStr = item.date ? moment(item.date).format('DD/MM/YYYY') : '-';
        const titleStr = (item.title || '-') + (item.ticketNumber ? ` (${item.ticketNumber})` : '');
        worksheet.addRow({
          date: dateStr,
          title: titleStr,
          typeLabel: item.type === 'activity' ? 'Aktivitas' : 'Tugas',
          statusLabel: statusLabels[item.status] || item.status
        });
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        "attachment; filename=laporan-aktivitas.xlsx"
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export Excel (activities report) error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Export report to PDF (kop surat, kota & tanggal, QR, nama teknisi)
router.get(
  '/report/export/pdf',
  authenticate,
  authorize('teknisi_simrs', 'teknisi_ipsrs'),
  logActivity,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status || '',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        search: req.query.search || ''
      };
      const reportData = await getReportDataForTechnician(req.user.id, filters);

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=laporan-aktivitas.pdf'
      );
      doc.pipe(res);

      const contentStartY = drawLetterhead(doc);
      doc.y = contentStartY;

      doc.fontSize(20).fillColor('#000000').font('Helvetica-Bold').text('Laporan Aktivitas Saya', { align: 'center' });
      doc.moveDown();

      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [70, 180, 70, 70];
      const headers = ['Tanggal', 'Judul / Deskripsi', 'Tipe', 'Status'];

      let y = tableTop;
      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((header, i) => {
        doc.text(
          header,
          50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
          y,
          { width: colWidths[i], ellipsis: true }
        );
      });
      y += rowHeight;

      const statusLabels = { diproses: 'Diproses', selesai: 'Selesai', batal: 'Batal' };
      doc.font('Helvetica').fontSize(8);
      reportData.forEach((item) => {
        if (y > 700) {
          doc.addPage();
          const newPageY = drawLetterhead(doc);
          y = newPageY + 10;
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
          headers.forEach((header, i) => {
            doc.text(
              header,
              50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
              y,
              { width: colWidths[i], ellipsis: true }
            );
          });
          y += rowHeight;
          doc.font('Helvetica').fontSize(8).fillColor('#000000');
        }

        const dateStr = item.date ? moment(item.date).format('DD/MM/YYYY') : '-';
        const titleStr = (item.title || '-').substring(0, 80) + ((item.title || '').length > 80 ? '...' : '');
        const typeStr = item.type === 'activity' ? 'Aktivitas' : 'Tugas';
        const statusStr = statusLabels[item.status] || item.status;

        [dateStr, titleStr, typeStr, statusStr].forEach((cell, i) => {
          doc.text(
            cell,
            50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            y,
            { width: colWidths[i], ellipsis: true }
          );
        });
        y += rowHeight;
      });

      await addVerificationSection(doc, req.user.fullName, y);
      doc.end();
    } catch (error) {
      console.error('Export PDF (activities report) error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Helper: get combined activities + tickets for admin (filter affects result, no pagination)
async function getCombinedDataForAdmin(filters) {
  const { dateFrom, dateTo, search, technicianId } = filters;

  const activityWhere = {};
  if (dateFrom || dateTo) {
    activityWhere.currentDate = {};
    if (dateFrom) activityWhere.currentDate[Op.gte] = dateFrom;
    if (dateTo) activityWhere.currentDate[Op.lte] = dateTo;
  }
  if (search) activityWhere.title = { [Op.iLike]: `%${search}%` };
  if (technicianId) activityWhere.userId = technicianId;

  const activities = await TechnicianActivity.findAll({
    where: activityWhere,
    include: [{ model: User, as: 'technician', attributes: ['id', 'fullName', 'username'] }],
    order: [['currentDate', 'DESC'], ['startTime', 'DESC']]
  });

  const ticketWhere = { isActive: true };
  if (dateFrom || dateTo) {
    ticketWhere.createdAt = {};
    if (dateFrom) ticketWhere.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) ticketWhere.createdAt[Op.lte] = new Date(dateTo + 'T23:59:59');
  }
  if (search) ticketWhere.description = { [Op.iLike]: `%${search}%` };
  if (technicianId) {
    const coRows = await CoAssignment.findAll({
      where: { technicianId },
      attributes: ['ticketId']
    });
    const coTicketIds = coRows.map(c => c.ticketId);
    ticketWhere[Op.or] = [
      { assignedTo: technicianId },
      { id: { [Op.in]: coTicketIds.length ? coTicketIds : [0] } }
    ];
  }

  const tickets = await Ticket.findAll({
    where: ticketWhere,
    include: [
      { model: User, as: 'assignedTechnician', attributes: ['id', 'fullName', 'username'] },
      { model: CoAssignment, as: 'coAssignments', include: [{ model: User, as: 'technician', attributes: ['id', 'fullName', 'username'] }] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const activityRows = activities.map(a => ({
    id: `activity-${a.id}`,
    type: 'activity',
    date: a.currentDate,
    title: a.title,
    status: a.status,
    technicianDisplay: a.technician ? a.technician.fullName : '-',
    ticketNumber: null
  }));

  const ticketRows = tickets.map(t => {
    const main = t.assignedTechnician ? t.assignedTechnician.fullName : '';
    const coNames = (t.coAssignments || []).map(c => c.technician && c.technician.fullName).filter(Boolean);
    const technicianDisplay = main ? (coNames.length ? `${main}, Co: ${coNames.join(', ')}` : main) : (coNames.length ? `Co: ${coNames.join(', ')}` : '-');
    return {
      id: `ticket-${t.id}`,
      type: 'ticket',
      date: t.createdAt.toISOString().split('T')[0],
      title: t.description,
      status: (t.status === 'Baru' ? 'diproses' : t.status.toLowerCase()),
      technicianDisplay,
      ticketNumber: t.ticketNumber
    };
  });

  const combined = [...activityRows, ...ticketRows];
  combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  return combined;
}

// Get all activities (admin only - read only)
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
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
      include: [{
        model: User,
        as: 'technician',
        attributes: ['id', 'fullName', 'username', 'role']
      }],
      order: [['currentDate', 'DESC'], ['startTime', 'DESC']]
    });

    res.json(activities);
  } catch (error) {
    console.error('Get all activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all activities + tickets combined (admin only) – for table: Teknisi, Tanggal, Judul/Deskripsi, Tipe, Status
router.get('/all-combined', authenticate, authorize('admin'), async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.dateFrom || '',
      dateTo: req.query.dateTo || '',
      search: req.query.search || '',
      technicianId: req.query.technicianId || ''
    };
    const combined = await getCombinedDataForAdmin(filters);
    res.json(combined);
  } catch (error) {
    console.error('Get all-combined error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export all-combined to Excel (admin only; filter affects result, no pagination)
router.get(
  '/all-combined/export/excel',
  authenticate,
  authorize('admin'),
  logActivity,
  async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        search: req.query.search || '',
        technicianId: req.query.technicianId || ''
      };
      const data = await getCombinedDataForAdmin(filters);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Semua Aktivitas');

      worksheet.columns = [
        { header: 'Teknisi', key: 'technicianDisplay', width: 35 },
        { header: 'Tanggal', key: 'date', width: 14 },
        { header: 'Judul Aktivitas / Deskripsi Masalah', key: 'title', width: 45 },
        { header: 'Tipe', key: 'typeLabel', width: 12 },
        { header: 'Status', key: 'statusLabel', width: 12 }
      ];
      worksheet.getRow(1).font = { bold: true };

      const statusLabels = { diproses: 'Diproses', selesai: 'Selesai', batal: 'Batal' };
      data.forEach((item) => {
        const dateStr = item.date ? moment(item.date).format('DD/MM/YYYY') : '-';
        const titleStr = (item.title || '-') + (item.ticketNumber ? ` (${item.ticketNumber})` : '');
        const techStr = (item.technicianDisplay || '-').replace(/, Co: /g, ', ');
        worksheet.addRow({
          technicianDisplay: techStr,
          date: dateStr,
          title: titleStr,
          typeLabel: item.type === 'activity' ? 'Aktivitas' : 'Tugas',
          statusLabel: statusLabels[item.status] || item.status
        });
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=semua-aktivitas.xlsx'
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export Excel (all-combined) error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Export all-combined to PDF (admin only; kop surat, kota & tanggal, QR, nama pemohon)
router.get(
  '/all-combined/export/pdf',
  authenticate,
  authorize('admin'),
  logActivity,
  async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        search: req.query.search || '',
        technicianId: req.query.technicianId || ''
      };
      const data = await getCombinedDataForAdmin(filters);

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=semua-aktivitas.pdf'
      );
      doc.pipe(res);

      const contentStartY = drawLetterhead(doc);
      doc.y = contentStartY;

      doc.fontSize(20).fillColor('#000000').font('Helvetica-Bold').text('Laporan Semua Aktivitas', { align: 'center' });
      doc.moveDown();

      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [70, 65, 200, 60, 60];
      const headers = ['Teknisi', 'Tanggal', 'Judul / Deskripsi', 'Tipe', 'Status'];

      let y = tableTop;
      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((header, i) => {
        doc.text(
          header,
          50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
          y,
          { width: colWidths[i], ellipsis: true }
        );
      });
      y += rowHeight;

      const statusLabels = { diproses: 'Diproses', selesai: 'Selesai', batal: 'Batal' };
      doc.font('Helvetica').fontSize(8);
      data.forEach((item) => {
        if (y > 700) {
          doc.addPage();
          const newPageY = drawLetterhead(doc);
          y = newPageY + 10;
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
          headers.forEach((header, i) => {
            doc.text(
              header,
              50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
              y,
              { width: colWidths[i], ellipsis: true }
            );
          });
          y += rowHeight;
          doc.font('Helvetica').fontSize(8).fillColor('#000000');
        }

        const techStr = ((item.technicianDisplay || '-').replace(/, Co: /g, ', ')).substring(0, 25) + ((item.technicianDisplay || '').length > 25 ? '...' : '');
        const dateStr = item.date ? moment(item.date).format('DD/MM/YYYY') : '-';
        const titleStr = (item.title || '-').substring(0, 60) + ((item.title || '').length > 60 ? '...' : '');
        const typeStr = item.type === 'activity' ? 'Aktivitas' : 'Tugas';
        const statusStr = statusLabels[item.status] || item.status;

        [techStr, dateStr, titleStr, typeStr, statusStr].forEach((cell, i) => {
          doc.text(
            cell,
            50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            y,
            { width: colWidths[i], ellipsis: true }
          );
        });
        y += rowHeight;
      });

      await addVerificationSection(doc, req.user.fullName, y);
      doc.end();
    } catch (error) {
      console.error('Export PDF (all-combined) error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Create activity (currentDate = tanggal dipilih di kalender, default hari ini)
router.post('/', 
  authenticate, 
  authorize('teknisi_simrs', 'teknisi_ipsrs'),
  [
    body('title').notEmpty().withMessage('Judul aktivitas required'),
    body('currentDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Tanggal harus format YYYY-MM-DD')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const currentDate = req.body.currentDate || new Date().toISOString().split('T')[0];
      
      const activity = await TechnicianActivity.create({
        userId: req.user.id,
        title: req.body.title,
        status: 'diproses',
        startTime: new Date(),
        currentDate
      });

      res.status(201).json(activity);
    } catch (error) {
      console.error('Create activity error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update activity
router.put('/:id',
  authenticate,
  authorize('teknisi_simrs', 'teknisi_ipsrs'),
  [
    body('title').optional().notEmpty().withMessage('Judul tidak boleh kosong'),
    body('status').optional().isIn(['diproses', 'selesai', 'batal']).withMessage('Status tidak valid')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const activity = await TechnicianActivity.findByPk(req.params.id);

      if (!activity) {
        return res.status(404).json({ message: 'Aktivitas tidak ditemukan' });
      }

      // Check ownership
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: 'Akses ditolak' });
      }

      // Update fields
      if (req.body.title) {
        activity.title = req.body.title;
      }

      if (req.body.status) {
        const oldStatus = activity.status;
        activity.status = req.body.status;
        
        // Set endTime when changing to selesai or batal
        if (oldStatus === 'diproses' && ['selesai', 'batal'].includes(req.body.status)) {
          activity.endTime = new Date();
        }
        
        // Clear endTime if moving back to diproses
        if (req.body.status === 'diproses' && oldStatus !== 'diproses') {
          activity.endTime = null;
        }
      }

      await activity.save();

      res.json(activity);
    } catch (error) {
      console.error('Update activity error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update activity status only (for drag and drop)
router.patch('/:id/status',
  authenticate,
  authorize('teknisi_simrs', 'teknisi_ipsrs'),
  [
    body('status').isIn(['diproses', 'selesai', 'batal']).withMessage('Status tidak valid')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const activity = await TechnicianActivity.findByPk(req.params.id);

      if (!activity) {
        return res.status(404).json({ message: 'Aktivitas tidak ditemukan' });
      }

      // Check ownership
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: 'Akses ditolak' });
      }

      const oldStatus = activity.status;
      activity.status = req.body.status;
      
      // Set endTime when changing to selesai or batal
      if (oldStatus === 'diproses' && ['selesai', 'batal'].includes(req.body.status)) {
        activity.endTime = new Date();
      }
      
      // Clear endTime if moving back to diproses
      if (req.body.status === 'diproses' && oldStatus !== 'diproses') {
        activity.endTime = null;
      }

      await activity.save();

      res.json(activity);
    } catch (error) {
      console.error('Update activity status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete activity
router.delete('/:id',
  authenticate,
  authorize('teknisi_simrs', 'teknisi_ipsrs'),
  async (req, res) => {
    try {
      const activity = await TechnicianActivity.findByPk(req.params.id);

      if (!activity) {
        return res.status(404).json({ message: 'Aktivitas tidak ditemukan' });
      }

      // Check ownership
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: 'Akses ditolak' });
      }

      await activity.destroy();

      res.json({ message: 'Aktivitas berhasil dihapus' });
    } catch (error) {
      console.error('Delete activity error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
