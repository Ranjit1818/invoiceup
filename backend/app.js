// Import necessary modules
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Invoice = require("./models/Invoice");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

// Middleware
app.use(express.json());

// CORS — allow localhost dev + both Vercel deployments
const allowedOrigins = [
  "http://localhost:3000",
  "https://invoiceup.vercel.app",
  "https://invoiceupdate.vercel.app",
  "https://invoiceup-fcqg-topaz.vercel.app"
];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, mobile apps, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors()); // handle preflight for all routes

// MongoDB — cached connection for Vercel serverless
// Without caching, each cold-start opens a new connection and
// the handshake causes FUNCTION_INVOCATION_TIMEOUT.
let cachedDb = null;

async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI not set — DB features disabled");
    return null;
  }
  try {
    cachedDb = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // fail fast instead of waiting 30 s
      socketTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB");
    return cachedDb;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    return null;
  }
}

// Kick off connection eagerly on module load (warm start reuse)
connectDB();

// Mount analytics routes
app.use("/api/analytics", analyticsRoutes);


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
    const { _id, invoice_num, bill_to, gst_num, items, createdAt } = req.body;

    // Validate request body (gst_num is optional for unregistered customers)
    if (!invoice_num || !bill_to || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing or invalid required fields: invoice_num, bill_to, and at least one item are required" });
    }

    // Validate items
    for (const item of items) {
      const hasTax = !isNaN(Number(item.tax)) || (!isNaN(Number(item.cgst)) && !isNaN(Number(item.sgst)));
      if (!item.item_desc || isNaN(Number(item.qty)) || isNaN(Number(item.rate_item)) || !hasTax) {
        return res.status(400).json({ error: "Invalid item data: ensure all fields are correct" });
      }
    }

    // Normalize item taxes (support both cgst/sgst and legacy tax field)
    const processedItems = items.map((item) => {
      const cgst = item.cgst !== undefined && item.cgst !== "" ? Number(item.cgst) : (item.tax !== undefined && item.tax !== "" ? Number(item.tax) / 2 : 0);
      const sgst = item.sgst !== undefined && item.sgst !== "" ? Number(item.sgst) : (item.tax !== undefined && item.tax !== "" ? Number(item.tax) / 2 : 0);
      const tax = item.tax !== undefined && item.tax !== "" ? Number(item.tax) : (cgst + sgst);
      return {
        ...item,
        cgst,
        sgst,
        tax,
        qty: Number(item.qty) || 0,
        rate_item: Number(item.rate_item) || 0,
      };
    });

    // Calculate total amount
    const totalAmount = processedItems.reduce((sum, item) => {
      const totalTaxRate = item.cgst + item.sgst;
      return sum + (item.qty * item.rate_item) * (1 + (totalTaxRate / 100));
    }, 0);

    if (!_id) {
      connectDB().then((db) => {
        if (!db) return;
        const newInvoice = new Invoice({ invoice_num, bill_to, gst_num, items: processedItems, totalAmount });
        newInvoice.save().catch((err) => console.error("Error saving invoice to DB:", err.message));
      });
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
      .text(`Invoice Date: ${(createdAt ? new Date(createdAt) : new Date()).toLocaleDateString("en-GB")}`, pageWidth - margin - 200, startY + 44, { align: "right", width: 200 });

    doc.font("Helvetica")
      .text("Vijayapur 586101, Karnataka, India", margin, startY + 44)
      .text("PAN: AAZFV2824J", margin, startY + 56)
      .text("GST: 29AAZFV2824J1ZB", margin, startY + 68)
      .text("Email: vidwatassociates@gmail.com", margin, startY + 80)
      .text("Phone: 7892787054", margin, startY + 92);

    // Horizontal Line above Bill To
    doc.moveTo(margin, startY + 110).lineTo(pageWidth - margin, startY + 110).lineWidth(1).stroke();

    // Bill To
    const billShipY = startY + 125;
    const boxWidth = pageWidth - 2 * margin;
    const boxHeight = 85;

    doc.rect(margin, billShipY, boxWidth, boxHeight).stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", margin + 10, billShipY + 10);
    doc.fontSize(10).font("Helvetica")
      .text(bill_to || "", margin + 20, billShipY + 28)
      .text("Karnataka,", margin + 20, billShipY + 40)
      .text("India", margin + 20, billShipY + 52)
      .text(gst_num ? `${gst_num}` : "-", margin + 20, billShipY + 64);

    // Items Table
    // Items Table
    let tableStartY = billShipY + boxHeight + 20;
    const colWidths = [30, 180, 65, 70, 60, 90]; // Sum = 495
    const rowHeight = 18; // Compact height to fit more rows on one page

    const drawRow = (cols, y, isBold = false) => {
      let x = margin;
      doc.fontSize(9);
      if (isBold) doc.font("Helvetica-Bold"); else doc.font("Helvetica");
      
      // Calculate the maximum height needed for this row with compact padding
      let heights = cols.map((col, i) => doc.heightOfString(String(col), { width: colWidths[i] - 8 }));
      let maxHeight = Math.max(rowHeight, ...heights) + 5;

      cols.forEach((col, i) => {
        const textHeight = heights[i];
        const verticalPadding = (maxHeight - textHeight) / 2;
        
        doc.rect(x, y, colWidths[i], maxHeight).stroke();
        doc.text(String(col), x + 4, y + verticalPadding, { 
          width: colWidths[i] - 8,
          align: "left"
        });
        x += colWidths[i];
      });
      return y + maxHeight;
    };

    tableStartY = drawRow(["SL", "ITEM DESCRIPTION", "QUANTITY", "RATE", "GST %", "AMOUNT"], tableStartY, true);
    processedItems.forEach((item, index) => {
      const rate = Number(item.rate_item).toFixed(2);
      const gstStr = `${item.tax}%`;
      const amount = (item.amount !== undefined ? Number(item.amount) : Number(item.qty) * Number(item.rate_item) * (1 + Number(item.tax || 0) / 100)).toFixed(2);
      tableStartY = drawRow([`${index + 1}`, item.item_desc, item.qty.toString(), rate, gstStr, amount], tableStartY);
    });

    // Totals Section - Connected directly under the items table
    // Combined column of RATE and GST % for labels, and AMOUNT column for values
    const taxStartX = margin + colWidths[0] + colWidths[1] + colWidths[2]; // 325 (Exact start of RATE column)
    const taxLabelWidth = colWidths[3] + colWidths[4]; // 130 (Exact combined width of RATE + GST %)
    const taxValueX = taxStartX + taxLabelWidth; // 455 (Exact vertical line separating GST % and AMOUNT)
    const taxValueWidth = colWidths[5]; // 90 (Exact width of AMOUNT column)
    const totalsRowHeight = 18;

    const taxableAmount = processedItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate_item)), 0);
    const totalCGST = processedItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate_item) * (Number(item.cgst || 0) / 100)), 0);
    const totalSGST = processedItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate_item) * (Number(item.sgst || 0) / 100)), 0);

    // Group taxes by rate to display percentages
    const rateMap = {};
    processedItems.forEach((item) => {
      const rate = Number(item.tax || 0) / 2;
      const taxable = Number(item.qty) * Number(item.rate_item);
      if (!rateMap[rate]) rateMap[rate] = { taxable: 0, cgst: 0, sgst: 0 };
      rateMap[rate].taxable += taxable;
      rateMap[rate].cgst += taxable * (rate / 100);
      rateMap[rate].sgst += taxable * (rate / 100);
    });

    const rates = Object.keys(rateMap).map(Number).sort((a, b) => b - a);

    // 1. Taxable Amount Row
    doc.rect(taxStartX, tableStartY, taxLabelWidth, totalsRowHeight).stroke();
    doc.font("Helvetica").fontSize(9).text("Taxable Amount", taxStartX + 4, tableStartY + 4.5, { width: taxLabelWidth - 8, align: "left" });
    doc.rect(taxValueX, tableStartY, taxValueWidth, totalsRowHeight).stroke();
    doc.text(taxableAmount.toFixed(2), taxValueX + 4, tableStartY + 4.5, { width: taxValueWidth - 8, align: "left" });
    tableStartY += totalsRowHeight;

    // 2. CGST and SGST Rows with Percentage
    if (rates.length <= 1) {
      const r = rates[0] !== undefined ? rates[0] : 0;
      // CGST Row
      doc.rect(taxStartX, tableStartY, taxLabelWidth, totalsRowHeight).stroke();
      doc.font("Helvetica").fontSize(9).text(`CGST (${r}%)`, taxStartX + 4, tableStartY + 4.5, { width: taxLabelWidth - 8, align: "left" });
      doc.rect(taxValueX, tableStartY, taxValueWidth, totalsRowHeight).stroke();
      doc.text(totalCGST.toFixed(2), taxValueX + 4, tableStartY + 4.5, { width: taxValueWidth - 8, align: "left" });
      tableStartY += totalsRowHeight;

      // SGST Row
      doc.rect(taxStartX, tableStartY, taxLabelWidth, totalsRowHeight).stroke();
      doc.font("Helvetica").fontSize(9).text(`SGST (${r}%)`, taxStartX + 4, tableStartY + 4.5, { width: taxLabelWidth - 8, align: "left" });
      doc.rect(taxValueX, tableStartY, taxValueWidth, totalsRowHeight).stroke();
      doc.text(totalSGST.toFixed(2), taxValueX + 4, tableStartY + 4.5, { width: taxValueWidth - 8, align: "left" });
      tableStartY += totalsRowHeight;
    } else {
      rates.forEach((r) => {
        // CGST Row
        doc.rect(taxStartX, tableStartY, taxLabelWidth, totalsRowHeight).stroke();
        doc.font("Helvetica").fontSize(9).text(`CGST (${r}%)`, taxStartX + 4, tableStartY + 4.5, { width: taxLabelWidth - 8, align: "left" });
        doc.rect(taxValueX, tableStartY, taxValueWidth, totalsRowHeight).stroke();
        doc.text(rateMap[r].cgst.toFixed(2), taxValueX + 4, tableStartY + 4.5, { width: taxValueWidth - 8, align: "left" });
        tableStartY += totalsRowHeight;

        // SGST Row
        doc.rect(taxStartX, tableStartY, taxLabelWidth, totalsRowHeight).stroke();
        doc.font("Helvetica").fontSize(9).text(`SGST (${r}%)`, taxStartX + 4, tableStartY + 4.5, { width: taxLabelWidth - 8, align: "left" });
        doc.rect(taxValueX, tableStartY, taxValueWidth, totalsRowHeight).stroke();
        doc.text(rateMap[r].sgst.toFixed(2), taxValueX + 4, tableStartY + 4.5, { width: taxValueWidth - 8, align: "left" });
        tableStartY += totalsRowHeight;
      });
    }

    // 2. Amount Payable Table (Separate table)
    tableStartY += 10;
    const contentWidth_final = pageWidth - 2 * margin; // 495
    const summaryLabelWidth = 135;
    const summaryValueWidth = contentWidth_final - summaryLabelWidth; // 360

    doc.rect(margin, tableStartY, summaryLabelWidth, totalsRowHeight).stroke();
    doc.font("Helvetica-Bold").fontSize(9.5).text("Amount Payable", margin + 5, tableStartY + 4.5, { width: summaryLabelWidth - 10 });
    doc.rect(margin + summaryLabelWidth, tableStartY, summaryValueWidth, totalsRowHeight).stroke();
    doc.text(totalAmount.toFixed(2), margin + summaryLabelWidth + 5, tableStartY + 4.5, { width: summaryValueWidth - 10, align: "left" });
    tableStartY += totalsRowHeight;

    // 3. In Words Table (Different, separate table)
    tableStartY += 8;
    const inWordsText = `${numberToWordsIndian(totalAmount)} Rupees Only`;
    const inWordsHeight = Math.max(totalsRowHeight, doc.heightOfString(inWordsText, { width: summaryValueWidth - 15 }) + 8);

    doc.rect(margin, tableStartY, summaryLabelWidth, inWordsHeight).stroke();
    doc.font("Helvetica-Bold").fontSize(9.5).text("In Words", margin + 5, tableStartY + (inWordsHeight / 2 - 5), { width: summaryLabelWidth - 10 });
    doc.rect(margin + summaryLabelWidth, tableStartY, summaryValueWidth, inWordsHeight).stroke();
    doc.font("Helvetica").fontSize(9).text(inWordsText, margin + summaryLabelWidth + 5, tableStartY + (inWordsHeight / 2 - 5), { width: summaryValueWidth - 10, align: "left" });

    // Terms and Conditions (Follows table end)
    const termsY = tableStartY + inWordsHeight + 20; 
    doc.fontSize(11).font("Helvetica-Bold").text("Terms and Conditions:", margin, termsY);
    doc.font("Helvetica-Bold").fontSize(10)
      .text("1.All payments should be made electronically in the name of Vidwat Associates.", margin + 10, termsY + 15)
      .text("2.All disputes shall be subjected to jurisdiction of Vijayapur.", margin + 10, termsY + 27)
      .text("3.This invoice is subjected to the terms and conditions mentioned in the agreement or work order.", margin + 10, termsY + 39);

    // Signature Block (Follows Terms)
    const signY = termsY + 300;
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
    const db = await connectDB();
    if (!db) {
      return res.status(500).json({ error: "Database connection failed. Please check MongoDB configuration." });
    }
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Endpoint to delete an invoice by ID
app.delete("/api/invoices/:id", async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) {
      return res.status(500).json({ error: "Database connection failed. Please check MongoDB configuration." });
    }
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
