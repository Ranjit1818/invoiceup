import React, { useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  History,
  Plus,
  Trash2,
  Download,
  Hash,
  User,
  CreditCard,
  Package,
  ChevronRight,
  Sparkles,
  IndianRupee,
  AlertCircle,
} from "lucide-react";

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const fmt = (v) => (isNaN(Number(v)) ? 0 : Number(v));

const numberToWordsIndian = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || num === 0) return "Zero Rupees Only";

  const belowTwenty = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertTwoDigits = (n) => {
    if (n < 20) return belowTwenty[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u > 0 ? " " + belowTwenty[u] : "");
  };

  const convertThreeDigits = (n) => {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = "";
    if (h > 0) res += belowTwenty[h] + " Hundred";
    if (rem > 0) res += (res ? " " : "") + convertTwoDigits(rem);
    return res;
  };

  const convertInteger = (n) => {
    if (n === 0) return "";
    let words = "";

    const crore = Math.floor(n / 10000000);
    n %= 10000000;

    const lakh = Math.floor(n / 100000);
    n %= 100000;

    const thousand = Math.floor(n / 1000);
    n %= 1000;

    const remainder = n;

    if (crore > 0) {
      words += convertInteger(crore) + " Crore ";
    }
    if (lakh > 0) {
      words += convertTwoDigits(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      words += convertTwoDigits(thousand) + " Thousand ";
    }
    if (remainder > 0) {
      words += convertThreeDigits(remainder) + " ";
    }

    return words.trim();
  };

  // Round to 2 decimal places to eliminate floating point issues (e.g. 99999.9999999 -> 100000.00)
  const [rupeesStr, paiseStr] = Math.abs(num).toFixed(2).split(".");
  const rupees = parseInt(rupeesStr, 10);
  const paise = parseInt(paiseStr, 10);

  let parts = [];
  if (rupees > 0) {
    parts.push(convertInteger(rupees) + " " + (rupees === 1 ? "Rupee" : "Rupees"));
  }
  if (paise > 0) {
    parts.push(convertInteger(paise) + " " + (paise === 1 ? "Paisa" : "Paise"));
  }

  if (parts.length === 0) return "Zero Rupees Only";

  return (num < 0 ? "Minus " : "") + parts.join(" and ") + " Only";
};

