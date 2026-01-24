// backend/controllers/adminController.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Class from '../models/Class.js';
import ClassStudent from '../models/ClassStudent.js';
import Question from '../models/Question.js';
import QuestionBank from '../models/QuestionBank.js';
import Exam from '../models/Exam.js';
import Institute from '../models/Institute.js';
import Course from '../models/Course.js';
import Slider from '../models/Slider.js';
import Poster from '../models/Poster.js';
import Advertisement from '../models/Advertisement.js';
import Subscription from '../models/Subscription.js';
import SupportTicket from '../models/SupportTicket.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import SystemSetting from '../models/SystemSetting.js';
import AdminCode from '../models/AdminCode.js';

// Helper function to get client IP address
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         'Unknown';
};

// ==================== USER MANAGEMENT ====================

// Get Dashboard Statistics
export const getDashboardStats = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalClasses,
      totalExams,
      totalQuestions,
      activeSubscriptions,
      openTickets
    ] = await Promise.all([
      User.countDocuments({ deleted_at: null }),
      User.countDocuments({ role: 'student', deleted_at: null }),
      User.countDocuments({ role: 'teacher', deleted_at: null }),
      Class.countDocuments({ deleted_at: null }),
      Exam.countDocuments({ deleted_at: null }),
      Question.countDocuments({ deleted_at: null }),
      Subscription.countDocuments({ status: 'active' }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } })
    ]);

    const stats = {
      users: { total: totalUsers, students: totalStudents, teachers: totalTeachers },
      classes: totalClasses,
      exams: totalExams,
      questions: totalQuestions,
      subscriptions: activeSubscriptions,
      tickets: openTickets
    };

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// List all students with filters
export const listAllStudents = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, search, grade, status, institute } = req.query;
    const query = { role: 'student', deleted_at: null };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    if (grade) query.grade = grade;
    if (status === 'active') query.account_locked_until = null;
    if (status === 'suspended') query.account_locked_until = { $ne: null };
    if (institute) query.institute_id = institute;

    const skip = (page - 1) * limit;
    const [students, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Attach name field for consistency
    const studentsWithName = students.map(s => ({ ...s, name: s.username || s.fullName || '' }));

    return res.status(200).json({
      success: true,
      students: studentsWithName,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing students:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// List all teachers
export const listAllTeachers = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, search, subject, status } = req.query;
    const query = { role: 'teacher', deleted_at: null };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    if (subject) query.subject = subject;
    if (status === 'active') query.account_locked_until = null;
    if (status === 'suspended') query.account_locked_until = { $ne: null };

    const skip = (page - 1) * limit;
    const [teachers, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Get class counts for each teacher
    for (let teacher of teachers) {
      const classCount = await Class.countDocuments({ teacher_id: teacher._id, deleted_at: null });
      teacher.classCount = classCount;
    }

    // Attach name field
    const teachersWithName = teachers.map(t => ({ ...t, name: t.username || t.fullName || '' }));

    return res.status(200).json({
      success: true,
      teachers: teachersWithName,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing teachers:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get user details
export const getUserDetails = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const userData = await User.findById(userId)
      .select('-password')
      .lean();

    if (!userData) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get additional stats based on role
    if (userData.role === 'student') {
      const [classCount, examCount] = await Promise.all([
        ClassStudent.countDocuments({ student_id: userId, deleted_at: null }),
        Exam.countDocuments({ 'students': userId })
      ]);
      userData.stats = { classes: classCount, exams: examCount };
    } else if (userData.role === 'teacher') {
      const [classCount, examCount] = await Promise.all([
        Class.countDocuments({ teacher_id: userId, deleted_at: null }),
        Exam.countDocuments({ created_by: userId })
      ]);
      userData.stats = { classes: classCount, exams: examCount };
    }

    // Attach name field
    const userWithName = { ...userData, name: userData.username || userData.fullName || '' };
    return res.status(200).json({ success: true, user: userWithName });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Create new user (student/teacher/admin)
export const createUser = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { username, email, password, role, grade, subject, school, institute_id } = req.body;
    const fullNameBody = req.body.fullName || req.body.full_name || '';

    if (!username || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      fullName: fullNameBody,
      grade,
      subject,
      school,
      institute_id,
      email_verified: true
    });

    await newUser.save();

    // Log audit
    await AuditLog.create({
      table_name: 'users',
      record_id: newUser._id.toString(),
      action: 'CREATE',
      changed_by: user.id,
      user_id: user.id,
      new_values: { email, role, fullName: fullNameBody || username },
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(201).json({ success: true, user: { ...newUser.toObject(), password: undefined } });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const updates = req.body;

    // Don't allow password updates through this endpoint
    delete updates.password;
    delete updates.role; // Prevent role changes

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      changed_by: user.id,
      action: 'update_user',
      entity_type: 'User',
      entity_id: userId,
      details: `Updated user ${updatedUser.email}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Delete user (soft delete)
export const deleteUser = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const deletedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { deleted_at: new Date() } },
      { new: true, select: '-password' }
    );

    if (!deletedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      changed_by: user.id,
      action: 'delete_user',
      entity_type: 'User',
      entity_id: userId,
      details: `Deleted user ${deletedUser.email}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Suspend user
export const suspendUser = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const { duration = 30 } = req.body; // Days

    const lockUntil = new Date();
    lockUntil.setDate(lockUntil.getDate() + duration);

    const suspendedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { account_locked_until: lockUntil } },
      { new: true, select: '-password' }
    );

    if (!suspendedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      changed_by: user.id,
      action: 'suspend_user',
      entity_type: 'User',
      entity_id: userId,
      details: `Suspended user ${suspendedUser.email} for ${duration} days`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, user: suspendedUser });
  } catch (error) {
    console.error('Error suspending user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Activate user
export const activateUser = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const activatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { account_locked_until: null, failed_login_attempts: 0 } },
      { new: true, select: '-password' }
    );

    if (!activatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      changed_by: user.id,
      action: 'activate_user',
      entity_type: 'User',
      entity_id: userId,
      details: `Activated user ${activatedUser.email}`,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, user: activatedUser });
  } catch (error) {
    console.error('Error activating user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Reset user password
export const resetUserPassword = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { password: hashedPassword } },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      action: 'reset_password',
      entity_type: 'User',
      entity_id: userId,
      details: `Reset password for ${updatedUser.email}`
    });

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CLASS MANAGEMENT ====================

