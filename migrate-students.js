/**
 * Migration Script: Populate ClassStudent collection from existing Class.students data
 * 
 * This script:
 * 1. Finds all classes with students
 * 2. For each student, finds the User by userId or email
 * 3. Creates ClassStudent entries if they don't already exist
 * 
 * Run with: node migrate-students.js
 */

import mongoose from 'mongoose';
import Class from './models/Class.js';
import ClassStudent from './models/ClassStudent.js';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function migrateStudents() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected\n');

    // Find all classes with students
    const classes = await Class.find({ 
      deleted_at: null,
      students: { $exists: true, $ne: [] }
    });

    console.log(`📚 Found ${classes.length} classes with students\n`);

    let totalStudentsProcessed = 0;
    let totalEntriesCreated = 0;
    let totalEntriesSkipped = 0;
    let totalUserNotFound = 0;

    for (const classDoc of classes) {
      console.log(`\n📖 Processing class: ${classDoc.class_name} (${classDoc._id})`);
      console.log(`   Students in class: ${classDoc.students.length}`);

      const classStudentEntries = [];

      for (const student of classDoc.students) {
        totalStudentsProcessed++;
        let studentUser = null;

        // Try to find user by userId first
        if (student.userId) {
          try {
            studentUser = await User.findById(student.userId);
          } catch (err) {
            console.log(`   ⚠️  Invalid userId format for ${student.name || student.email}: ${student.userId}`);
          }
        }

        // If not found, try by email
        if (!studentUser && student.email) {
          studentUser = await User.findOne({ email: student.email });
        }

        if (studentUser) {
          // Check if ClassStudent entry already exists
          const existingEntry = await ClassStudent.findOne({
            class_id: classDoc._id,
            student_id: studentUser._id
          });

          if (!existingEntry) {
            classStudentEntries.push({
              class_id: classDoc._id,
              student_id: studentUser._id,
              joined_at: student.joined_at || new Date(),
              is_active: true
            });
          } else {
            totalEntriesSkipped++;
            console.log(`   ℹ️  Entry already exists for ${student.name || student.email}`);
          }
        } else {
          totalUserNotFound++;
          console.log(`   ❌ User not found for student: ${student.name || student.email} (${student.email || student.userId})`);
        }
      }

      // Insert new ClassStudent entries for this class
      if (classStudentEntries.length > 0) {
        await ClassStudent.insertMany(classStudentEntries, { ordered: false });
        totalEntriesCreated += classStudentEntries.length;
        console.log(`   ✅ Created ${classStudentEntries.length} ClassStudent entries`);
      } else {
        console.log(`   ℹ️  No new entries to create`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Classes processed: ${classes.length}`);
    console.log(`Students processed: ${totalStudentsProcessed}`);
    console.log(`New ClassStudent entries created: ${totalEntriesCreated}`);
    console.log(`Existing entries skipped: ${totalEntriesSkipped}`);
    console.log(`Users not found: ${totalUserNotFound}`);
    console.log('='.repeat(60) + '\n');

    if (totalUserNotFound > 0) {
      console.log('⚠️  WARNING: Some students could not be migrated because their User records were not found.');
      console.log('   This may be because:');
      console.log('   1. Students were added before user registration');
      console.log('   2. Email addresses don\'t match between Class.students and User collection');
      console.log('   3. userId references are incorrect\n');
    }

    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the migration
migrateStudents();
