import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import questionRoutes from './routes/questionRoutes.js';
import onlineTestRoutes from './routes/onlineTestRoutes.js';
import questionBankRoutes from './routes/questionBankRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import { authenticateToken } from './middleware/auth.js';
import Question from './models/Question.js';
import User from './models/User.js';
import QuestionBank from './models/QuestionBank.js';
import Course from './models/Course.js';
import Institute from './models/Institute.js';
import Class from './models/Class.js';
import mongoose from 'mongoose';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.29.184:8080', // Added for frontend
  'http://localhost:8080',
  'https://edu-yatra.vercel.app', // Added for production
  // Optional: for local testing variations
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Log registered models for debugging
console.log('Registered Mongoose models:', mongoose.modelNames());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 API is running on port ${PORT}`));