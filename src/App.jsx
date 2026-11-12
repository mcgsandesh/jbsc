// src/App.jsx
import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import Home from "./modules/public/Home";
import Registration from "./modules/public/Registration";
import PublicList from "./modules/public/PublicList";
import Login from "./modules/admin/Login";
import Dashboard from "./modules/admin/Dashboard";
import Events from "./modules/admin/Events";
import Users from "./modules/admin/Users";
import ManageRegistrations from "./modules/admin/ManageRegistrations"; // <-- हे इंपोर्ट करा
import FinanceModule from "./modules/admin/FinanceModule";
import Gallery from './modules/public/Gallery';
import QrScanner from "./modules/admin/QrScanner";
import LuckyDrawAdmin from "./modules/admin/LuckyDrawAdmin";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="register" element={<Registration />} />
          <Route path="register/:slug" element={<Registration />} />
          <Route path=":slug" element={<Registration />} />
          <Route path="public-list" element={<PublicList />} />
          <Route path="list/:slug" element={<PublicList />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="admin/login" element={<Login />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="registrations" element={<ManageRegistrations />} /> {/* <-- नवीन ॲडमिन रूट */}
          <Route path="scanner" element={<QrScanner/>} />
          <Route path="lucky-draw" element={<LuckyDrawAdmin/>} />
          <Route path="finance" element={<FinanceModule />} />
          <Route path="users" element={<Users />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}