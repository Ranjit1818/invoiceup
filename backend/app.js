// Import necessary modules
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Invoice = require("./models/Invoice");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Could not connect to MongoDB:", err));
} else {
  console.warn("MONGODB_URI is not defined in environment variables");
}

// Helper: Convert number to Indian currency words
function numberToWordsIndian(num) {
  const units = ["", "Thousand", "Lakh", "Crore"];
  const belowTwenty = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertChunk = (n) => {
    if (n < 20) return belowTwenty[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + belowTwenty[n % 10] : "");
    if (n < 1000) return belowTwenty[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertChunk(n % 100) : "");
    return "";
  };

  if (num === 0) return "Zero";

  let words = "";
  let n = Math.floor(num);
  const chunks = [];
  
  // Handle first chunk (up to 1000)
  chunks.push(n % 1000);
  n = Math.floor(n / 1000);
  
  // Handle other chunks (Lakh, Crore) - 2 digits each in Indian system
  while (n > 0) {
    chunks.push(n % 100);
    n = Math.floor(n / 100);
  }

  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i] > 0) {
      words += convertChunk(chunks[i]) + (i > 0 ? " " + units[i] + " " : "");
    }
  }

  return words.trim();
}

// Endpoint to generate invoice
app.post("/api/generate-invoice", async (req, res) => {
  try {
    const { invoice_num, bill_to, ship_to, gst_num, items } = req.body;

    // Validate request body
    if (!invoice_num || !bill_to || !ship_to || !gst_num || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    // Validate items
    for (const item of items) {
      if (!item.item_desc || isNaN(Number(item.qty)) || isNaN(Number(item.rate_item)) || isNaN(Number(item.tax))) {
        return res.status(400).json({ error: "Invalid item data: ensure all fields are correct" });
      }
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      const qty = Number(item.qty);
      const rate = Number(item.rate_item);
      return sum + qty * rate;
    }, 0);

    // Save to MongoDB
    try {
      const newInvoice = new Invoice({
        invoice_num,
        bill_to,
        ship_to,
        gst_num,
        items,
        totalAmount,
      });
      await newInvoice.save();
    } catch (dbError) {
      console.error("Error saving invoice to DB:", dbError);
    }

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoice_num}.pdf`);

    // Stream the PDF directly to the client
    doc.pipe(res);

    const pageWidth = 595;
    const margin = 50;

    // Header
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

    // Invoice Details
    doc.fontSize(10).font("Helvetica-Bold")
      .text(`Invoice No: ${invoice_num}`, pageWidth - margin - 150, 80, { align: "right" })
      .text(`Invoice Date: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin - 150, 95, { align: "right" });

    // Bill To / Ship To
    const billShipY = 180;
    const boxWidth = pageWidth - 2 * margin;
    const boxHeight = 90;
    const columnWidth = boxWidth / 2;

    doc.rect(margin, billShipY - 10, boxWidth, boxHeight).stroke();
    doc.moveTo(margin + columnWidth, billShipY - 10).lineTo(margin + columnWidth, billShipY - 10 + boxHeight).stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", margin + 10, billShipY);
    doc.fontSize(10).font("Helvetica")
      .text(bill_to || "N/A", margin + 20, billShipY + 15)
      .text("Karnataka, India", margin + 20, billShipY + 30)
      .text(`GST: ${gst_num || ""}`, margin + 20, billShipY + 45);

    doc.fontSize(12).font("Helvetica-Bold").text("Ship To:", margin + columnWidth + 10, billShipY);
    doc.fontSize(10).font("Helvetica")
      .text(ship_to || "N/A", margin + columnWidth + 20, billShipY + 15)
      .text("Karnataka, India", margin + columnWidth + 20, billShipY + 30)
      .text(`GST: ${gst_num || ""}`, margin + columnWidth + 20, billShipY + 45);

    // Items Table
    let tableStartY = billShipY + 100;
    const colWidths = [40, 160, 100, 100, 100];
    const rowHeight = 25;

    const drawRow = (cols, y, isBold = false) => {
      let x = margin;
      if (isBold) doc.font("Helvetica-Bold"); else doc.font("Helvetica");
      cols.forEach((col, i) => {
        doc.rect(x, y, colWidths[i], rowHeight).stroke();
        doc.text(col, x + 5, y + 7, { width: colWidths[i] - 10 });
        x += colWidths[i];
      });
      return y + rowHeight;
    };

    tableStartY = drawRow(["SL", "ITEM DESCRIPTION", "RATE/ITEM", "QUANTITY", "AMOUNT"], tableStartY, true);
    items.forEach((item, index) => {
      const amount = (item.qty * item.rate_item).toFixed(2);
      tableStartY = drawRow([`${index + 1}`, item.item_desc, item.rate_item.toString(), item.qty.toString(), amount], tableStartY);
    });

    tableStartY += 20;

    // Totals
    const totalTableWidth = pageWidth - 2 * margin;
    doc.rect(margin, tableStartY, 200, rowHeight).stroke();
    doc.font("Helvetica-Bold").text("Total Amount", margin + 5, tableStartY + 7);
    doc.rect(margin + 200, tableStartY, totalTableWidth - 200, rowHeight).stroke();
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, margin + 205, tableStartY + 7);

    tableStartY += rowHeight;
    doc.rect(margin, tableStartY, 200, rowHeight).stroke();
    doc.text("In Words", margin + 5, tableStartY + 7);
    doc.rect(margin + 200, tableStartY, totalTableWidth - 200, rowHeight).stroke();
    doc.text(`${numberToWordsIndian(totalAmount)} Rupees Only`, margin + 205, tableStartY + 7, { width: totalTableWidth - 210 });

    // Footer & Signature
    const footerY = 600;
    doc.fontSize(10).font("Helvetica-Bold").text("Terms and Conditions:", margin, footerY);
    doc.font("Helvetica").fontSize(8)
      .text("1. All payments should be made electronically in the name of Vidwat Associates.", margin, footerY + 15)
      .text("2. All disputes shall be subjected to jurisdiction of Vijayapur.", margin, footerY + 25)
      .text("3. This invoice is subjected to terms mentioned in the agreement.", margin, footerY + 35);

    const signPath = path.join(__dirname, "assets", "vidwat_sign.png");
    if (fs.existsSync(signPath)) {
      doc.image(signPath, pageWidth - margin - 120, footerY, { width: 100 });
      doc.fontSize(10).font("Helvetica-Bold").text("Authorized Signatory", pageWidth - margin - 120, footerY + 60);
    }

    doc.end();
  } catch (error) {
    console.error("Internal Server Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// Endpoint to get all invoices
app.get("/api/invoices", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Start server (conditional for local dev)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
