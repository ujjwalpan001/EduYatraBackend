import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

    if (role === "admin" && (!adminCode || !institution)) {
      return res.status(400).json({ success: false, error: "Admin code and institution are required for admins" });
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
      ...(role === "student" ? { grade } : {}),
      ...(role === "teacher" ? { subject, school } : {}),
      ...(role === "admin" ? { adminCode, institution } : {}),
    };

    const newUser = new User(userData);
    await newUser.save();

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: "JWT_SECRET is not configured on server" });
    }

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role, fullName: newUser.fullName }, // Include fullName
      secret,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      role: newUser.role,
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
      { id: user._id, email: user.email, role: user.role, fullName: user.fullName }, // Include fullName
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