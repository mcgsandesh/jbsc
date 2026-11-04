// src/components/navigation/BottomNav.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FileText, CheckCircle, ShieldCheck } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { label: "मुख्यपृष्ठ", path: "/", icon: Home },
    { label: "नोंदणी", path: "/register", icon: FileText },
    { label: "यादी", path: "/public-list", icon: CheckCircle },
    { label: "ऍडमिन", path: "/admin/login", icon: ShieldCheck },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? "text-orange-600" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}