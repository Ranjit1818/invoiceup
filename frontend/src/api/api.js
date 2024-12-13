import axios from "axios";

// Create an Axios instance for the backend API
const apiClient = axios.create({
  baseURL: "https://invoiceupdate.vercel.app/api", // Base URL for the backend
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
