// src/App.jsx
import React, { useEffect } from "react";
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
import ManageRegistrations from "./modules/admin/ManageRegistrations";
import FinanceModule from "./modules/admin/FinanceModule";
import Gallery from "./modules/public/Gallery";
import QrScanner from "./modules/admin/QrScanner";
import LuckyDrawAdmin from "./modules/admin/LuckyDrawAdmin";
import { requestNotificationPermission, onForegroundMessage } from "./services/fcmService";
import NotificationModule from "./modules/admin/NotificationModule";
import AuctionSetupManager from "./modules/admin/AuctionSetupManager";
import PublicAuctionScreen from "./modules/public/PublicAuctionScreen";
import TeamOwnerPortal from "./modules/public/TeamOwnerPortal";

export default function App() {
  useEffect(() => {
    // ॲप सुरू झाल्यावर नोटिफिकेशन परवानगीसाठी विचारणे
    requestNotificationPermission();

    // फॉरग्राउंड मेसेज ऐकणे
    onForegroundMessage();
  }, []);

  return (
    <HashRouter>
      <Routes>
        {/* Standalone Projector / Public Live Auction Screen (No PublicLayout Navbar) */}
        <Route path="/auction-live/:auctionId" element={<PublicAuctionScreen />} />
        <Route path="/auction-team" element={<TeamOwnerPortal />} />
        <Route path="/auction-team/:auctionId" element={<TeamOwnerPortal />} />

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
          <Route path="registrations" element={<ManageRegistrations />} />
          <Route path="scanner" element={<QrScanner />} />
          <Route path="lucky-draw" element={<LuckyDrawAdmin />} />
          <Route path="finance" element={<FinanceModule />} />
          <Route path="users" element={<Users />} />
          <Route path="notifications" element={<NotificationModule />} />
          <Route path="auction" element={<AuctionSetupManager />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}