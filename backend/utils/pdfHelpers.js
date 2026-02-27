const moment = require("moment");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

/**
 * Draw letterhead (kop surat) on PDF document.
 * @param {PDFKit.PDFDocument} doc - PDF document
 * @returns {number} Y position after letterhead for content to continue
 */
function drawLetterhead(doc) {
  const pageWidth = doc.page.width;
  const leftMargin = 50;
  const rightMargin = 50;
  const topMargin = 30;

  const startY = topMargin;
  const logoSize = 60;

  const logoExtensions = [".png", ".jpg", ".jpeg"];
  let logoPath = null;

  for (const ext of logoExtensions) {
    const testPath = path.join(__dirname, `../assets/logo${ext}`);
    if (fs.existsSync(testPath)) {
      logoPath = testPath;
      break;
    }
  }

  if (logoPath) {
    try {
      doc.image(logoPath, leftMargin, startY, {
        width: logoSize,
        height: logoSize,
        fit: [logoSize, logoSize],
        align: "center",
      });
    } catch (error) {
      console.error("Error loading logo:", error);
      doc
        .rect(leftMargin, startY, logoSize, logoSize)
        .lineWidth(1)
        .stroke("#cccccc");
      doc
        .fontSize(8)
        .fillColor("#999999")
        .text("LOGO", leftMargin + 15, startY + 26, {
          width: logoSize,
          align: "center",
        });
    }
  } else {
    doc
      .rect(leftMargin, startY, logoSize, logoSize)
      .lineWidth(1)
      .stroke("#cccccc");
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text("LOGO", leftMargin + 15, startY + 26, {
        width: logoSize,
        align: "center",
      });
  }

  const textLeftMargin = leftMargin;
  const textWidth = pageWidth - leftMargin - rightMargin;

  doc
    .fontSize(11)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text("PEMERINTAH KOTA SERANG", textLeftMargin, startY, {
      width: textWidth,
      align: "center",
    });

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("UPTD RSUD KOTA SERANG", textLeftMargin, startY + 14, {
      width: textWidth,
      align: "center",
    });

  doc
    .fontSize(9)
    .font("Helvetica")
    .text(
      "Jl. Raya Jakarta Km.4 Lingkungan Kp.Baru RT.02/RW/11. Serang, Banten",
      textLeftMargin,
      startY + 35,
      {
        width: textWidth,
        align: "center",
      },
    );

  doc
    .fontSize(9)
    .font("Helvetica")
    .text("Telp. (0254) 7932007", textLeftMargin, startY + 48, {
      width: textWidth,
      align: "center",
    });

  const lineY = startY + logoSize + 10;
  doc
    .strokeColor("#000000")
    .lineWidth(2)
    .moveTo(leftMargin, lineY)
    .lineTo(pageWidth - rightMargin, lineY)
    .stroke();

  doc
    .strokeColor("#000000")
    .lineWidth(0.5)
    .moveTo(leftMargin, lineY + 3)
    .lineTo(pageWidth - rightMargin, lineY + 3)
    .stroke();

  return lineY + 15;
}

/**
 * Add verification section with city, date, QR code, and exporter name.
 * @param {PDFKit.PDFDocument} doc - PDF document
 * @param {string} exporterName - Name of technician/exporter (under QR)
 * @param {number} yPosition - Y position to start
 * @returns {Promise<number>} New Y position after section
 */
async function addVerificationSection(doc, exporterName, yPosition) {
  const pageWidth = doc.page.width;
  const leftMargin = 50;
  const rightMargin = 50;
  const qrSize = 70;

  let y = yPosition + 30;

  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  const exportDate = moment().locale("id").format("DD MMMM YYYY");
  const cityName = "Kota Serang";

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#000000")
    .text(`${cityName}, ${exportDate}`, leftMargin, y, {
      width: pageWidth - leftMargin - rightMargin,
      align: "right",
    });

  y += 30;

  const qrText =
    "Laporan ini telah diverifikasi, tercatat secara resmi pada sistem ticketing, dan dinyatakan VALID";

  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrText, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    const qrXPosition = pageWidth - rightMargin - qrSize;

    doc.image(qrCodeDataURL, qrXPosition, y, {
      width: qrSize,
      height: qrSize,
    });

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(exporterName, qrXPosition, y + qrSize + 5, {
        width: qrSize,
        align: "center",
        underline: true,
      });
  } catch (error) {
    console.error("Error generating QR code:", error);
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("(QR Code tidak dapat di-generate)", leftMargin, y, {
        width: pageWidth - leftMargin - rightMargin,
        align: "right",
      });
  }

  return y + qrSize + 30;
}

module.exports = {
  drawLetterhead,
  addVerificationSection,
};
