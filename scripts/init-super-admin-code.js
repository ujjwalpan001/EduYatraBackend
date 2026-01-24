// backend/scripts/init-super-admin-code.js
// Run this script once to initialize the super admin code in database
// Usage: node backend/scripts/init-super-admin-code.js

import mongoose from 'mongoose';
import AdminCode from '../models/AdminCode.js';
import dotenv from 'dotenv';

dotenv.config();

const initSuperAdminCode = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eduyatra');
    console.log('Connected to MongoDB');

    // Check if super admin code already exists
    const existingCode = await AdminCode.findOne({ code: '9804' });
    
    if (existingCode) {
      console.log('Super admin code (9804) already exists in database');
    } else {
      // Create super admin code
      await AdminCode.create({
        code: '9804',
        description: 'Super Admin Code - Master code that never expires',
        created_by: null, // System generated
        is_active: true,
        expires_at: null // Never expires
      });
      console.log('✅ Super admin code (9804) created successfully!');
      console.log('This code can be used for initial admin signup');
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error initializing super admin code:', error);
    process.exit(1);
  }
};

initSuperAdminCode();
