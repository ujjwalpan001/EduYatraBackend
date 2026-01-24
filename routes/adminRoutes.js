import express from 'express';
import { authenticateToken, authenticateAdmin, authenticateSuperAdmin } from '../middleware/auth.js';
import {
  getDashboardStats,
  getAnalytics,
  listAllStudents,
  listAllTeachers,
  listAllAdmins,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  suspendUser,
  activateUser,
  resetUserPassword,
  listInstitutes,
  createInstitute,
  updateInstitute,
  deleteInstitute,
  listAllClasses,
  updateAdminPermissions,
  getAdminPermissions,
  createSuperAdmin,
  listAdminCodes,
  createAdminCode,
  updateAdminCode,
  deleteAdminCode,
  toggleAdminCodeStatus
} from '../controllers/adminController.js';

const router = express.Router();

// Dashboard & Analytics (Admin only)
router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);
router.get('/analytics', authenticateAdmin, getAnalytics);

// User Management
router.get('/students', authenticateAdmin, listAllStudents);
router.get('/teachers', authenticateAdmin, listAllTeachers);
router.get('/admins', authenticateSuperAdmin, listAllAdmins); // Only super admin can list admins
router.get('/users/:userId', authenticateAdmin, getUserDetails);
router.post('/users', authenticateAdmin, createUser);
router.put('/users/:userId', authenticateAdmin, updateUser);
router.delete('/users/:userId', authenticateSuperAdmin, deleteUser); // Only super admin can delete users
router.post('/users/:userId/suspend', authenticateAdmin, suspendUser);
router.post('/users/:userId/activate', authenticateAdmin, activateUser);
router.post('/users/:userId/reset-password', authenticateAdmin, resetUserPassword);

// Institute Management (Super Admin only)
router.get('/institutes', authenticateSuperAdmin, listInstitutes);
router.post('/institutes', authenticateSuperAdmin, createInstitute);
router.put('/institutes/:instituteId', authenticateSuperAdmin, updateInstitute);
router.delete('/institutes/:instituteId', authenticateSuperAdmin, deleteInstitute);

// Class Management (Admin only)
router.get('/classes', authenticateAdmin, listAllClasses);

// Admin Permission Management (Super Admin only)
router.put('/admins/:adminId/permissions', authenticateSuperAdmin, updateAdminPermissions);
router.get('/admins/:adminId/permissions', authenticateAdmin, getAdminPermissions);

// Create Super Admin (Super Admin only)
router.post('/create-superadmin', authenticateSuperAdmin, createSuperAdmin);

// Admin Code Management (Super Admin only)
router.get('/admin-codes', authenticateSuperAdmin, listAdminCodes);
router.post('/admin-codes', authenticateSuperAdmin, createAdminCode);
router.put('/admin-codes/:codeId', authenticateSuperAdmin, updateAdminCode);
router.delete('/admin-codes/:codeId', authenticateSuperAdmin, deleteAdminCode);
router.put('/admin-codes/:codeId/toggle', authenticateSuperAdmin, toggleAdminCodeStatus);

export default router;
