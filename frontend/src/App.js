import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InvoiceForm from "./components/InvoiceForm";
import InvoiceHistory from "./components/InvoiceHistory";
import Layout from "./components/Layout";
import "./styles/App.css";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<InvoiceForm />} />
          <Route path="/history" element={<InvoiceHistory />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
