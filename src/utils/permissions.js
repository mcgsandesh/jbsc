// src/utils/permissions.js
import { USER_ROLES } from "../config/constants";

export const getPermissions = (user) => {
  const role = user?.role || USER_ROLES.VOLUNTEER;
  const isSuper = role === USER_ROLES.SUPERADMIN;

  return {
    // Nav menu & Page Route permissions
    canViewDashboard: isSuper || role === USER_ROLES.FINANCE_ADMIN, // Volunteer & Desk Admin na Dashboard nako
    canManageUsers: isSuper,
    canManageEvents: isSuper,
    canManageFinance: isSuper || role === USER_ROLES.FINANCE_ADMIN,
    canViewRegistrations: true, // Sarvanna registration uplabdha

    // Action rights inside Registration module
    canEditPayment: isSuper || role === USER_ROLES.FINANCE_ADMIN || role === USER_ROLES.DESK_ADMIN,
    canCheckInAttendance: true,
    canExportData: isSuper || role === USER_ROLES.FINANCE_ADMIN,
    canDeleteRegistration: isSuper,
  };
};