// List all classes
export const listAllClasses = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, search, teacher, institute } = req.query;
    const query = { deleted_at: null };

    if (search) {
      query.class_name = { $regex: search, $options: 'i' };
    }
    if (teacher) query.teacher_id = teacher;
    if (institute) query.institute_id = institute;

    const skip = (page - 1) * limit;
    const [classes, total] = await Promise.all([
      Class.find(query)
        .populate('teacher_id', 'fullName email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Class.countDocuments(query)
    ]);

    // Get student counts
    for (let cls of classes) {
      const studentCount = await ClassStudent.countDocuments({ class_id: cls._id, deleted_at: null });
      cls.studentCount = studentCount;
    }

    // Attach teacher name object for consistency
    const classesWithTeacher = classes.map((cls) => ({
      ...cls,
      teacher: {
        name: cls.teacher_id?.username || cls.teacher_id?.fullName || '',
        email: cls.teacher_id?.email || '',
        _id: cls.teacher_id?._id,
      },
    }));

    return res.status(200).json({
      success: true,
      classes: classesWithTeacher,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing classes:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get class details with teacher and students
export const getClassDetails = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { classId } = req.params;
    if (!classId || !Class || !ClassStudent) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }

    const cls = await Class.findOne({ _id: classId, deleted_at: null })
      .populate('teacher_id', 'username fullName email')
      .lean();
    if (!cls) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    // Prefer authoritative list by joining ClassStudent -> User
    const classStudentLinks = await ClassStudent.find({ class_id: cls._id, is_active: true })
      .populate('student_id', 'username fullName email')
      .lean();

    let students = classStudentLinks.map((link) => ({
      name: link.student_id?.username || link.student_id?.fullName || '',
      email: link.student_id?.email || '',
      userId: link.student_id?._id,
    }));

    // Fallback to embedded students array if join returns empty
    if (!students.length && Array.isArray(cls.students)) {
      students = cls.students.map((s) => ({ name: s.name, email: s.email, userId: s.userId }));
    }

    return res.status(200).json({
      success: true,
      class: {
        _id: cls._id,
        class_name: cls.class_name,
        teacher: {
          name: cls.teacher_id?.username || cls.teacher_id?.fullName || '',
          email: cls.teacher_id?.email || '',
          _id: cls.teacher_id?._id,
        },
        students,
      },
    });
  } catch (error) {
    console.error('Error getting class details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== CONTENT MANAGEMENT ====================

// Slider Management
export const listSliders = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, is_active } = req.query;
    const query = { deleted_at: null };
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const skip = (page - 1) * limit;
    const [sliders, total] = await Promise.all([
      Slider.find(query)
        .populate('created_by', 'username fullName email')
        .sort({ display_order: 1, created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Slider.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      sliders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing sliders:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createSlider = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const sliderData = { ...req.body, created_by: user.id };
    const slider = new Slider(sliderData);
    await slider.save();

    await AuditLog.create({
      user_id: user.id,
      action: 'create_slider',
      entity_type: 'Slider',
      entity_id: slider._id,
      details: `Created slider: ${slider.title}`
    });

    return res.status(201).json({ success: true, slider });
  } catch (error) {
    console.error('Error creating slider:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSlider = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { sliderId } = req.params;
    const slider = await Slider.findByIdAndUpdate(
      sliderId,
      { $set: req.body },
      { new: true }
    );

    if (!slider) {
      return res.status(404).json({ success: false, error: 'Slider not found' });
    }

    return res.status(200).json({ success: true, slider });
  } catch (error) {
    console.error('Error updating slider:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteSlider = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { sliderId } = req.params;
    const slider = await Slider.findByIdAndUpdate(
      sliderId,
      { $set: { deleted_at: new Date() } },
      { new: true }
    );

    if (!slider) {
      return res.status(404).json({ success: false, error: 'Slider not found' });
    }

    return res.status(200).json({ success: true, message: 'Slider deleted successfully' });
  } catch (error) {
    console.error('Error deleting slider:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Poster Management
export const listPosters = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, is_active, poster_type } = req.query;
    const query = { deleted_at: null };
    if (is_active !== undefined) query.is_active = is_active === 'true';
    if (poster_type) query.poster_type = poster_type;

    const skip = (page - 1) * limit;
    const [posters, total] = await Promise.all([
      Poster.find(query)
        .populate('created_by', 'username fullName email')
        .sort({ priority: -1, start_date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Poster.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      posters,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing posters:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createPoster = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const posterData = { ...req.body, created_by: user.id };
    const poster = new Poster(posterData);
    await poster.save();

    await AuditLog.create({
      user_id: user.id,
      action: 'create_poster',
      entity_type: 'Poster',
      entity_id: poster._id,
      details: `Created poster: ${poster.title}`
    });

    return res.status(201).json({ success: true, poster });
  } catch (error) {
    console.error('Error creating poster:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePoster = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { posterId } = req.params;
    const poster = await Poster.findByIdAndUpdate(
      posterId,
      { $set: req.body },
      { new: true }
    );

    if (!poster) {
      return res.status(404).json({ success: false, error: 'Poster not found' });
    }

    return res.status(200).json({ success: true, poster });
  } catch (error) {
    console.error('Error updating poster:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePoster = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { posterId } = req.params;
    const poster = await Poster.findByIdAndUpdate(
      posterId,
      { $set: { deleted_at: new Date() } },
      { new: true }
    );

    if (!poster) {
      return res.status(404).json({ success: false, error: 'Poster not found' });
    }

    return res.status(200).json({ success: true, message: 'Poster deleted successfully' });
  } catch (error) {
    console.error('Error deleting poster:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Advertisement Management
export const listAds = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, is_active, placement } = req.query;
    const query = { deleted_at: null };
    if (is_active !== undefined) query.is_active = is_active === 'true';
    if (placement) query.placement = placement;

    const skip = (page - 1) * limit;
    const [ads, total] = await Promise.all([
      Advertisement.find(query)
        .populate('created_by', 'username fullName email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Advertisement.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      ads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing ads:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createAd = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const adData = { ...req.body, created_by: user.id };
    const ad = new Advertisement(adData);
    await ad.save();

    await AuditLog.create({
      user_id: user.id,
      action: 'create_ad',
      entity_type: 'Advertisement',
      entity_id: ad._id,
      details: `Created ad: ${ad.title}`
    });

    return res.status(201).json({ success: true, ad });
  } catch (error) {
    console.error('Error creating ad:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateAd = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { adId } = req.params;
    const ad = await Advertisement.findByIdAndUpdate(
      adId,
      { $set: req.body },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }

    return res.status(200).json({ success: true, ad });
  } catch (error) {
    console.error('Error updating ad:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteAd = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { adId } = req.params;
    const ad = await Advertisement.findByIdAndUpdate(
      adId,
      { $set: { deleted_at: new Date() } },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }

    return res.status(200).json({ success: true, message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SUPPORT TICKET MANAGEMENT ====================

export const listSupportTickets = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, status, priority, category } = req.query;
    const query = { deleted_at: null };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('user_id', 'username fullName email role')
        .populate('assigned_to', 'username fullName email')
        .sort({ priority: -1, created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SupportTicket.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing tickets:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { ticketId } = req.params;
    const { status, response } = req.body;

    const updates = { status };
    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date();
    }

    if (response) {
      updates.$push = {
        responses: {
          user_id: user.id,
          message: response,
          created_at: new Date()
        }
      };
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      updates,
      { new: true }
    ).populate('user_id', 'username fullName email');

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== ANALYTICS & REPORTS ====================

export const getAnalytics = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [
      newUsers,
      newClasses,
      completedExams,
      activeUsers
    ] = await Promise.all([
      User.countDocuments({ created_at: { $gte: startDate }, deleted_at: null }),
      Class.countDocuments({ created_at: { $gte: startDate }, deleted_at: null }),
      Exam.countDocuments({ created_at: { $gte: startDate } }),
      User.countDocuments({ last_login: { $gte: startDate }, deleted_at: null })
    ]);

    const analytics = {
      period: `${period} days`,
      newUsers,
      newClasses,
      completedExams,
      activeUsers
    };

    return res.status(200).json({ success: true, analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SYSTEM SETTINGS ====================

export const getSystemSettings = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const settings = await SystemSetting.find().lean();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    return res.status(200).json({ success: true, settings: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSystemSetting = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }

    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { $set: { value, updated_by: user.id } },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      user_id: user.id,
      action: 'update_setting',
      entity_type: 'SystemSetting',
      entity_id: setting._id,
      details: `Updated setting: ${key}`
    });

    return res.status(200).json({ success: true, setting });
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== AUDIT LOGS ====================

export const getAuditLogs = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 50, action, user_id } = req.query;
    const query = {};
    if (action) query.action = action;
    if (user_id) query.user_id = user_id;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user_id', 'username fullName email role')
        .populate('changed_by', 'username fullName email role')
        .sort({ createdAt: -1, changed_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== ADMIN MANAGEMENT ====================

export const listAllAdmins = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, search } = req.query;
    const query = { role: 'admin', deleted_at: null };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [admins, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      admins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing admins:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update Admin Permissions (Super Admin Only)
export const updateAdminPermissions = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { adminId } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: 'Permissions array is required' });
    }

    // Prevent non-super admins from updating permissions
    if (user.email !== 'admin@gmail.com') {
      return res.status(403).json({ success: false, error: 'Only super admin can update permissions' });
    }

    // Prevent super admin from modifying their own permissions
    const targetAdmin = await User.findById(adminId);
    if (!targetAdmin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    if (targetAdmin.email === 'admin@gmail.com') {
      return res.status(403).json({ success: false, error: 'Cannot modify super admin permissions' });
    }

    // Update permissions
    targetAdmin.permissions = permissions;
    await targetAdmin.save();

    return res.status(200).json({
      success: true,
      message: 'Permissions updated successfully',
      admin: {
        _id: targetAdmin._id,
        email: targetAdmin.email,
        fullName: targetAdmin.fullName,
        permissions: targetAdmin.permissions
      }
    });
  } catch (error) {
    console.error('Error updating admin permissions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== EXAM MANAGEMENT ====================

export const listAllExams = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, search, status, teacher } = req.query;
    const query = { deleted_at: null };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (status) query.status = status;
    if (teacher) query.created_by = teacher;

    const skip = (page - 1) * limit;
    const [exams, total] = await Promise.all([
      Exam.find(query)
        .populate('created_by', 'username fullName email')
        .populate('class_id', 'class_name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Exam.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      exams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing exams:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getExamDetails = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { examId } = req.params;
    const exam = await Exam.findById(examId)
      .populate('created_by', 'username fullName email')
      .populate('class_id', 'class_name')
      .populate('question_set_id')
      .lean();

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Get submission stats
    const submissionCount = await TestSubmission.countDocuments({ 
      question_set_id: exam.question_set_id 
    });

    exam.submissionCount = submissionCount;

    return res.status(200).json({ success: true, exam });
  } catch (error) {
    console.error('Error fetching exam details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { examId } = req.params;
    const exam = await Exam.findByIdAndUpdate(
      examId,
      { $set: { deleted_at: new Date() } },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      action: 'delete_exam',
      entity_type: 'Exam',
      entity_id: examId,
      details: `Deleted exam: ${exam.title}`
    });

    return res.status(200).json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateExamStatus = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { examId } = req.params;
    const { status } = req.body;

    const exam = await Exam.findByIdAndUpdate(
      examId,
      { $set: { status } },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      action: 'update_exam_status',
      entity_type: 'Exam',
      entity_id: examId,
      details: `Changed exam status to: ${status}`
    });

    return res.status(200).json({ success: true, exam });
  } catch (error) {
    console.error('Error updating exam status:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== QUESTION BANK MANAGEMENT ====================

export const listAllQuestionBanks = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, search, subject, grade } = req.query;
    const query = { deleted_at: null };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (subject) query.subject = subject;
    if (grade) query.grade = grade;

    const skip = (page - 1) * limit;
    const [banks, total] = await Promise.all([
      QuestionBank.find(query)
        .populate('created_by', 'username fullName email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      QuestionBank.countDocuments(query)
    ]);

    // Get question counts for each bank
    for (let bank of banks) {
      const questionCount = await Question.countDocuments({ 
        question_bank_id: bank._id,
        deleted_at: null 
      });
      bank.questionCount = questionCount;
    }

    return res.status(200).json({
      success: true,
      banks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing question banks:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getQuestionBankDetails = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { bankId } = req.params;
    const bank = await QuestionBank.findById(bankId)
      .populate('created_by', 'username fullName email')
      .lean();

    if (!bank) {
      return res.status(404).json({ success: false, error: 'Question bank not found' });
    }

    // Get questions in this bank
    const questions = await Question.find({ 
      question_bank_id: bankId,
      deleted_at: null 
    })
      .populate('created_by', 'username fullName email')
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    bank.questions = questions;
    bank.questionCount = questions.length;

    return res.status(200).json({ success: true, bank });
  } catch (error) {
    console.error('Error fetching question bank details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createQuestionBank = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const bankData = { ...req.body, created_by: user.id };
    const bank = new QuestionBank(bankData);
    await bank.save();

    await AuditLog.create({
      user_id: user.id,
      action: 'create_question_bank',
      entity_type: 'QuestionBank',
      entity_id: bank._id,
      details: `Created question bank: ${bank.name}`
    });

    return res.status(201).json({ success: true, bank });
  } catch (error) {
    console.error('Error creating question bank:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateQuestionBank = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { bankId } = req.params;
    const bank = await QuestionBank.findByIdAndUpdate(
      bankId,
      { $set: req.body },
      { new: true }
    );

    if (!bank) {
      return res.status(404).json({ success: false, error: 'Question bank not found' });
    }

    return res.status(200).json({ success: true, bank });
  } catch (error) {
    console.error('Error updating question bank:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteQuestionBank = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { bankId } = req.params;
    const bank = await QuestionBank.findByIdAndUpdate(
      bankId,
      { $set: { deleted_at: new Date() } },
      { new: true }
    );

    if (!bank) {
      return res.status(404).json({ success: false, error: 'Question bank not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      action: 'delete_question_bank',
      entity_type: 'QuestionBank',
      entity_id: bankId,
      details: `Deleted question bank: ${bank.name}`
    });

    return res.status(200).json({ success: true, message: 'Question bank deleted successfully' });
  } catch (error) {
    console.error('Error deleting question bank:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== ADMIN CODE MANAGEMENT ====================

export const listAdminCodes = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [codes, total] = await Promise.all([
      AdminCode.find(query)
        .populate('created_by', 'username fullName email')
        .populate('used_by', 'username fullName email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AdminCode.countDocuments(query)
    ]);

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
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createAdminCode = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { code, description, expires_at } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Admin code is required' });
    }

    // Check if code already exists
    const existingCode = await AdminCode.findOne({ code });
    if (existingCode) {
      return res.status(400).json({ success: false, error: 'This admin code already exists' });
    }

    const adminCode = await AdminCode.create({
      code,
      description: description || '',
      created_by: user.id,
      expires_at: expires_at || null
    });

    await AuditLog.create({
      table_name: 'admin_codes',
      record_id: adminCode._id.toString(),
      action: 'CREATE',
      changed_by: user.id,
      user_id: user.id,
      new_values: { code, description },
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(201).json({ success: true, code: adminCode });
  } catch (error) {
    console.error('Error creating admin code:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteAdminCode = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { codeId } = req.params;
    const adminCode = await AdminCode.findByIdAndDelete(codeId);

    if (!adminCode) {
      return res.status(404).json({ success: false, error: 'Admin code not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      action: 'delete_admin_code',
      entity_type: 'AdminCode',
      entity_id: codeId,
      details: `Deleted admin code: ${adminCode.code}`
    });

    return res.status(200).json({ success: true, message: 'Admin code deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin code:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleAdminCodeStatus = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { codeId } = req.params;
    const adminCode = await AdminCode.findById(codeId);

    if (!adminCode) {
      return res.status(404).json({ success: false, error: 'Admin code not found' });
    }

    adminCode.is_active = !adminCode.is_active;
    await adminCode.save();

    await AuditLog.create({
      user_id: user.id,
      action: 'toggle_admin_code_status',
      entity_type: 'AdminCode',
      entity_id: codeId,
      details: `${adminCode.is_active ? 'Activated' : 'Deactivated'} admin code: ${adminCode.code}`
    });

    return res.status(200).json({ success: true, code: adminCode });
  } catch (error) {
    console.error('Error toggling admin code status:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== INSTITUTE MANAGEMENT (Public endpoint for signup) ====================
export const getPublicInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find({ deleted_at: null })
      .select('name location')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      institutes,
    });
  } catch (error) {
    console.error('Error fetching public institutes:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch institutes',
    });
  }
};

// ==================== INSTITUTE MANAGEMENT ====================

export const listInstitutes = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, search } = req.query;
    const query = { deleted_at: null };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [institutes, total] = await Promise.all([
      Institute.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Institute.countDocuments(query)
    ]);

    // Get user count for each institute
    for (let institute of institutes) {
      const userCount = await User.countDocuments({ 
        institute: institute.name, 
        deleted_at: null 
      });
      institute._doc.userCount = userCount;
    }

    return res.status(200).json({
      success: true,
      institutes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing institutes:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createInstitute = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { name, location } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Institute name is required' });
    }

    const existingInstitute = await Institute.findOne({ name });
    if (existingInstitute) {
      return res.status(400).json({ success: false, error: 'Institute already exists' });
    }

    const institute = await Institute.create({
      name,
      location: location || ''
    });

    await AuditLog.create({
      table_name: 'institutes',
      record_id: institute._id.toString(),
      action: 'CREATE',
      changed_by: user.id,
      new_values: { name, location }
    });

    return res.status(201).json({ success: true, institute });
  } catch (error) {
    console.error('Error creating institute:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateInstitute = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { instituteId } = req.params;
    const { name, location } = req.body;

    const institute = await Institute.findByIdAndUpdate(
      instituteId,
      { 
        $set: { 
          name, 
          location,
          updated_at: new Date() 
        } 
      },
      { new: true }
    );

    if (!institute) {
      return res.status(404).json({ success: false, error: 'Institute not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      action: 'update_institute',
      entity_type: 'Institute',
      entity_id: instituteId,
      details: `Updated institute: ${name}`
    });

    return res.status(200).json({ success: true, institute });
  } catch (error) {
    console.error('Error updating institute:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteInstitute = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { instituteId } = req.params;
    
    // Check if institute has users
    const userCount = await User.countDocuments({ 
      institute: (await Institute.findById(instituteId))?.name,
      deleted_at: null 
    });

    if (userCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete institute with ${userCount} active users` 
      });
    }

    const institute = await Institute.findByIdAndUpdate(
      instituteId,
      { $set: { deleted_at: new Date() } },
      { new: true }
    );

    if (!institute) {
      return res.status(404).json({ success: false, error: 'Institute not found' });
    }

    await AuditLog.create({
      user_id: user.id,
      action: 'delete_institute',
      entity_type: 'Institute',
      entity_id: instituteId,
      details: `Deleted institute: ${institute.name}`
    });

    return res.status(200).json({ success: true, message: 'Institute deleted successfully' });
  } catch (error) {
    console.error('Error deleting institute:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
