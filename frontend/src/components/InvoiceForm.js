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
  MapPin,
  CreditCard,
  Package,
  ChevronRight,
  Sparkles,
  IndianRupee,
  AlertCircle,
} from "lucide-react";

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const fmt = (v) => (isNaN(Number(v)) ? 0 : Number(v));

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
    ship_to: "",
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
  const totalTax = useMemo(
    () =>
      formData.items.reduce(
        (s, i) =>
          s + fmt(i.qty) * fmt(i.rate_item) * (fmt(i.tax) / 100),
        0
      ),
    [formData.items]
  );
  const grandTotal = subtotal + totalTax;

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
    setIsGenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/generate-invoice`,
        formData,
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
      showToast("error", "Something went wrong. Please try again.");
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

              {/* Ship To */}
              <div>
                <label className="label-text">
                  <MapPin size={10} className="inline mr-1" />
                  Ship To
                </label>
                <input
                  type="text"
                  name="ship_to"
                  value={formData.ship_to}
                  onChange={handleChange}
                  placeholder="Shipping Address / Project Site"
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
              {["Description", "HSN / SAC", "Tax %", "Qty", "Rate (₹)", "Amount", ""].map(
                (h, i) => (
                  <div
                    key={i}
                    className={`label-text ${
                      i === 0
                        ? "col-span-4"
                        : i === 1
                        ? "col-span-2"
                        : i === 2
                        ? "col-span-1"
                        : i === 3
                        ? "col-span-1"
                        : i === 4
                        ? "col-span-2"
                        : i === 5
                        ? "col-span-1"
                        : "col-span-1"
                    }`}
                  >
                    {h}
                  </div>
                )
              )}
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
                    <div className="md:col-span-4">
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

                    {/* Tax */}
                    <div className="md:col-span-1">
                      <label className="label-text md:hidden">Tax %</label>
                      <input
                        type="number"
                        value={item.tax}
                        onChange={(e) => handleChange(e, index, "tax")}
                        placeholder="18"
                        min="0"
                        className="input-field"
                      />
                    </div>

                    {/* Qty */}
                    <div className="md:col-span-1">
                      <label className="label-text md:hidden">Qty</label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleChange(e, index, "qty")}
                        placeholder="1"
                        min="0"
                        className="input-field"
                      />
                    </div>

                    {/* Rate */}
                    <div className="md:col-span-2">
                      <label className="label-text md:hidden">Rate (₹)</label>
                      <input
                        type="number"
                        value={item.rate_item}
                        onChange={(e) => handleChange(e, index, "rate_item")}
                        placeholder="0.00"
                        min="0"
                        className="input-field"
                      />
                    </div>

                    {/* Amount (calculated) */}
                    <div className="md:col-span-1">
                      <label className="label-text md:hidden">Amount</label>
                      <div className="input-field bg-indigo-50/60 border-indigo-100 text-indigo-700 font-semibold text-sm">
                        ₹{(fmt(item.qty) * fmt(item.rate_item)).toFixed(2)}
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

            {/* ── Totals Summary ── */}
            <div className="mt-6 flex justify-end">
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-100 rounded-2xl px-6 py-5 min-w-[260px] space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-700">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax</span>
                  <span className="font-medium text-slate-700">₹{totalTax.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-bold text-slate-800">Grand Total</span>
                  <span className="font-extrabold text-indigo-600 text-lg">
                    ₹{grandTotal.toFixed(2)}
                  </span>
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
