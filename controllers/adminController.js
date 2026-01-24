import User from "../models/User.js";
import Class from "../models/Class.js";
import Exam from "../models/Exam.js";
import QuestionBank from "../models/QuestionBank.js";
import TestSubmission from "../models/TestSubmission.js";
import Institute from "../models/Institute.js";
import AdminCode from "../models/AdminCode.js";
import bcrypt from "bcryptjs";

/**
 * Get dashboard statistics
 * GET /api/admin/dashboard/stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Count users by role
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student' });
    const teachers = await User.countDocuments({ role: 'teacher' });
    const admins = await User.countDocuments({ role: 'admin' });

    // Count other entities
    const classes = await Class.countDocuments();
    const exams = await Exam.countDocuments();
    const questionBanks = await QuestionBank.countDocuments();
    const submissions = await TestSubmission.countDocuments();

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          students,
          teachers,
          admins
        },
        classes,
        exams,
        questionBanks,
        submissions,
        subscriptions: 0 // Placeholder - implement when subscription model is ready
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching dashboard stats' });
  }
};

/**
 * Get analytics data
 * GET /api/admin/analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Count new entities created in the period
    const newUsers = await User.countDocuments({ 
      createdAt: { $gte: startDate } 
    });
    
    const newClasses = await Class.countDocuments({ 
      createdAt: { $gte: startDate } 
    });
    
    const completedExams = await TestSubmission.countDocuments({ 
      submitted_at: { $gte: startDate } 
    });

    return res.status(200).json({
      success: true,
      analytics: {
        newUsers,
        newClasses,
        completedExams,
        period: days
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching analytics' });
  }
};

/**
 * List all students with pagination
 * GET /api/admin/students
 */
export const listAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = { role: 'student' };
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      students,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing students:', error);
    return res.status(500).json({ success: false, error: 'Server error listing students' });
  }
};

/**
 * List all teachers with pagination
 * GET /api/admin/teachers
 */
export const listAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = { role: 'teacher' };
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const teachers = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      teachers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing teachers:', error);
    return res.status(500).json({ success: false, error: 'Server error listing teachers' });
  }
};

/**
 * List all admins with pagination
 * GET /api/admin/admins
 */
export const listAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = { role: 'admin' };
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const admins = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      admins,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing admins:', error);
    return res.status(500).json({ success: false, error: 'Server error listing admins' });
  }
};

/**
 * Get user details
 * GET /api/admin/users/:userId
 */
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching user details' });
  }
};

/**
 * Create a new user
 * POST /api/admin/users
 */
export const createUser = async (req, res) => {
  try {
    const { username, email, password, fullName, role, institute, adminCode, isSuperAdmin } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullName || !role) {
      return res.status(400).json({ success: false, error: 'All required fields must be filled' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email or username already exists' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      role: isSuperAdmin ? 'superadmin' : role,
      isSuperAdmin: isSuperAdmin || false,
      ...(role === 'admin' || role === 'superadmin' ? { institute, adminCode } : {})
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, error: 'Server error creating user' });
  }
};

/**
 * Update user
 * PUT /api/admin/users/:userId
 */
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Don't allow password updates through this endpoint
    delete updates.password;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ success: false, error: 'Server error updating user' });
  }
};

/**
 * Delete user
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, error: 'Server error deleting user' });
  }
};

/**
 * Suspend user
 * POST /api/admin/users/:userId/suspend
 */
export const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { duration = 30 } = req.body;

    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + duration);

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        suspended: true,
        suspend_until: suspendUntil
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      user
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    return res.status(500).json({ success: false, error: 'Server error suspending user' });
  }
};

/**
 * Activate user
 * POST /api/admin/users/:userId/activate
 */
export const activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        suspended: false,
        suspend_until: null
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User activated successfully',
      user
    });
  } catch (error) {
    console.error('Error activating user:', error);
    return res.status(500).json({ success: false, error: 'Server error activating user' });
  }
};

/**
 * Reset user password
 * POST /api/admin/users/:userId/reset-password
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, error: 'New password is required' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ success: false, error: 'Server error resetting password' });
  }
};

/**
 * List all institutes
 * GET /api/admin/institutes
 */
