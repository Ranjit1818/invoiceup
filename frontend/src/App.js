import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InvoiceForm from "./components/InvoiceForm";
import InvoiceHistory from "./components/InvoiceHistory";
import "./styles/App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<InvoiceForm />} />
          <Route path="/history" element={<InvoiceHistory />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