/* ─── component ────────────────────────────────────────────────────────────── */
const InvoiceForm = () => {
  const navigate = useNavigate();
  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://invoiceupdate.vercel.app";

  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  const [formData, setFormData] = useState({
    invoice_num: "",
    bill_to: "",
    gst_num: "",
    items: [{ item_desc: "", hsn_sac: "", tax: "", qty: "", rate_item: "" }],
  });

  /* ── totals ── */
  const subtotal = useMemo(
    () =>
      formData.items.reduce(
        (s, i) => s + fmt(i.qty) * fmt(i.rate_item),
        0
      ),
    [formData.items]
  );
  const totalCGST = useMemo(
    () =>
      formData.items.reduce(
        (s, i) =>
          s + fmt(i.qty) * fmt(i.rate_item) * ((fmt(i.tax) / 2) / 100),
        0
      ),
    [formData.items]
  );
  const totalSGST = useMemo(
    () =>
      formData.items.reduce(
        (s, i) =>
          s + fmt(i.qty) * fmt(i.rate_item) * ((fmt(i.tax) / 2) / 100),
        0
      ),
    [formData.items]
  );
  const grandTotal = subtotal + totalCGST + totalSGST;

  const distinctTaxRates = useMemo(() => {
    return [...new Set(formData.items.map((i) => fmt(i.tax) / 2))];
  }, [formData.items]);

  const taxRateDisplay = distinctTaxRates.length > 0 ? distinctTaxRates.map(r => `${r}%`).join(", ") : "0%";

  /* ── handlers ── */
  const handleChange = (e, index = null, field = null) => {
    if (index !== null && field !== null) {
      const items = [...formData.items];
      items[index] = { ...items[index], [field]: e.target.value };
      setFormData({ ...formData, items });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleNumericChange = (e, index, field) => {
    let raw = e.target.value;
    // Normalize commas to dots if single comma, or strip commas if formatting like 1,000.50
    if (raw.includes(",") && raw.includes(".")) {
      raw = raw.replace(/,/g, "");
    } else if (raw.includes(",")) {
      const commas = (raw.match(/,/g) || []).length;
      raw = commas === 1 ? raw.replace(",", ".") : raw.replace(/,/g, "");
    }

    // Only allow empty string or valid decimal numbers (digits with at most one decimal point)
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      const items = [...formData.items];
      items[index] = { ...items[index], [field]: raw };
      setFormData({ ...formData, items });
    }
  };

  const handleNumericBlur = (index, field) => {
    const items = [...formData.items];
    const val = items[index][field];
    if (typeof val === "string" && val.endsWith(".")) {
      items[index] = { ...items[index], [field]: val.slice(0, -1) };
      setFormData({ ...formData, items });
    }
  };

  const handleAddItem = () =>
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_desc: "", hsn_sac: "", tax: "", qty: "", rate_item: "" },
      ],
    });

  const handleRemoveItem = (index) =>
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_num || !formData.invoice_num.trim()) {
      showToast("error", "Please enter Invoice Number");
      return;
    }
    if (!formData.bill_to || !formData.bill_to.trim()) {
      showToast("error", "Please enter Bill To client name");
      return;
    }
    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      if (!it.item_desc || !it.item_desc.trim()) {
        showToast("error", `Please enter description for Item ${i + 1}`);
        return;
      }
      if (it.qty === "" || isNaN(Number(it.qty)) || Number(it.qty) <= 0) {
        showToast("error", `Please enter a valid quantity for Item ${i + 1}`);
        return;
      }
      if (it.rate_item === "" || isNaN(Number(it.rate_item)) || Number(it.rate_item) < 0) {
        showToast("error", `Please enter a valid rate for Item ${i + 1}`);
        return;
      }
    }
    setIsGenerating(true);
    try {
      const payload = {
        ...formData,
        items: formData.items.map((it) => {
          const t = fmt(it.tax);
          return {
            ...it,
            tax: t,
            cgst: t / 2,
            sgst: t / 2,
            qty: fmt(it.qty),
            rate_item: fmt(it.rate_item),
          };
        }),
      };
      const response = await axios.post(
        `${API_URL}/api/generate-invoice`,
        payload,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `invoice_${formData.invoice_num}.pdf`;
      link.click();
      showToast("success", "Invoice generated & downloaded!");
    } catch (err) {
      console.error(err);
      let errorMsg = "Something went wrong. Please try again.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.error) errorMsg = json.error;
        } catch (_) {}
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      showToast("error", errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  /* ─── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="page-gradient min-h-screen">
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
              px-6 py-3.5 rounded-2xl shadow-xl text-sm font-semibold
              ${toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
              }`}
          >
            {toast.type === "success" ? (
              <Sparkles size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-300/40">
                <FileText className="text-white" size={22} />
              </div>
              <h1 className="text-3xl font-extrabold text-gradient tracking-tight">
                New Invoice
              </h1>
            </div>
            <p className="text-slate-400 text-sm ml-14">
              Fill in the details below to generate a professional PDF invoice.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/history")}
            className="btn-secondary text-sm shrink-0"
          >
            <History size={16} />
            View History
            <ChevronRight size={14} className="text-slate-300" />
          </button>
        </motion.div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section 1: Invoice Details ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 rounded-xl bg-indigo-50">
                <FileText size={18} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Invoice Details</h2>
                <p className="text-xs text-slate-400">Basic invoice information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice Number */}
              <div>
                <label className="label-text">
                  <Hash size={10} className="inline mr-1" />
                  Invoice Number
                </label>
                <input
                  type="text"
                  name="invoice_num"
                  value={formData.invoice_num}
                  onChange={handleChange}
                  placeholder="INV-2024-001"
                  required
                  className="input-field"
                />
              </div>

              {/* GST Number */}
              <div>
                <label className="label-text">
                  <CreditCard size={10} className="inline mr-1" />
                  GST Number
                </label>
                <input
                  type="text"
                  name="gst_num"
                  value={formData.gst_num}
                  onChange={handleChange}
                  placeholder="29AAZFV2824J1ZB"
                  className="input-field"
                />
              </div>

              {/* Bill To */}
              <div>
                <label className="label-text">
                  <User size={10} className="inline mr-1" />
                  Bill To
                </label>
                <input
                  type="text"
                  name="bill_to"
                  value={formData.bill_to}
                  onChange={handleChange}
                  placeholder="Client Name / Company"
                  required
                  className="input-field"
                />
              </div>
            </div>
          </motion.div>

          {/* ── Section 2: Line Items ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50">
                  <Package size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Line Items</h2>
                  <p className="text-xs text-slate-400">
                    {formData.items.length}{" "}
                    {formData.items.length === 1 ? "item" : "items"} added
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-secondary text-xs px-4 py-2"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>

            {/* Table header – hidden on mobile */}
            <div className="hidden md:grid md:grid-cols-12 gap-3 mb-2 px-2">
              <div className="col-span-3 label-text">Description</div>
              <div className="col-span-2 label-text">HSN / SAC</div>
              <div className="col-span-1 label-text">Qty</div>
              <div className="col-span-2 label-text">Rate (₹)</div>
              <div className="col-span-2 label-text">GST %</div>
              <div className="col-span-1 label-text">Amount</div>
              <div className="col-span-1 label-text"></div>
            </div>

            <AnimatePresence mode="popLayout">
              {formData.items.map((item, index) => (
                <motion.div
                  key={index}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="item-row mb-3"
                >
                  {/* Mobile label */}
                  <div className="flex items-center justify-between mb-3 md:hidden">
                    <span className="badge-blue text-xs">Item {index + 1}</span>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="btn-danger py-1 px-2 text-xs"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Description */}
                    <div className="md:col-span-3">
                      <label className="label-text md:hidden">Description</label>
                      <input
                        type="text"
                        value={item.item_desc}
                        onChange={(e) => handleChange(e, index, "item_desc")}
                        placeholder="Product / Service description"
                        className="input-field"
                      />
                    </div>

                    {/* HSN */}
                    <div className="md:col-span-2">
                      <label className="label-text md:hidden">HSN / SAC</label>
                      <input
                        type="text"
                        value={item.hsn_sac}
                        onChange={(e) => handleChange(e, index, "hsn_sac")}
                        placeholder="Code"
                        className="input-field"
                      />
                    </div>

                    {/* Qty (Comes before Rate) */}
                    <div className="md:col-span-1">
                      <label className="label-text md:hidden">Qty</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.qty}
                        onChange={(e) => handleNumericChange(e, index, "qty")}
                        onBlur={() => handleNumericBlur(index, "qty")}
                        placeholder="1"
                        className="input-field text-center px-1"
                      />
                    </div>

                    {/* Rate (Comes after Qty) */}
                    <div className="md:col-span-2">
                      <label className="label-text md:hidden">Rate (₹)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.rate_item}
                        onChange={(e) => handleNumericChange(e, index, "rate_item")}
                        onBlur={() => handleNumericBlur(index, "rate_item")}
                        placeholder="0.00"
                        className="input-field"
                      />
                    </div>

                    {/* GST % and individual row CGST/SGST calculation */}
                    <div className="md:col-span-2">
                      <label className="label-text md:hidden">GST %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.tax}
                        onChange={(e) => handleNumericChange(e, index, "tax")}
                        onBlur={() => handleNumericBlur(index, "tax")}
                        placeholder="18"
                        className="input-field"
                      />
                      {fmt(item.tax) > 0 && (
                        <div className="text-[11px] font-semibold text-indigo-600 mt-1 flex items-center justify-between px-1">
                          <span>CGST: {(fmt(item.tax) / 2)}%</span>
                          <span>SGST: {(fmt(item.tax) / 2)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Amount (calculated) */}
                    <div className="md:col-span-1">
                      <label className="label-text md:hidden">Amount</label>
                      <div
                        className="input-field bg-indigo-50/60 border-indigo-100 text-indigo-700 font-semibold text-xs truncate flex items-center justify-end px-2"
                        title={`₹${(fmt(item.qty) * fmt(item.rate_item) * (1 + fmt(item.tax) / 100)).toFixed(2)}`}
                      >
                        ₹{(fmt(item.qty) * fmt(item.rate_item) * (1 + fmt(item.tax) / 100)).toFixed(2)}
                      </div>
                    </div>

                    {/* Delete btn – desktop */}
                    <div className="hidden md:flex md:col-span-1 justify-center">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="btn-danger p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* ── Summary Section ── */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Separate Tables: Amount Payable & In Words (At LEFT) */}
              <div className="space-y-3.5">
                {/* 1. Amount Payable Table */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl p-5 shadow-lg shadow-indigo-300/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wider block">Amount Payable</span>
                    <span className="text-2xl font-extrabold tracking-tight">₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-medium">Grand Total</span>
                  </div>
                </div>

                {/* 2. In Words Table (Different table) */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">In Words</span>
                  <p className="text-xs font-semibold text-slate-800 font-medium">
                    {grandTotal > 0 ? numberToWordsIndian(grandTotal) : "Zero Rupees Only"}
                  </p>
                </div>
              </div>

              {/* Tax Breakdown Table (At RIGHT side) */}
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax Breakdown</span>
                  <span className="badge-blue text-[11px]">Individual Row Split</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Taxable Amount</span>
                    <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>CGST ({taxRateDisplay})</span>
                    <span className="font-semibold text-indigo-700">₹{totalCGST.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>SGST ({taxRateDisplay})</span>
                    <span className="font-semibold text-indigo-700">₹{totalSGST.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Submit ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex justify-end"
          >
            <button
              type="submit"
              disabled={isGenerating}
              className={`btn-primary text-base px-10 py-4 ${
                isGenerating ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Download size={20} />
                  </motion.div>
                  <span className="relative z-10">Generating...</span>
                </>
              ) : (
                <>
                  <IndianRupee size={20} className="relative z-10" />
                  <span className="relative z-10">Generate & Download PDF</span>
                  <ChevronRight size={18} className="relative z-10" />
                </>
              )}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;
