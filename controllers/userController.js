import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Institute from "../models/Institute.js";
import AdminCode from "../models/AdminCode.js";

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

    if (role === "teacher" && (!subject || !school)) {
      return res.status(400).json({ success: false, error: "Subject and school are required for teachers" });
    }

    if (role === "admin" && (!adminCode || !institute)) {
      return res.status(400).json({ success: false, error: "Admin code and institute are required for admins" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    // Check if admin code exists and determine if it creates a super admin
    let isSuperAdmin = false;
    if (role === "admin") {
      const adminCodeDoc = await AdminCode.findOne({ code: adminCode, isActive: true });
      if (!adminCodeDoc) {
        return res.status(400).json({ success: false, error: "Invalid or inactive admin code" });
      }
      
      // Check if code has expired
      if (adminCodeDoc.expiresAt && new Date() > adminCodeDoc.expiresAt) {
        return res.status(400).json({ success: false, error: "This admin code has expired" });
      }
      
      // Check if max uses reached
      if (adminCodeDoc.maxUses && adminCodeDoc.usedBy.length >= adminCodeDoc.maxUses) {
        return res.status(400).json({ success: false, error: "This admin code has reached its maximum uses" });
      }
      
      isSuperAdmin = adminCodeDoc.isSuperAdminCode;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      username: fullName.split(" ")[0].toLowerCase(),
      fullName,
      email,
      password: hashedPassword,
      role: isSuperAdmin ? "superadmin" : role,
      isSuperAdmin: isSuperAdmin,
      permissions: isSuperAdmin ? [] : [], // Super admins get full access, regular admins get none by default
      ...(role === "student" ? { grade } : {}),
      ...(role === "teacher" ? { subject, school } : {}),
      ...(role === "admin" ? { adminCode, institute } : {}),
    };

    const newUser = new User(userData);
    await newUser.save();
    
    // Add user to admin code's usedBy array
    if (role === "admin") {
      await AdminCode.findOneAndUpdate(
        { code: adminCode },
        { $push: { usedBy: newUser._id } }
      );
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: "JWT_SECRET is not configured on server" });
    }

    const token = jwt.sign(
      { 
        id: newUser._id, 
        email: newUser.email, 
        role: newUser.role, 
        fullName: newUser.fullName, 
        isSuperAdmin: newUser.isSuperAdmin || false,
        permissions: newUser.permissions || []
      },
      secret,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      role: newUser.role,
      isSuperAdmin: newUser.isSuperAdmin || false,
      permissions: newUser.permissions || []
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

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role, 
        fullName: user.fullName, 
        isSuperAdmin: user.isSuperAdmin || false,
        permissions: user.permissions || []
      },
      secret,
      { expiresIn: "1h" }
    );

    user.last_login = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin || false,
      permissions: user.permissions || []
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

export const getInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find().select('name location');
    
    return res.status(200).json({
      success: true,
      institutes: institutes || []
    });
  } catch (error) {
    console.error("Get institutes error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching institutes" });
  }
};