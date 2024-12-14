const handleGenerateInvoice = async () => {
  try {
      const response = await axios.post("http://invoiceupdate.vercel.app/api/generate-invoice", invoiceData, {
          responseType: "blob" // Ensures the response is handled as binary data
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoice.pdf');
      document.body.appendChild(link);
      link.click();
  } catch (error) {
      console.error("Error generating invoice:", error);
  }
};
