const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const puppeteer = require("puppeteer");
const path = require("path");
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Endpoint to generate PDF
app.post("/generate-invoice", async (req, res) => {
  const { invoice_num, invoice_date, bill_to, ship_to, items, taxable_value, total_tax_amount } = req.body;

  // Load HTML template
  const templatePath = path.join(__dirname, "templates", "invoice.html");
  const template = require("fs").readFileSync(templatePath, "utf-8");

  // Replace placeholders with actual data
  const renderedHTML = template
    .replace("{{invoice_num}}", invoice_num)
    .replace("{{invoice_date}}", invoice_date)
    .replace("{{bill_to}}", bill_to)
    .replace("{{ship_to}}", ship_to)
    .replace("{{taxable_value}}", taxable_value)
    .replace("{{total_tax_amount}}", total_tax_amount)
    .replace(
      "{% for item in items %}",
      items
        .map(
          (item, index) => {
            const gst = Number(item.tax) || ((Number(item.cgst) || 0) + (Number(item.sgst) || 0));
            return `<tr>
              <td>${index + 1}</td>
              <td>${item.item_desc}</td>
              <td>${item.hsn_sac || "-"}</td>
              <td>${item.qty}</td>
              <td>${Number(item.rate_item).toFixed(2)}</td>
              <td>${gst}%</td>
              <td>${(Number(item.qty) * Number(item.rate_item) * (1 + gst / 100)).toFixed(2)}</td>
            </tr>`;
          }
        )
        .join("")
    );

  // Generate PDF
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(renderedHTML);
  const pdf = await page.pdf({ format: "A4" });

  await browser.close();

  // Send PDF as a response
  res.contentType("application/pdf");
  res.send(pdf);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
