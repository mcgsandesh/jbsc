// src/config/constants.js

export const APP_CONFIG = {
  APP_NAME: "JBSC Events",
  FULL_CLUB_NAME: "Jagewala Baba Sports Club",
  TAGLINE: "utsav aani krida mahasangram",
  DEFAULT_YEAR: 2026,
};

// User Roles Hierarchy
export const USER_ROLES = {
  SUPERADMIN: "superadmin", // Full Access
  FINANCE_ADMIN: "finance_admin", // Paid/Unpaid + Income/Expense
  DESK_ADMIN: "desk_admin", // Fakt Paid/Unpaid edit
  VOLUNTEER: "volunteer", // Fakt Attendance & Food Check-in
};

export const ROLE_LABELS = {
  superadmin: { label: "Super Admin", color: "bg-purple-100 text-purple-700 border-purple-200" },
  finance_admin: { label: "Finance & Desk Admin", color: "bg-blue-100 text-blue-700 border-blue-200" },
  desk_admin: { label: "Desk Admin (Payment)", color: "bg-amber-100 text-amber-700 border-amber-200" },
  volunteer: { label: "Volunteer (Check-in/Food)", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

// Payment status badge colors & labels
export const PAYMENT_STATUS = {
  PAID: { label: "Paid", color: "bg-green-100 text-green-700 border-green-300" },
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700 border-red-300" },
};