import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AdminCode from "../models/AdminCode.js";
import AuditLog from "../models/AuditLog.js";

// Helper to get client IP (same as in adminController)
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'Unknown';
};

export const signup = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      role,
      grade,
      subject,
      school,
      adminCode,
      institution,
      institute,
    } = req.body;

    if (!fullName || !email || !password || !confirmPassword || !role) {
      return res.status(400).json({ success: false, error: "All required fields must be filled" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: "Passwords do not match" });
    }

    if (role === "student" && !grade) {
      return res.status(400).json({ success: false, error: "Grade is required for students" });
    }

    if (role === "teacher" && !subject) {
      return res.status(400).json({ success: false, error: "Subject is required for teachers" });
    }

    if (role === "admin" && !adminCode) {
      return res.status(400).json({ success: false, error: "Admin code is required for admins" });
    }

    // Verify admin code for super admin access
    if (role === "admin") {
      // Check if it's the super admin code OR a valid code from database
      if (adminCode === "9804") {
        // Super admin code - always valid
      } else {
        // Check database for valid admin code
        const validCode = await AdminCode.findOne({ 
          code: adminCode,
          is_active: true,
          used_by: null // Code hasn't been used yet
        });

        if (!validCode) {
          return res.status(403).json({ 
            success: false, 
            error: "Invalid or expired admin code. Please contact the system administrator." 
          });
        }

        // Check if code has expired
        if (validCode.expires_at && new Date(validCode.expires_at) < new Date()) {
          return res.status(403).json({ 
            success: false, 
            error: "This admin code has expired. Please contact the system administrator." 
          });
        }
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      username: fullName.split(" ")[0].toLowerCase(),
      fullName,
      email,
      password: hashedPassword,
      role,
      institute: institute || '',
      ...(role === "student" ? { grade } : {}),
      ...(role === "teacher" ? { subject } : {}),
      ...(role === "admin" ? { adminCode, institution } : {}),
    };

    const newUser = new User(userData);
    await newUser.save();

    // If admin used a code from database (not super admin code), mark it as used and deactivate
    if (role === "admin" && adminCode !== "9804") {
      await AdminCode.findOneAndUpdate(
        { code: adminCode },
        { 
          used_by: newUser._id,
          used_at: new Date(),
          is_active: false // Automatically deactivate after use
        }
      );
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: "JWT_SECRET is not configured on server" });
    }

    const isSuperAdmin = newUser.email === 'admin@gmail.com';
    
    const token = jwt.sign(
      { 
        id: newUser._id, 
        email: newUser.email, 
        role: newUser.role, 
        fullName: newUser.fullName,
        isSuperAdmin
      },
      secret,
      { expiresIn: "1h" }
    );

    // Audit: user signup
    try {
      await AuditLog.create({
        user_id: newUser._id,
        changed_by: newUser._id,
        action: 'signup',
        entity_type: 'User',
        entity_id: newUser._id,
        details: `New ${newUser.role} signed up: ${newUser.email}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });
    } catch (e) {
      console.warn('Audit log (signup) failed:', e?.message);
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      role: newUser.role,
      isSuperAdmin,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ success: false, error: "Server error during signup" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: "JWT_SECRET is not configured on server" });
    }

    const isSuperAdmin = user.email === 'admin@gmail.com';
    
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role, 
        fullName: user.fullName,
        isSuperAdmin,
        permissions: user.permissions || []
      },
      secret,
      { expiresIn: "1h" }
    );

    user.last_login = new Date();
    await user.save();

    // Audit: user login
    try {
      await AuditLog.create({
        user_id: user._id,
        changed_by: user._id,
        action: 'login',
        entity_type: 'User',
        entity_id: user._id,
        details: `Login success for ${user.email}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });
    } catch (e) {
      console.warn('Audit log (login) failed:', e?.message);
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: user.role,
      isSuperAdmin,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, error: "Server error during login" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, email, bio, avatar, phone, department, studentId, batch, teacherId } = req.body;
    const userId = req.user.id;

    const updateData = {
      fullName,
      email,
      bio,
      avatar,
      phone,
      department,
      ...(req.user.role === "student" ? { studentId, batch } : { teacherId }),
    };

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Generate a new token with updated fullName and email
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: "JWT_SECRET is not configured" });
    }

    const newToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, fullName: user.fullName },
      secret,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      token: newToken, // Return new token
      user: {
        fullName: user.fullName,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        phone: user.phone,
        department: user.department,
        ...(user.role === "student" ? { studentId: user.studentId, batch: user.batch } : { teacherId: user.teacherId }),
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ success: false, error: "Server error during profile update" });
  }
};