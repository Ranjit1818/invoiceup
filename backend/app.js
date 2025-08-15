// Import necessary modules
const express = require("express");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Helper: Convert number to Indian currency words
function numberToWordsIndian(num) {
  const belowTwenty = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertTwoDigits = (n) => {
    if (n < 20) return belowTwenty[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + belowTwenty[n % 10] : "");
  };

  const convertThreeDigits = (n) => {
    let word = "";
    if (Math.floor(n / 100) > 0) {
      word += belowTwenty[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 0) word += convertTwoDigits(n);
    return word.trim();
  };

  if (num === 0) return "Zero";

  let result = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  if (crore) result += convertThreeDigits(crore) + " Crore ";
  if (lakh) result += convertThreeDigits(lakh) + " Lakh ";
  if (thousand) result += convertThreeDigits(thousand) + " Thousand ";
  if (hundred) result += convertThreeDigits(hundred);

  return result.trim();
}

// Endpoint to generate invoice
app.post("/api/generate-invoice", (req, res) => {
  const { invoice_num, bill_to, ship_to, gst_num, items } = req.body;

  // Validate request body
  if (!invoice_num || !bill_to || !ship_to || !gst_num || !Array.isArray(items)) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  // Validate items
  for (const item of items) {
    if (
      !item.item_desc ||
      isNaN(Number(item.qty)) ||
      isNaN(Number(item.rate_item)) ||
      isNaN(Number(item.tax))
    ) {
      return res.status(400).json({ error: "Invalid item data: ensure all fields are correct" });
    }
  }

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const rate = Number(item.rate_item);
    return sum + qty * rate;
  }, 0);

  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 });

  // Set headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoice_num}.pdf`);

  // Pipe PDF to response
  doc.pipe(res);

  // Page settings
  const pageWidth = 595;
  const margin = 50;
  const rowHeight = 25; // For summary table rows

  // Invoice Header
  doc.fontSize(16).font("Helvetica-Bold").text("INVOICE", { align: "center" });
  doc.fontSize(18).font("Helvetica-Bold").text("VIDWAT ASSOCIATES", margin, 45);
  doc.fontSize(10).font("Helvetica")
    .text("#33, Arvind Nagar", margin, 62)
    .text("Near Veer Savarkar Circle", margin, 75)
    .text("Vijayapur 586101, Karnataka, India", margin, 90)
    .text("PAN: AAZFV2824J", margin, 105)
    .text("GST: 29AAZFV2824J1ZB", margin, 120)
    .text("Email: vidwatassociates@gmail.com", margin, 135)
    .text("Phone: 7892787054", margin, 150);

  doc.moveTo(margin, 160).lineTo(pageWidth - margin, 160).stroke();

  // Invoice details
  doc.fontSize(10).font("Helvetica-Bold")
    .text(`Invoice No: ${invoice_num}`, pageWidth - margin - 143, 80, { align: "center" })
    .text(`Invoice Date: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin - 143, 95, { align: "center" });

  // Bill To / Ship To box
  const billShipY = 180;
  const boxWidth = pageWidth - 2 * margin;
  const boxHeight = 90;
  const columnWidth = boxWidth / 2;

  doc.rect(margin, billShipY - 10, boxWidth, boxHeight).stroke();
  doc.moveTo(margin + columnWidth, billShipY - 10).lineTo(margin + columnWidth, billShipY - 10 + boxHeight).stroke();

  // Bill To
  doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", margin + 10, billShipY);
  doc.fontSize(10).font("Helvetica")
    .text(bill_to || "N/A", margin + 20, billShipY + 15)
    .text("Karnataka,", margin + 20, billShipY + 30)
    .text(`${bill_to.phone || ""}`, margin + 20, billShipY + 45)
    .text(`${gst_num || ""}`, margin + 20, billShipY + 60);

  // Ship To
  doc.fontSize(12).font("Helvetica-Bold").text("Ship To:", margin + columnWidth + 10, billShipY);
  doc.fontSize(10).font("Helvetica")
    .text(ship_to || "N/A", margin + columnWidth + 20, billShipY + 15)
    .text("Karnataka,", margin + columnWidth + 20, billShipY + 30)
    .text(`${ship_to.phone || ""}`, margin + columnWidth + 20, billShipY + 45)
    .text(`${gst_num || ""}`, margin + columnWidth + 20, billShipY + 60);

  // Table drawing helpers
  const colWidths = [40, 160, 100, 100, 100];
  const drawRow = (columns, y, bold = false) => {
    let x = margin;
    if (bold) doc.font("Helvetica-Bold"); else doc.font("Helvetica");

    const colHeights = columns.map((col, i) =>
      doc.heightOfString(col, { width: colWidths[i] - 10 })
    );
    const rowHeightDynamic = Math.max(...colHeights) + 10;

    columns.forEach((col, i) => {
      doc.rect(x, y, colWidths[i], rowHeightDynamic).stroke();
      doc.text(col, x + 5, y + 5, { width: colWidths[i] - 10 });
      x += colWidths[i];
    });
    return y + rowHeightDynamic;
  };

  // Table Header
  let tableStartY = billShipY + 120;
  tableStartY = drawRow(["SL", "ITEM DESCRIPTION", "RATE/ITEM", "QUANTITY", "AMOUNT"], tableStartY, true);

  // Table rows
  items.forEach((item, index) => {
    const qty = Number(item.qty);
    const rate = Number(item.rate_item);
    const amount = (qty * rate).toFixed(2);
    tableStartY = drawRow([`${index + 1}`, `${item.item_desc}`, `${rate.toFixed(2)}`, `${qty}`, `${amount}`], tableStartY);
  });

  tableStartY += 20;

  // Amount Payable & In Words table
  const thirdTableColWidths = [200, pageWidth - margin * 2 - 200];

  // Amount Payable row
  doc.rect(margin, tableStartY, thirdTableColWidths[0], rowHeight).stroke();
  doc.font("Helvetica-Bold").text("Amount Payable", margin + 5, tableStartY + 5);
  doc.rect(margin + thirdTableColWidths[0], tableStartY, thirdTableColWidths[1], rowHeight).stroke();
  doc.text(totalAmount.toFixed(2), margin + thirdTableColWidths[0] + 5, tableStartY + 5);

  tableStartY += rowHeight;

  // Amount in Words row
  doc.rect(margin, tableStartY, thirdTableColWidths[0], rowHeight).stroke();
  doc.text("In Words", margin + 5, tableStartY + 5);
  const amountInWords = numberToWordsIndian(totalAmount) + " Rupees Only";
  doc.rect(margin + thirdTableColWidths[0], tableStartY, thirdTableColWidths[1], rowHeight).stroke();
  doc.text(amountInWords, margin + thirdTableColWidths[0] + 5, tableStartY + 5, {
    width: thirdTableColWidths[1] - 10
  });

  // Footer
  const footerY = 500;
  doc.fontSize(10).font("Helvetica-Bold")
    .text("Terms and Conditions:", margin, footerY + 96)
    .font("Helvetica")
    .text("1. All payments should be made electronically in the name of Vidwat Associates.", margin, footerY + 112)
    .text("2. All disputes shall be subjected to jurisdiction of Vijayapur.", margin, footerY + 127)
    .text("3. This invoice is subjected to the terms and conditions mentioned in the agreement or work order.", margin, footerY + 142);

  // Signature image
  const signImagePath = path.join(__dirname, "assets", "vidwat_sign.png");
  if (fs.existsSync(signImagePath)) {
    doc.image(signImagePath, pageWidth - margin - 150, footerY + 200, {
      width: 100,
      height: 50
    });
  }

  // Finalize PDF
  doc.end();
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
