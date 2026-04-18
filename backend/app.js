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
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoice_num}.pdf`);

    // Stream the PDF directly to the client
    doc.pipe(res);

    const pageWidth = 595.28;
    const margin = 50;
    
    // INVOICE Title
    doc.fontSize(18).font("Helvetica-Bold").text("INVOICE", { align: "center" });
    
    const startY = 80;
    
    // Left Header (Company Info)
    doc.fontSize(17).text("VIDWAT ASSOCIATES", margin, startY);
    
    doc.fontSize(10).font("Helvetica")
      .text("#33, Arvind Nagar", margin, startY + 20)
      .text("Near Veer Savarkar Circle", margin, startY + 32);
      
    // Right Header (Invoice Info)
    doc.fontSize(10).font("Helvetica-Bold")
      .text(`Invoice No: ${invoice_num}`, pageWidth - margin - 200, startY + 32, { align: "right", width: 200 })
      .text(`Invoice Date: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin - 200, startY + 44, { align: "right", width: 200 });

    doc.font("Helvetica")
      .text("Vijayapur 586101, Karnataka, India", margin, startY + 44)
      .text("PAN: AAZFV2824J", margin, startY + 56)
      .text("GST: 29AAZFV2824J1ZB", margin, startY + 68)
      .text("Email: vidwatassociates@gmail.com", margin, startY + 80)
      .text("Phone: 7892787054", margin, startY + 92);

    // Horizontal Line above Bill To
    doc.moveTo(margin, startY + 110).lineTo(pageWidth - margin, startY + 110).lineWidth(1).stroke();

    // Bill To / Ship To
    const billShipY = startY + 125;
    const boxWidth = pageWidth - 2 * margin;
    const boxHeight = 85;
    const columnWidth = boxWidth / 2;

    doc.rect(margin, billShipY, boxWidth, boxHeight).stroke();
    doc.moveTo(margin + columnWidth, billShipY).lineTo(margin + columnWidth, billShipY + boxHeight).stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", margin + 10, billShipY + 10);
    doc.fontSize(10).font("Helvetica")
      .text(bill_to || "", margin + 20, billShipY + 28)
      .text("Karnataka,", margin + 20, billShipY + 40)
      .text("India", margin + 20, billShipY + 52)
      .text(gst_num ? `${gst_num}` : "-", margin + 20, billShipY + 64);

    doc.fontSize(12).font("Helvetica-Bold").text("Ship To:", margin + columnWidth + 10, billShipY + 10);
    doc.fontSize(10).font("Helvetica")
      .text(ship_to || "", margin + columnWidth + 20, billShipY + 28)
      .text("Karnataka,", margin + columnWidth + 20, billShipY + 40)
      .text("India", margin + columnWidth + 20, billShipY + 52)
      .text(gst_num ? ` ${gst_num}` : "-", margin + columnWidth + 20, billShipY + 64);

    // Items Table
    let tableStartY = billShipY + boxHeight + 40;
    const colWidths = [40, 200, 90, 75, 90]; // Sum = 495
    const rowHeight = 22;

    const drawRow = (cols, y, isBold = false) => {
      let x = margin;
      doc.fontSize(10);
      if (isBold) doc.font("Helvetica-Bold"); else doc.font("Helvetica");
      
      // Calculate the maximum height needed for this row
      let heights = cols.map((col, i) => doc.heightOfString(String(col), { width: colWidths[i] - 10 }));
      let maxHeight = Math.max(rowHeight, ...heights) + 10;

      cols.forEach((col, i) => {
        const textHeight = heights[i];
        const verticalPadding = (maxHeight - textHeight) / 2;
        
        doc.rect(x, y, colWidths[i], maxHeight).stroke();
        doc.text(String(col), x + 5, y + verticalPadding, { 
          width: colWidths[i] - 10,
          align: "left"
        });
        x += colWidths[i];
      });
      return y + maxHeight;
    };

    tableStartY = drawRow(["SL", "ITEM DESCRIPTION", "RATE/ITEM", "QUANTITY", "AMOUNT"], tableStartY, true);
    items.forEach((item, index) => {
      const rate = Number(item.rate_item).toFixed(2);
      const amount = (item.qty * item.rate_item).toFixed(2);
      tableStartY = drawRow([`${index + 1}`, item.item_desc, rate, item.qty.toString(), amount], tableStartY);
    });

    // Totals Table
    tableStartY += 10;
    const contentWidth_final = pageWidth - 2 * margin;
    
    // Calculate required widths with more padding to prevent overlap
    const labelPadding = 20; 
    const labelWidth = Math.max(doc.widthOfString("Amount Payable"), doc.widthOfString("In Words")) + labelPadding;
    const valueWidth = contentWidth_final - labelWidth;

    // Amount Payable Row (Content starts immediately after line)
    doc.rect(margin, tableStartY, labelWidth, rowHeight).stroke();
    doc.font("Helvetica-Bold").text("Amount Payable", margin + 5, tableStartY + 7, { width: labelWidth - 10 });
    doc.rect(margin + labelWidth, tableStartY, valueWidth, rowHeight).stroke();
    doc.text(totalAmount.toFixed(2), margin + labelWidth + 5, tableStartY + 7, { width: valueWidth - 10, align: "left" });

    tableStartY += rowHeight;
    
    // In Words Row (Dynamic Height)
    const inWordsText = `${numberToWordsIndian(totalAmount)} Rupees Only`;
    const inWordsHeight = Math.max(rowHeight, doc.heightOfString(inWordsText, { width: valueWidth - 15 }) + 10);
    
    doc.rect(margin, tableStartY, labelWidth, inWordsHeight).stroke();
    doc.text("In Words", margin + 5, tableStartY + (inWordsHeight / 2 - 5), { width: labelWidth - 10 });
    doc.rect(margin + labelWidth, tableStartY, valueWidth, inWordsHeight).stroke();
    doc.text(inWordsText, margin + labelWidth + 5, tableStartY + (inWordsHeight / 2 - 5), { width: valueWidth - 10, align: "left" });

    // Terms and Conditions (Now dynamic - moves based on table end)
    const termsY = tableStartY + 100; 
    doc.fontSize(11).font("Helvetica-Bold").text("Terms and Conditions:", margin, termsY);
    doc.font("Helvetica-Bold").fontSize(10)
      .text("1.All payments should be made electronically in the name of Vidwat Associates.", margin + 10, termsY + 15)
      .text("2.All disputes shall be subjected to jurisdiction of Vijayapur.", margin + 10, termsY + 27)
      .text("3.This invoice is subjected to the terms and conditions mentioned in the agreement or work order.", margin + 10, termsY + 39);

    // Signature Block (Follows Terms dynamically)
    const signY = termsY + 250;
    const signPath = path.join(__dirname, "assets", "vidwat_sign.png");
    const signBoxWidth = 150;
    const signX = pageWidth - margin - signBoxWidth;
    
    if (fs.existsSync(signPath)) {
      doc.image(signPath, signX + (signBoxWidth - 100) / 2, signY - 2, { width: 100 });
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

// Endpoint to delete an invoice by ID
app.delete("/api/invoices/:id", async (req, res) => {
  try {
    const deleted = await Invoice.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Invoice not found" });
    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// Start server (conditional for local dev)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
