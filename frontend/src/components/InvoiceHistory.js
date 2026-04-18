import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  History,
  Download,
  Search,
  FileText,
  User,
  Hash,
  Calendar,
  IndianRupee,
  Inbox,
  RefreshCw,
  CreditCard,
  ChevronUp,
  ChevronDown,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmtCurrency = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/* ─── Stat card ───────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className={`glass-card p-5 flex items-center gap-4`}>
    <div className={`p-3 rounded-2xl ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-extrabold text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

/* ─── component ────────────────────────────────────────────────────────────── */
const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const navigate = useNavigate();

  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://invoiceupdate.vercel.app";

  /* ── fetch ── */
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/invoices`);
      setInvoices(data);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  /* ── delete ── */
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/api/invoices/${id}`);
      setInvoices((prev) => prev.filter((inv) => inv._id !== id));
    } catch (err) {
      console.error("Error deleting invoice:", err);
      alert("Could not delete invoice. Please try again.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  /* ── download ── */
  const handleDownload = async (invoice) => {
    setDownloadingId(invoice._id);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/generate-invoice`,
        invoice,
        { responseType: "blob" }
      );
      const blob = new Blob([data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `invoice_${invoice.invoice_num}.pdf`;
      link.click();
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  /* ── sort handler ── */
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  /* ── filtered + sorted list ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...invoices]
      .filter(
        (inv) =>
          inv.invoice_num?.toLowerCase().includes(q) ||
          inv.bill_to?.toLowerCase().includes(q) ||
          inv.gst_num?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (sortKey === "totalAmount") { va = Number(va); vb = Number(vb); }
        else if (sortKey === "createdAt") { va = new Date(va); vb = new Date(vb); }
        else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [invoices, search, sortKey, sortDir]);

  /* ── stats ── */
  const totalValue = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

  /* ── SortIcon ── */
  const SortIcon = ({ col }) =>
    sortKey === col ? (
      sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
    ) : (
      <ChevronDown size={13} className="opacity-30" />
    );

  /* ─── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="page-gradient min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="btn-ghost p-2"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-300/40">
                <History className="text-white" size={22} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gradient tracking-tight">
                  Invoice History
                </h1>
                <p className="text-slate-400 text-sm">
                  {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} on record
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchInvoices}
            className="btn-secondary text-sm shrink-0"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </motion.div>

        {/* ── Stat Cards ── */}
        {!loading && invoices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
          >
            <StatCard
              icon={FileText}
              label="Total Invoices"
              value={invoices.length}
              color="bg-gradient-to-br from-indigo-500 to-indigo-600"
            />
            <StatCard
              icon={IndianRupee}
              label="Total Value"
              value={`₹${fmtCurrency(totalValue)}`}
              color="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <StatCard
              icon={Calendar}
              label="Latest Invoice"
              value={invoices.length ? fmtDate(invoices[0].createdAt) : "—"}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
            />
          </motion.div>
        )}

        {/* ── Search bar ── */}
        {!loading && invoices.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="relative mb-4"
          >
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, client, or GST…"
              className="input-field pl-10 pr-10 py-3"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div className="glass-card flex flex-col items-center justify-center py-28 gap-5">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            >
              <RefreshCw size={36} className="text-indigo-400" />
            </motion.div>
            <p className="text-slate-400 font-medium text-sm">
              Loading your invoice history…
            </p>
          </div>
        ) : invoices.length === 0 ? (
          /* ── Empty state ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card flex flex-col items-center justify-center py-28 gap-6"
          >
            <div className="p-6 rounded-3xl bg-slate-50">
              <Inbox size={52} className="text-slate-200" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-800">No invoices yet</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                Generate your first invoice and it will appear here.
              </p>
            </div>
            <button onClick={() => navigate("/")} className="btn-primary">
              Create Invoice
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card overflow-hidden"
          >
            {/* filtered/empty state inside table */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search size={36} className="text-slate-200" />
                <p className="text-slate-400 text-sm font-medium">
                  No results for "<span className="text-slate-600">{search}</span>"
                </p>
                <button onClick={() => setSearch("")} className="btn-secondary text-xs">
                  <X size={13} /> Clear search
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {/* Invoice # */}
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("invoice_num")}
                      >
                        <span className="flex items-center gap-1">
                          <Hash size={12} /> Invoice # <SortIcon col="invoice_num" />
                        </span>
                      </th>
                      {/* Date */}
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("createdAt")}
                      >
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> Date <SortIcon col="createdAt" />
                        </span>
                      </th>
                      {/* Client */}
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("bill_to")}
                      >
                        <span className="flex items-center gap-1">
                          <User size={12} /> Client <SortIcon col="bill_to" />
                        </span>
                      </th>
                      {/* Ship To */}
                      <th>
                        <span className="flex items-center gap-1">
                          Ship To
                        </span>
                      </th>
                      {/* GST */}
                      <th>
                        <span className="flex items-center gap-1">
                          <CreditCard size={12} /> GST No.
                        </span>
                      </th>
                      {/* Items */}
                      <th>Items</th>
                      {/* Amount */}
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("totalAmount")}
                      >
                        <span className="flex items-center gap-1">
                          <IndianRupee size={12} /> Amount <SortIcon col="totalAmount" />
                        </span>
                      </th>
                      {/* Action */}
                      <th className="text-right">PDF</th>
                      <th className="text-right pr-6">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.map((invoice, idx) => (
                        <motion.tr
                          key={invoice._id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                        >
                          {/* Invoice # */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                                <FileText size={16} />
                              </div>
                              <span className="font-bold text-slate-800 text-sm">
                                #{invoice.invoice_num}
                              </span>
                            </div>
                          </td>

                          {/* Date */}
                          <td>
                            <span className="text-slate-500 text-xs">
                              {fmtDate(invoice.createdAt)}
                            </span>
                          </td>

                          {/* Client */}
                          <td>
                            <span className="font-semibold text-slate-700">
                              {invoice.bill_to || "—"}
                            </span>
                          </td>

                          {/* Ship To */}
                          <td>
                            <span className="text-slate-500 text-xs max-w-[140px] truncate block">
                              {invoice.ship_to || "—"}
                            </span>
                          </td>

                          {/* GST */}
                          <td>
                            {invoice.gst_num ? (
                              <span className="badge-blue">
                                {invoice.gst_num}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Items count */}
                          <td>
                            <span className="text-slate-500 text-xs">
                              {invoice.items?.length || 0}{" "}
                              {(invoice.items?.length || 0) === 1 ? "item" : "items"}
                            </span>
                          </td>

                          {/* Amount */}
                          <td>
                            <span className="badge-green">
                              ₹{fmtCurrency(invoice.totalAmount)}
                            </span>
                          </td>

                          {/* Download */}
                          <td className="text-right">
                            <button
                              onClick={() => handleDownload(invoice)}
                              disabled={downloadingId === invoice._id}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                                bg-slate-900 text-white hover:bg-indigo-600
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-200 shadow-sm hover:shadow-indigo-500/30 hover:shadow-md"
                            >
                              {downloadingId === invoice._id ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                                >
                                  <RefreshCw size={13} />
                                </motion.div>
                              ) : (
                                <Download size={13} />
                              )}
                              PDF
                            </button>
                          </td>

                          {/* Delete */}
                          <td className="text-right pr-6">
                            {confirmDeleteId === invoice._id ? (
                              /* Confirm row */
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-red-500 font-semibold mr-1 flex items-center gap-0.5">
                                  <AlertTriangle size={11} /> Sure?
                                </span>
                                <button
                                  onClick={() => handleDelete(invoice._id)}
                                  disabled={deletingId === invoice._id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white
                                    hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                  {deletingId === invoice._id ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                                    >
                                      <RefreshCw size={11} />
                                    </motion.div>
                                  ) : "Yes"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600
                                    hover:bg-slate-200 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(invoice._id)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                                  bg-red-50 text-red-500 border border-red-100
                                  hover:bg-red-600 hover:text-white hover:border-red-600
                                  transition-all duration-200"
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>

                {/* Footer row */}
                <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
                  <p className="text-xs text-slate-400">
                    Showing{" "}
                    <span className="font-semibold text-slate-600">
                      {filtered.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-600">
                      {invoices.length}
                    </span>{" "}
                    invoices
                  </p>
                  <p className="text-xs text-slate-400">
                    Total shown:{" "}
                    <span className="font-bold text-indigo-600">
                      ₹
                      {fmtCurrency(
                        filtered.reduce((s, i) => s + Number(i.totalAmount || 0), 0)
                      )}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InvoiceHistory;
