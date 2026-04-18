const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  item_desc: { type: String, required: true },
  hsn_sac: { type: String },
  tax: { type: Number, required: true },
  qty: { type: Number, required: true },
  rate_item: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoice_num: { type: String, required: true },
    bill_to: { type: String, required: true },
    ship_to: { type: String, required: true },
    gst_num: { type: String },
    items: [itemSchema],
    totalAmount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
