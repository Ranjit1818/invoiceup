const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const generateInvoicePDF = async (invoiceData) => {
    const templatePath = path.join(__dirname, "../templates/invoice_template.html");
    const htmlContent = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders in the HTML with actual data
    const updatedHTML = htmlContent
        .replace("{{invoice_num}}", invoiceData.invoice_num)
        .replace("{{invoice_date}}", new Date().toLocaleDateString())
        .replace("{{bill_to}}", invoiceData.bill_to)
        .replace("{{ship_to}}", invoiceData.ship_to)
        .replace("{{items}}", invoiceData.items.map((item, index) => {
            const gst = Number(item.tax) || 0;
            return `
            <tr>
                <td>${index + 1}</td>
                <td>${item.item_desc}</td>
                <td>${item.hsn_sac || "-"}</td>
                <td>${item.qty}</td>
                <td>${Number(item.rate_item).toFixed(2)}</td>
                <td>${gst}%</td>
                <td>${(Number(item.qty) * Number(item.rate_item) * (1 + gst / 100)).toFixed(2)}</td>
            </tr>
        `;}).join(''))
        .replace("{{taxable_amount}}", (invoiceData.taxable_amount || invoiceData.items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate_item)), 0)).toFixed(2))
        .replace("{{cgst_rate}}", [...new Set(invoiceData.items.map(it => (Number(it.tax) || 0) / 2))].join(", ") || "0")
        .replace("{{sgst_rate}}", [...new Set(invoiceData.items.map(it => (Number(it.tax) || 0) / 2))].join(", ") || "0")
        .replace("{{cgst_amount}}", (invoiceData.items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate_item) * ((Number(it.tax) / 2) / 100)), 0)).toFixed(2))
        .replace("{{sgst_amount}}", (invoiceData.items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate_item) * ((Number(it.tax) / 2) / 100)), 0)).toFixed(2))
        .replace("{{taxable_value}}", (invoiceData.taxable_value || invoiceData.items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate_item)), 0)).toFixed(2))
        .replace("{{total_tax_amount}}", (invoiceData.total_tax_amount || invoiceData.items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate_item) * (Number(it.tax) / 100)), 0)).toFixed(2))
        .replace("{{round_off}}", (invoiceData.round_off || 0).toFixed(2))
        .replace("{{total}}", (invoiceData.total || invoiceData.totalAmount || 0).toFixed(2))
        .replace("{{amount_in_words}}", invoiceData.amount_in_words || "Amount in words not available");

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Load the updated HTML into Puppeteer
    await page.setContent(updatedHTML);

    // Generate the PDF
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    await browser.close();
    return pdfBuffer;
};

module.exports = { generateInvoicePDF };
