// src/components/navigation/Navbar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Menu, 
  X, 
  Trophy, 
  ShieldCheck, 
  Home, 
  FileText, 
  CheckCircle,
  LayoutDashboard 
} from "lucide-react";
import { APP_CONFIG } from "../../config/constants";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // AuthContext मधून चालू युजर तपासणे
  const { currentUser } = useAuth();

  const navLinks = [
    { name: "मुख्यपृष्ठ", path: "/", icon: Home },
    { name: "नोंदणी फॉर्म", path: "/register", icon: FileText },
    { name: "सहभाग यादी", path: "/public-list", icon: CheckCircle },
  ];

  const isActive = (path) => location.pathname === path;

  // रोलनुसार योग्य Admin मार्ग
  const adminTargetPath = currentUser?.role === "volunteer" 
    ? "/admin/registrations" 
    : "/admin/dashboard";

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Club Name */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900 block leading-tight">
                {APP_CONFIG.APP_NAME}
              </span>
              <span className="text-xs text-orange-600 font-medium block">
                {APP_CONFIG.FULL_CLUB_NAME}
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? "bg-orange-50 text-orange-600 font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Admin Panel / Login Button */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <Link
                to={adminTargetPath}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition shadow-xs"
              >
                <LayoutDashboard className="w-4 h-4 text-orange-400" />
                <span>Admin पॅनेल</span>
              </Link>
            ) : (
              <Link
                to="/admin/login"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
              >
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <span>कमिटी लॉगिन</span>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                  isActive(link.path)
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 text-gray-500" />
                {link.name}
              </Link>
            );
          })}
          
          <div className="pt-2 border-t border-gray-100">
            {currentUser ? (
              <Link
                to={adminTargetPath}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-semibold bg-slate-900 text-white"
              >
                <LayoutDashboard className="w-5 h-5 text-orange-400" />
                <span>Admin पॅनेलवर जा</span>
              </Link>
            ) : (
              <Link
                to="/admin/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <span>कमिटी लॉगिन</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}