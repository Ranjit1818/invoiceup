import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InvoiceForm from "./components/InvoiceForm";
import InvoiceHistory from "./components/InvoiceHistory";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import Layout from "./components/Layout";
import "./index.css";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<InvoiceForm />} />
          <Route path="/history" element={<InvoiceHistory />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
