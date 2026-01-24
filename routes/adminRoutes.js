// backend/routes/adminRoutes.js
import express from 'express';
import {
  // Dashboard
  getDashboardStats,
  
  // User Management
  listAllStudents,
  listAllTeachers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  suspendUser,
  activateUser,
  resetUserPassword,
  
  // Class Management
  listAllClasses,
  getClassDetails,
  
  // Content Management - Sliders
  listSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  
  // Content Management - Posters
  listPosters,
  createPoster,
  updatePoster,
  deletePoster,
  
  // Content Management - Ads
  listAds,
  createAd,
  updateAd,
  deleteAd,
  
  // Support Tickets
  listSupportTickets,
  updateTicketStatus,
  
  // Analytics
  getAnalytics,
  
  // System Settings
  getSystemSettings,
  updateSystemSetting,
  
  // Audit Logs
  getAuditLogs,
  
  // Admin Management
  listAllAdmins,
  updateAdminPermissions,
  
  // Exam Management
  listAllExams,
  getExamDetails,
  deleteExam,
  updateExamStatus,
  
  // Question Bank Management
  listAllQuestionBanks,
  getQuestionBankDetails,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  
  // Admin Code Management
  listAdminCodes,
  createAdminCode,
  deleteAdminCode,
  toggleAdminCodeStatus,
  
  // Institute Management
  listInstitutes,
  createInstitute,
  updateInstitute,
  deleteInstitute,
} from '../controllers/adminController.js';

import { authenticateToken, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);

// ==================== DASHBOARD ====================
router.get('/dashboard/stats', getDashboardStats);
router.get('/analytics', getAnalytics);

// ==================== USER MANAGEMENT ====================
// Students
router.get('/students', listAllStudents);
router.get('/users/:userId', getUserDetails);
router.post('/users', createUser);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.post('/users/:userId/suspend', suspendUser);
router.post('/users/:userId/activate', activateUser);
router.post('/users/:userId/reset-password', resetUserPassword);

// Teachers
router.get('/teachers', listAllTeachers);

// Admins (Super Admin only can manage other admins)
router.get('/admins', isSuperAdmin, listAllAdmins);
router.put('/admins/:adminId/permissions', isSuperAdmin, updateAdminPermissions);
router.post('/users', isSuperAdmin, createUser);  // Only super admin can create users
router.delete('/users/:userId', isSuperAdmin, deleteUser);  // Only super admin can delete users

// ==================== CLASS MANAGEMENT ====================
router.get('/classes', listAllClasses);
router.get('/classes/:classId/details', getClassDetails);

// ==================== CONTENT MANAGEMENT ====================
// Sliders
router.get('/sliders', listSliders);
router.post('/sliders', createSlider);
router.put('/sliders/:sliderId', updateSlider);
router.delete('/sliders/:sliderId', deleteSlider);

// Posters
router.get('/posters', listPosters);
router.post('/posters', createPoster);
router.put('/posters/:posterId', updatePoster);
router.delete('/posters/:posterId', deletePoster);

// Ads
router.get('/ads', listAds);
router.post('/ads', createAd);
router.put('/ads/:adId', updateAd);
router.delete('/ads/:adId', deleteAd);

// ==================== SUPPORT ====================
router.get('/tickets', listSupportTickets);
router.put('/tickets/:ticketId', updateTicketStatus);

// ==================== SYSTEM ====================
router.get('/settings', getSystemSettings);
// ==================== EXAM MANAGEMENT ====================
router.get('/exams', listAllExams);
router.get('/exams/:examId', getExamDetails);
router.delete('/exams/:examId', deleteExam);
router.put('/exams/:examId/status', updateExamStatus);

// ==================== QUESTION BANK MANAGEMENT ====================
router.get('/question-banks', listAllQuestionBanks);
router.get('/question-banks/:bankId', getQuestionBankDetails);
router.post('/question-banks', createQuestionBank);
router.put('/question-banks/:bankId', updateQuestionBank);
router.delete('/question-banks/:bankId', deleteQuestionBank);

// ==================== ADMIN CODE MANAGEMENT (Super Admin only) ====================
router.get('/admin-codes', isSuperAdmin, listAdminCodes);
router.post('/admin-codes', isSuperAdmin, createAdminCode);
router.delete('/admin-codes/:codeId', isSuperAdmin, deleteAdminCode);
router.put('/admin-codes/:codeId/toggle', isSuperAdmin, toggleAdminCodeStatus);

// ==================== INSTITUTE MANAGEMENT (Super Admin only) ====================
router.get('/institutes', isSuperAdmin, listInstitutes);
router.post('/institutes', isSuperAdmin, createInstitute);
router.put('/institutes/:instituteId', isSuperAdmin, updateInstitute);
router.delete('/institutes/:instituteId', isSuperAdmin, deleteInstitute);

// ==================== AUDIT LOGS ====================
router.get('/audit-logs', getAuditLogs);

router.put('/settings', updateSystemSetting);
router.get('/audit-logs', getAuditLogs);

export default router;
