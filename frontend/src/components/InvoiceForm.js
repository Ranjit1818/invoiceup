import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Send, Download, FileText, User, MapPin, Hash } from "lucide-react";

const InvoiceForm = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "https://invoiceupdate.vercel.app";
  
  const [formData, setFormData] = useState({
    invoice_num: "",
    bill_to: "",
    ship_to: "",
    gst_num: "",
    items: [
      { item_desc: "", hsn_sac: "", tax: "", qty: "", rate_item: "" },
    ],
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e, index = null, field = null) => {
    if (index !== null && field !== null) {
      const updatedItems = [...formData.items];
      updatedItems[index][field] = e.target.value;
      setFormData({ ...formData, items: updatedItems });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_desc: "", hsn_sac: "", tax: "", qty: "", rate_item: "" },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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

      alert("Invoice generated successfully!");
    } catch (error) {
      console.error("Error generating invoice: ", error);
      alert("Error generating invoice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Generate New Invoice</h1>
        <p className="text-slate-500 text-lg">Create and download professional invoices in seconds.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Section */}
        <section className="glass-card p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
            <FileText className="text-indigo-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-800">Invoice Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                <Hash size={16} /> <span>Invoice Number</span>
              </label>
              <input
                type="text"
                name="invoice_num"
                value={formData.invoice_num}
                onChange={handleChange}
                placeholder="INV-001"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white/50"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                <Hash size={16} /> <span>GST Number</span>
              </label>
              <input
                type="text"
                name="gst_num"
                value={formData.gst_num}
                onChange={handleChange}
                placeholder="29AAAAA0000A1Z5"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white/50"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                <User size={16} /> <span>Bill To</span>
              </label>
              <input
                type="text"
                name="bill_to"
                value={formData.bill_to}
                onChange={handleChange}
                placeholder="Client Name / Company"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white/50"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                <MapPin size={16} /> <span>Ship To</span>
              </label>
              <input
                type="text"
                name="ship_to"
                value={formData.ship_to}
                onChange={handleChange}
                placeholder="Shipping Address / Project"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white/50"
              />
            </div>
          </div>
        </section>

        {/* Items Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Items & Line Totals</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-2 font-medium"
            >
              <Plus size={18} /> <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div
                key={index}
                className="glass-card p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition-shadow duration-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-5 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                    <input
                      type="text"
                      value={item.item_desc}
                      onChange={(e) => handleChange(e, index, "item_desc")}
                      placeholder="Product/Service description"
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleChange(e, index, "qty")}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</label>
                    <input
                      type="number"
                      value={item.rate_item}
                      onChange={(e) => handleChange(e, index, "rate_item")}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</label>
                    <div className="px-4 py-2 bg-slate-50 rounded-lg text-slate-700 font-medium">
                    ₹ {(item.qty * item.rate_item || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="md:col-span-1 flex items-end justify-center pb-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Submit Section */}
        <div className="flex justify-end pt-8">
          <button
            type="submit"
            disabled={loading}
            className={`px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center space-x-3 text-lg ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              <>
                <Download size={24} />
                <span>Generate & Download PDF</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
