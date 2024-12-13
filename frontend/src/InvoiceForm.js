import React, { useState } from "react";
import axios from "axios";

const InvoiceForm = () => {
  const [formData, setFormData] = useState({
    invoice_num: "",
    bill_to: "",
    ship_to: "",
    items: [
      {
        item_desc: "",
        hsn_sac: "",
        tax: "",
        qty: "",
        rate_item: "",
      },
    ],
  });

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

    try {
      const response = await axios.post(
        "http://invoiceupdate.vercel.app/api/generate-invoice",
        formData
      );
      console.log("Invoice Generated: ", response.data);
      alert("Invoice generated successfully!");
    } catch (error) {
      console.error("Error generating invoice: ", error);
      alert("Error generating invoice.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 to-blue-300 flex flex-col items-center p-4">
      {/* Header with Logo */}
      <div className="flex items-center justify-start w-full mb-8">
        <img
          src="/path-to-logo/vidwat-logo.png"
          alt="VIDWAT Logo"
          className="w-16 h-16 mr-4"
        />
        <h1 className="text-3xl font-bold text-white">Invoice Generator</h1>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg w-full max-w-2xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Number:
            </label>
            <input
              type="text"
              name="invoice_num"
              value={formData.invoice_num}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bill To:
            </label>
            <input
              type="text"
              name="bill_to"
              value={formData.bill_to}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ship :
            </label>
            <input
              type="text"
              name="ship_to"
              value={formData.ship_to}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900">Items:</h3>
        {formData.items.map((item, index) => (
          <div
            key={index}
            className="bg-gray-100 p-4 rounded-lg space-y-2 relative"
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Item Description:
                </label>
                <input
                  type="text"
                  value={item.item_desc}
                  onChange={(e) => handleChange(e, index, "item_desc")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  HSN/SAC:
                </label>
                <input
                  type="text"
                  value={item.hsn_sac}
                  onChange={(e) => handleChange(e, index, "hsn_sac")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tax (%):
                </label>
                <input
                  type="text"
                  value={item.tax}
                  onChange={(e) => handleChange(e, index, "tax")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity:
                </label>
                <input
                  type="number"
                  value={item.qty}
                  onChange={(e) => handleChange(e, index, "qty")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rate Per Item:
                </label>
                <input
                  type="number"
                  value={item.rate_item}
                  onChange={(e) => handleChange(e, index, "rate_item")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveItem(index)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleAddItem}
            className="py-2 px-4 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600"
          >
            Add Item
          </button>
          <button
            type="submit"
            className="py-2 px-4 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600"
          >
            Generate
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
