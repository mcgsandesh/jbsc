// src/layouts/AdminLayout.jsx
import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  IndianRupee, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  ExternalLink
} from "lucide-react";
import { logoutUser } from "../services/authService";
import { APP_CONFIG } from "../config/constants";
import { getPermissions } from "../utils/permissions";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Firebase Auth State
  const { currentUser, loading } = useAuth();

  // 2. Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">प्रवेश पडताळणी होत आहे...</p>
        </div>
      </div>
    );
  }

  // 3. User Login Check
  if (!currentUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const userRole = (currentUser?.role || "volunteer").toLowerCase();
  const perms = getPermissions(currentUser);

  // 4. Central Route Protection (URL Direct Hack Prevention)
  // Pratyek path saathi permission map
  const routePermissions = {
    "/admin/dashboard": perms.canViewDashboard,
    "/admin/events": perms.canManageEvents,
    "/admin/finance": perms.canManageFinance,
    "/admin/users": perms.canManageUsers,
    "/admin/registrations": perms.canViewRegistrations,
  };

  const currentPath = location.pathname;

  // Jar user kade current URL chi permission nasel (uda: Volunteer ne /admin/dashboard kinva /admin/events ughadle)
  if (routePermissions[currentPath] === false) {
    // Tyala thet tyachya allowed page kade (Registrations) pathva
    return <Navigate to="/admin/registrations" replace />;
  }

  const handleLogout = async () => {
    await logoutUser();
    sessionStorage.removeItem("jbsc_admin_user");
    navigate("/admin/login");
  };

  // 5. Perms nusar Navigation Menu Items
  const navItems = [
    ...(perms.canViewDashboard ? [{ label: "डॅशबोर्ड", path: "/admin/dashboard", icon: LayoutDashboard }] : []),
    ...(perms.canManageEvents ? [{ label: "इव्हेंट्स", path: "/admin/events", icon: CalendarDays }] : []),
    { label: "नोंदणी", path: "/admin/registrations", icon: FileText },
    ...(perms.canManageFinance ? [{ label: "जमा-खर्च", path: "/admin/finance", icon: IndianRupee }] : []),
    ...(perms.canManageUsers ? [{ label: "परवानगी", path: "/admin/users", icon: Users }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 antialiased">
      
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-3 border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-orange-600 tracking-tight">
            {APP_CONFIG.APP_NAME}
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
            {userRole}
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Logo & Info */}
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-black text-orange-500 tracking-wide">
              {APP_CONFIG.APP_NAME}
            </h2>
            <p className="text-xs font-medium text-slate-400 mt-1 truncate">
              {currentUser?.name || "कमिटी सदस्य"}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {userRole}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                {currentUser?.email}
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive(item.path)
                      ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
  to="/"
  onClick={() => setSidebarOpen(false)}
  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
>
  <ExternalLink className="w-3.5 h-3.5" />
  मुख्य वेबसाईट पहा
</Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            लॉगआउट
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* Main View */}
      <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
        <Outlet />
      </main>

      {/* Admin Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div 
          className="grid h-16" 
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-orange-600" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-2"}`} />
                <span className={`text-[10px] ${active ? "font-bold" : "font-medium"} truncate px-1`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}