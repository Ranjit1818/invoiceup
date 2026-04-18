import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Download, Calendar, User, FileText, Search, Inbox } from "lucide-react";

const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const API_URL = process.env.REACT_APP_API_URL || "https://invoiceupdate.vercel.app";

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/invoices`);
      setInvoices(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDownload = async (invoice) => {
    try {
      const response = await axios.post(`${API_URL}/api/generate-invoice`, invoice, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `invoice_${invoice.invoice_num}.pdf`;
      link.click();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF.");
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_num?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.bill_to?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium tracking-wide">Fetching your history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Invoice History</h1>
          <p className="text-slate-500">Track and manage your generated invoices.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by ID or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white min-w-[280px]"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredInvoices.map((invoice) => (
          <div
            key={invoice._id}
            className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <FileText size={24} />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800">#{invoice.invoice_num}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <User size={14} className="text-slate-400" /> {invoice.bill_to}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" /> {new Date(invoice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-8 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</p>
                  <p className="text-xl font-bold text-slate-900">₹ {(invoice.totalAmount || 0).toFixed(2)}</p>
                </div>
                
                <button
                  onClick={() => handleDownload(invoice)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300 shadow-sm"
                >
                  <Download size={18} />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredInvoices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 glass-card rounded-2xl border-dashed border-2">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Inbox size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No invoices found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceHistory;
