// Import necessary modules
const express = require("express");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const { toWords } = require("number-to-words");

const app = express();
const fs = require('fs');
// Middleware
app.use(express.json());
app.use(cors());

// Endpoint to generate invoice
app.post("/api/generate-invoice", (req, res) => {
  const { invoice_num, bill_to, ship_to,gst_num, items } = req.body;

  // Validate request body
  if (!invoice_num || !bill_to || !ship_to || !gst_num|| !Array.isArray(items)) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  //Adding numbers to words conversion in Indian rupee
function numberToWordsIndian(num) {
  const units = [
    "",
    "Thousand",
    "Lakh",
    "Crore",
  ];

  const belowTwenty = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convertChunk = (n) => {
    if (n < 20) return belowTwenty[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + belowTwenty[n % 10] : "");
    if (n < 1000)
      return (
        belowTwenty[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " " + convertChunk(n % 100) : "")
      );
    return "";
  };

  if (num === 0) return "Zero";

  let words = "";
  const chunkedNumbers = [];
  let divisor = 1000;

  while (num > 0) {
    chunkedNumbers.unshift(num % divisor);
    num = Math.floor(num / divisor);
    divisor = divisor === 1000 ? 100 : 100;
  }

  const len = chunkedNumbers.length;
  chunkedNumbers.forEach((chunk, index) => {
    if (chunk > 0) {
      words +=
        convertChunk(chunk) +
        (index < len - 1 ? " " + units[len - 1 - index] + " " : "");
    }
  });

  return words.trim();
}


  // Validate items
  for (const item of items) {
    if (
      !item.item_desc ||
      isNaN(Number(item.qty)) ||
      isNaN(Number(item.rate_item)) ||
      isNaN(Number(item.tax))
    ) {
      return res
        .status(400)
        .json({ error: "Invalid item data: ensure all fields are correct" });
    }
  }

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const rate = Number(item.rate_item);
    const tax = Number(item.tax);
    return sum + qty * rate * (1);
  }, 0);

  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 });

  // Set headers to indicate a downloadable file
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice_${invoice_num}.pdf`
  );

  // Stream the PDF directly to the client
  doc.pipe(res);

  // Add content to the PDF
  const pageWidth = 595;
  const margin = 50;

  // Company Details and Invoice Header
  doc.fontSize(16).font("Helvetica-Bold").text("INVOICE", pageWidth - margin - 270, 20, { align: "Center" });
  doc.fontSize(18).font("Helvetica-Bold").text("VIDWAT ASSOCIATES", pageWidth - margin - 496, 45, { align: "left" });
  doc.fontSize(10)
    .font("Helvetica")
    .text("#33, Arvind Nagar", margin, 62)
    .text("Near Veer Savarkar Circle", margin, 75)
    .text("Vijayapur 586101, Karnataka, India", margin, 90)
    .text("PAN: AAZFV2824J", margin, 105)
    .text("GST: 29AAZFV2824J1ZB", margin, 120)
    .text("Email: vidwatassociates@gmail.com", margin, 135)
    .text("Phone: 7892787054", margin, 150);

  // Horizontal line below header
  doc.moveTo(margin, 160).lineTo(pageWidth - margin, 160).stroke();

  // Invoice Details
  doc.fontSize(10)
    .font("Helvetica-Bold")
    .text(`Invoice No: ${invoice_num}`, pageWidth - margin - 143, 80, { align: "center" })
.text(`Invoice Date: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin - 143, 95, { align: "center" });
    doc.moveTo(margin, 160).lineTo(pageWidth - margin, 160).stroke();

    // Draw border for "Bill To" and "Ship To" sections
    const billShipY = 180;
    const boxWidth = pageWidth - 2 * margin;
    const boxHeight = 90;
  
    doc.rect(margin, billShipY - 10, boxWidth, boxHeight).stroke("black");
  
    // Billing and Shipping Details
    const columnWidth = boxWidth / 2;
    doc.moveTo(margin + columnWidth, billShipY - 10)
    .lineTo(margin + columnWidth, billShipY - 10 + boxHeight)
    .stroke("black");
  
    // "Bill To" section
    doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", margin + 10, billShipY);
    doc.fontSize(10)
      .font("Helvetica")
      .text(bill_to || "N/A", margin + 20, billShipY + 15)
      .text("Karnataka,", margin +20, billShipY + 30)
      .text(`${bill_to.phone || "India"}`, margin + 20, billShipY + 45)
      .text(`${gst_num || "India"}`, margin + 20, billShipY + 60);
  
    // "Ship To" section
    doc.fontSize(12).font("Helvetica-Bold").text("Ship To:", margin + columnWidth + 10, billShipY);
    doc.fontSize(10)
      .font("Helvetica")
      .text(ship_to || "N/A", margin + columnWidth + 20, billShipY + 15)
      .text("Karnataka,", margin + columnWidth + 20, billShipY + 30)
      .text(`${ship_to.phone || "India"}`, margin + columnWidth + 20, billShipY + 45)
      .text(`${gst_num || "India"}`, margin + columnWidth + 20, billShipY + 60);


  // Table positions
  let tableStartY = billShipY + 120; // Space below "Bill To" and "Ship To"