export const listInstitutes = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const institutes = await Institute.find()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ name: 1 });

    const total = await Institute.countDocuments();

    return res.status(200).json({
      success: true,
      institutes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing institutes:', error);
    return res.status(500).json({ success: false, error: 'Server error listing institutes' });
  }
};

/**
 * Create institute
 * POST /api/admin/institutes
 */
export const createInstitute = async (req, res) => {
  try {
    const { name, location, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Institute name is required' });
    }

    const newInstitute = new Institute({
      name,
      location,
      description
    });

    await newInstitute.save();

    return res.status(201).json({
      success: true,
      message: 'Institute created successfully',
      institute: newInstitute
    });
  } catch (error) {
    console.error('Error creating institute:', error);
    return res.status(500).json({ success: false, error: 'Server error creating institute' });
  }
};

/**
 * Update institute
 * PUT /api/admin/institutes/:instituteId
 */
export const updateInstitute = async (req, res) => {
  try {
    const { instituteId } = req.params;
    const updates = req.body;

    const institute = await Institute.findByIdAndUpdate(instituteId, updates, { new: true });

    if (!institute) {
      return res.status(404).json({ success: false, error: 'Institute not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Institute updated successfully',
      institute
    });
  } catch (error) {
    console.error('Error updating institute:', error);
    return res.status(500).json({ success: false, error: 'Server error updating institute' });
  }
};

/**
 * Delete institute
 * DELETE /api/admin/institutes/:instituteId
 */
export const deleteInstitute = async (req, res) => {
  try {
    const { instituteId } = req.params;

    const institute = await Institute.findByIdAndDelete(instituteId);

    if (!institute) {
      return res.status(404).json({ success: false, error: 'Institute not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Institute deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting institute:', error);
    return res.status(500).json({ success: false, error: 'Server error deleting institute' });
  }
};

/**
 * List all classes
 * GET /api/admin/classes
 */
export const listAllClasses = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const classes = await Class.find()
      .populate('teacher_id', 'fullName email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Class.countDocuments();

    return res.status(200).json({
      success: true,
      classes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing classes:', error);
    return res.status(500).json({ success: false, error: 'Server error listing classes' });
  }
};

/**
 * Update admin permissions (Super Admin only)
 * PUT /api/admin/admins/:adminId/permissions
 */
export const updateAdminPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: 'Permissions must be an array' });
    }

    // Find the admin user
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    if (admin.role !== 'admin' && admin.role !== 'superadmin') {
      return res.status(400).json({ success: false, error: 'User is not an admin' });
    }

    // Prevent modifying super admin permissions
    if (admin.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Cannot modify super admin permissions' });
    }

    // Update permissions
    admin.permissions = permissions;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Permissions updated successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error updating admin permissions:', error);
    return res.status(500).json({ success: false, error: 'Server error updating permissions' });
  }
};

/**
 * Get admin permissions
 * GET /api/admin/admins/:adminId/permissions
 */
export const getAdminPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await User.findById(adminId).select('permissions isSuperAdmin role');
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    return res.status(200).json({
      success: true,
      permissions: admin.permissions || [],
      isSuperAdmin: admin.isSuperAdmin || false
    });
  } catch (error) {
    console.error('Error fetching admin permissions:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching permissions' });
  }
};

/**
 * Create Super Admin (Super Admin only)
 * POST /api/admin/create-superadmin
 */
export const createSuperAdmin = async (req, res) => {
  try {
    const { username, email, password, fullName, institute } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ success: false, error: 'All required fields must be filled' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email or username already exists' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create super admin user
    const newSuperAdmin = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      role: 'superadmin',
      isSuperAdmin: true,
      institute: institute || 'System',
      adminCode: 'SUPERADMIN',
      permissions: [] // Super admin doesn't need permissions array
    });

    await newSuperAdmin.save();

    return res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      user: {
        id: newSuperAdmin._id,
        username: newSuperAdmin.username,
        email: newSuperAdmin.email,
        fullName: newSuperAdmin.fullName,
        role: newSuperAdmin.role,
        isSuperAdmin: true
      }
    });
  } catch (error) {
    console.error('Error creating super admin:', error);
    return res.status(500).json({ success: false, error: 'Server error creating super admin' });
  }
};

