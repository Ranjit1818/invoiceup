import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { History, FilePlus, Menu, X, Zap } from "lucide-react";

const navItems = [
  {
    name: "Create Invoice",
    path: "/",
    icon: FilePlus,
    desc: "Generate a new invoice",
  },
  {
    name: "History",
    path: "/history",
    icon: History,
    desc: "View past invoices",
  },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 shadow-sm shrink-0">
        {/* Brand */}
        <div className="px-6 py-7 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-300/30">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-gradient leading-tight">
                InvoiceUp
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                Vidwat Associates
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Navigation
          </p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link group ${isActive ? "active" : ""}`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                  }`}
                >
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-sm leading-tight">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-normal leading-tight">
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-5 border-t border-slate-100">
          <p className="text-[10px] text-slate-300 text-center">
            © {new Date().getFullYear()} Vidwat Associates
          </p>
        </div>
      </aside>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-2xl transition-transform duration-300 lg:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-gradient text-sm">InvoiceUp</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`sidebar-link group ${isActive ? "active" : ""}`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    isActive
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-normal">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-extrabold text-gradient text-sm">InvoiceUp</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
