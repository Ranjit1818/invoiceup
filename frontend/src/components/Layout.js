import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, History, FilePlus, Settings } from "lucide-react";

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { name: "Create Invoice", path: "/", icon: FilePlus },
    { name: "History", path: "/history", icon: History },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Hidden on mobile, visible on lg */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-indigo-600 bg-clip-text text-transparent">Vidwat Invoice</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? "bg-indigo-50 text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <h1 className="text-xl font-bold text-indigo-600">Vidwat</h1>
          <nav className="flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`p-2 rounded-lg ${
                  location.pathname === item.path ? "text-indigo-600 bg-indigo-50" : "text-slate-600"
                }`}
              >
                <item.icon size={24} />
              </Link>
            ))}
          </nav>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
          <div className="max-w-5xl mx-auto animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