/**
 * List all admin codes
 * GET /api/admin/admin-codes
 */
export const listAdminCodes = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', isActive } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { institute: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const codes = await AdminCode.find(query)
      .populate('createdBy', 'fullName email')
      .populate('usedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminCode.countDocuments(query);

    return res.status(200).json({
      success: true,
      codes,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing admin codes:', error);
    return res.status(500).json({ success: false, error: 'Server error listing admin codes' });
  }
};

/**
 * Create new admin code
 * POST /api/admin/admin-codes
 */
export const createAdminCode = async (req, res) => {
  try {
    const { code, institute, isSuperAdminCode = false, maxUses, expiresAt } = req.body;

    if (!code || !institute) {
      return res.status(400).json({ success: false, error: 'Code and institute are required' });
    }

    if (!expiresAt) {
      return res.status(400).json({ success: false, error: 'Expiration date is required' });
    }

    // Check if code already exists
    const existingCode = await AdminCode.findOne({ code });
    if (existingCode) {
      return res.status(400).json({ success: false, error: 'This admin code already exists' });
    }

    const newCode = new AdminCode({
      code,
      institute,
      isSuperAdminCode,
      maxUses: maxUses || 1,
      expiresAt: expiresAt,
      createdBy: req.user.id
    });

    await newCode.save();

    return res.status(201).json({
      success: true,
      message: `${isSuperAdminCode ? 'Super admin' : 'Admin'} code created successfully`,
      code: newCode
    });
  } catch (error) {
    console.error('Error creating admin code:', error);
    return res.status(500).json({ success: false, error: 'Server error creating admin code' });
  }
};

/**
 * Update admin code
 * PUT /api/admin/admin-codes/:codeId
 */
export const updateAdminCode = async (req, res) => {
  try {
    const { codeId } = req.params;
    const { isActive, maxUses, expiresAt } = req.body;

    const adminCode = await AdminCode.findById(codeId);
    if (!adminCode) {
      return res.status(404).json({ success: false, error: 'Admin code not found' });
    }

    if (isActive !== undefined) adminCode.isActive = isActive;
    if (maxUses !== undefined) adminCode.maxUses = maxUses;
    if (expiresAt !== undefined) adminCode.expiresAt = expiresAt;

    await adminCode.save();

    return res.status(200).json({
      success: true,
      message: 'Admin code updated successfully',
      code: adminCode
    });
  } catch (error) {
    console.error('Error updating admin code:', error);
    return res.status(500).json({ success: false, error: 'Server error updating admin code' });
  }
};

/**
 * Delete admin code
 * DELETE /api/admin/admin-codes/:codeId
 */
export const deleteAdminCode = async (req, res) => {
  try {
    const { codeId } = req.params;

    const adminCode = await AdminCode.findByIdAndDelete(codeId);
    if (!adminCode) {
      return res.status(404).json({ success: false, error: 'Admin code not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin code deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin code:', error);
    return res.status(500).json({ success: false, error: 'Server error deleting admin code' });
  }
};

/**
 * Toggle admin code active status
 * PUT /api/admin/admin-codes/:codeId/toggle
 */
export const toggleAdminCodeStatus = async (req, res) => {
  try {
    const { codeId } = req.params;

    const adminCode = await AdminCode.findById(codeId);
    if (!adminCode) {
      return res.status(404).json({ success: false, error: 'Admin code not found' });
    }

    adminCode.isActive = !adminCode.isActive;
    await adminCode.save();

    return res.status(200).json({
      success: true,
      message: `Admin code ${adminCode.isActive ? 'activated' : 'deactivated'} successfully`,
      code: adminCode
    });
  } catch (error) {
    console.error('Error toggling admin code status:', error);
    return res.status(500).json({ success: false, error: 'Server error toggling admin code status' });
  }
};
