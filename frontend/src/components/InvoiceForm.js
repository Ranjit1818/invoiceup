import React, { useState } from "react";
import axios from "axios";

const InvoiceForm = () => {
  const [formData, setFormData] = useState({
    invoice_num: "",
    bill_to: "",
    ship_to: "",
    gst_num: "", // Added gst_num
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
        "https://invoiceupdate.vercel.app/api/generate-invoice",
        formData,
        {
          responseType: "blob", // Important for handling binary data
        }
      );

      // Create a Blob from the PDF
      const blob = new Blob([response.data], { type: "application/pdf" });

      // Create a link element for downloading
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `invoice_${formData.invoice_num}.pdf`;

      // Programmatically click the link to trigger download
      link.click();

      alert("Invoice generated and downloaded successfully!");
    } catch (error) {
      console.error("Error generating invoice: ", error);
      alert("Error generating invoice.");
    }
  };

  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center p-6">
      {/* Container */}
      <div className="bg-white shadow-lg rounded-xl w-full max-w-3xl p-8 space-y-6">
        {/* Header with Logo */}
        <div className="flex items-center mb-6">
          <img
            src="vidwat_logo.png"
            alt="VIDWAT Logo"
            className="w-12 h-12 mr-3"
          />
          <h1 className="text-2xl font-bold text-gray-700">Invoice Generator</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Invoice Number:
              </label>
              <input
                type="text"
                name="invoice_num"
                value={formData.invoice_num}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Bill To:
              </label>
              <input
                type="text"
                name="bill_to"
                value={formData.bill_to}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Ship To:
              </label>
              <input
                type="text"
                name="ship_to"
                value={formData.ship_to}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                GST Number:
              </label>
              <input
                type="text"
                name="gst_num"
                value={formData.gst_num} // Correct field
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-700">Items:</h3>
          {formData.items.map((item, index) => (
            <div
              key={index}
              className="bg-gray-50 p-4 rounded-lg shadow-inner space-y-3 relative"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-5">
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Item Description:
                  </label>
                  <input
                    type="text"
                    value={item.item_desc}
                    onChange={(e) => handleChange(e, index, "item_desc")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    HSN/SAC:
                  </label>
                  <input
                    type="text"
                    value={item.hsn_sac}
                    onChange={(e) => handleChange(e, index, "hsn_sac")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Tax (%):
                  </label>
                  <input
                    type="text"
                    value={item.tax}
                    onChange={(e) => handleChange(e, index, "tax")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Quantity:
                  </label>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleChange(e, index, "qty")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Rate Per Item:
                  </label>
                  <input
                    type="number"
                    value={item.rate_item}
                    onChange={(e) => handleChange(e, index, "rate_item")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="absolute top-8 right-1 text-red-500 hover:text-red-700"
              >
                X
              </button>
            </div>
          ))}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleAddItem}
              className="py-2 px-4 bg-green-500 text-white rounded-md shadow-md hover:bg-green-600 focus:ring focus:ring-green-300"
            >
              Add Item
            </button>
            <button
              type="submit"
              className="py-2 px-4 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 focus:ring focus:ring-blue-300"
            >
              Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;
