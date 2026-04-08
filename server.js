import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import questionRoutes from './routes/questionRoutes.js';
import onlineTestRoutes from './routes/onlineTestRoutes.js';
import questionBankRoutes from './routes/questionBankRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { authenticateToken } from './middleware/auth.js';
import Question from './models/Question.js';
import User from './models/User.js';
import QuestionBank from './models/QuestionBank.js';
import Course from './models/Course.js';
import Institute from './models/Institute.js';
import Class from './models/Class.js';
import QuestionSet from './models/QuestionSet.js';
import QuestionSetQues from './models/QuestionSetQues.js';
import TestSubmission from './models/TestSubmission.js';
import mongoose from 'mongoose';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration
const allowedOrigins = [
  'https://www.deskoros.tech',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://eduyatra.vercel.app',
  'https://edu-yatra.vercel.app',
  // Add any specific local or dev origins here as needed.
];

const isLocalOrigin = (origin) => {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)(:\d+)?$/.test(origin);
};

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin) || isLocalOrigin(origin)) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    // Allow Vercel preview and production domains.
    if (hostname.endsWith('.vercel.app')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Support Authorization headers for JWT
}));

// Enable preflight for all routes
// app.options('*', cors());

// Middlewares
app.use(express.json());

// Routes
app.use('/api/questions', questionRoutes);
app.use('/api/exams', authenticateToken, onlineTestRoutes);
app.use('/api/question-banks', authenticateToken, questionBankRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', authenticateToken, classRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/content', contentRoutes);
app.use('/api/public', publicRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Log registered models for debugging
console.log('Registered Mongoose models:', mongoose.modelNames());

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces
app.listen(PORT, HOST, () => {
  console.log(`🚀 API is running on port ${PORT}`);
  console.log(`📡 Server accessible at:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://10.1.171.137:${PORT}`);
});
