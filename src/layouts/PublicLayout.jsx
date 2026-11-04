// src/layouts/PublicLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/navigation/Navbar";
import BottomNav from "../components/navigation/BottomNav";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Body (pb-20 so mobile bottom bar won't overlap content) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Bottom Nav for Mobile Screens */}
      <BottomNav />
    </div>
  );
}