const colWidths = [40, 160, 100, 100, 100];

// Dynamic row drawing
const drawRow = (columns, y) => {
  let x = margin;

  // Measure height for each column's text
  const colHeights = columns.map((col, i) =>
    doc.heightOfString(col, { width: colWidths[i] - 10 })
  );

  // Max height in the row + padding
  const rowHeightDynamic = Math.max(...colHeights) + 10;

  // Draw each cell
  columns.forEach((col, i) => {
    doc.rect(x, y, colWidths[i], rowHeightDynamic).stroke();
    doc.text(col, x + 5, y + 5, { width: colWidths[i] - 10, align: "left" });
    x += colWidths[i];
  });

  return y + rowHeightDynamic; // Return new y position
};

// Bold header row
const drawBoldRow = (columns, y) => {
  doc.font("Helvetica-Bold");
  const newY = drawRow(columns, y);
  doc.font("Helvetica"); // Reset font
  return newY;
};

// Draw table header
tableStartY = drawBoldRow(
  ["SL", "ITEM DESCRIPTION", "RATE/ITEM", "QUANTITY", "AMOUNT"],
  tableStartY
);

// Draw table rows
items.forEach((item, index) => {
  const qty = Number(item.qty);
  const rate = Number(item.rate_item);
  const amount = (qty * rate).toFixed(2);

  tableStartY = drawRow(
    [
      `${index + 1}`,
      `${item.item_desc}`,
      `${rate.toFixed(2)}`,
      `${qty}`,
      `${amount}`
    ],
    tableStartY
  );
});

// Optional: Add space after table
tableStartY += 20;


// Second Table: Tax Summary
/*
drawBoldRow(["SL", "HSN/SAC", "AMOUNT"], tableStartY);
tableStartY += rowHeight;

items.forEach((item, index) => {
  const tax = Number(item.tax);
  const taxAmount = (Number(item.qty) * Number(item.rate_item) * (tax / 100)).toFixed(2);

  drawRow([
    `${index + 1}`,
    `${item.hsn_sac || "-"}`,
    `${taxAmount}`
  ], tableStartY);

  tableStartY += rowHeight;
});
*/
// Third Table: Amount Payable and In Words
tableStartY += rowHeight; // Add vertical gap
const thirdTableColWidths = [200, pageWidth - margin * 2 - 200];

// First row: Amount Payable
doc.rect(margin, tableStartY, thirdTableColWidths[0], rowHeight).stroke();
doc.font("Helvetica-Bold").text("Amount Payable", margin + 5, tableStartY + 5, { width: thirdTableColWidths[0] - 10, align: "left" });

doc.rect(margin + thirdTableColWidths[0], tableStartY, thirdTableColWidths[1], rowHeight).stroke();
doc.font("Helvetica-Bold").text(` ${totalAmount.toFixed(2)}`, margin + thirdTableColWidths[0] + 5, tableStartY + 5, { width: thirdTableColWidths[1] - 10, align: "left" });

tableStartY += rowHeight;

// Second row: Amount in Words
doc.rect(margin, tableStartY, thirdTableColWidths[0], rowHeight).stroke();
doc.font("Helvetica-Bold").text("In Words", margin + 5, tableStartY + 5, { width: thirdTableColWidths[0] - 10, align: "left" });

const capitalizeSentences = (text) => {
  return text
    .split(/([.?!])\s*/g) // Split by sentence-ending punctuation and keep it.
    .map((sentence, index) =>
      index % 2 === 0 ? sentence.charAt(0).toUpperCase() + sentence.slice(1) : sentence
    ) // Capitalize sentences but keep punctuation as is.
    .join('');
};

const amountInWords = capitalizeSentences(
  numberToWordsIndian(totalAmount) + " Rupees Only"
);

doc.rect(margin + thirdTableColWidths[0], tableStartY, thirdTableColWidths[1], rowHeight).stroke();
doc.font("Helvetica-Bold").text(amountInWords, margin + thirdTableColWidths[0] + 5, tableStartY + 5, { width: thirdTableColWidths[1] - 10, align: "left" });

  // Footer
  const footerY = 500;
  doc.fontSize(10)
    .font("Helvetica")
    .font("Helvetica-Bold")
    .text("Terms and Conditions:", pageWidth - 550, footerY +96, { align: "left" })
    .text("1.All payments should be made electronically in the name of Vidwat Associates.", pageWidth - 530, footerY + 112, { align: "left" })
    .text("2.All disputes shall be subjected to jurisdiction of Vijayapur.", pageWidth  - 530, footerY + 127, { align: "left" })
    .text("3.This invoice is subjected to the terms and conditions mentioned in the agreement or work order.", pageWidth  - 530, footerY + 142, { align: "left" });
const path = require("path");
const signImagePath = path.join(__dirname, "assets", "vidwat_sign.png");

// Check if the file exists (for debugging)
if (!fs.existsSync(signImagePath)) {
  console.error("Signature image file not found at:", signImagePath);
}
doc.image(signImagePath, pageWidth - margin - 150, footerY + 200, {
  width: 100, // Adjust width
  height: 50, // Adjust height
});



  // Finalize the PDF
  doc.end();
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
