import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Class from './models/Class.js';

dotenv.config();

/**
 * Fix existing students to have isSelected: true
 * Run this script to update all students in all classes
 */
const fixStudentSelection = async () => {
  try {
    console.log('🔧 Fixing Student isSelected Field\n');
    console.log('='.repeat(70));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all classes
    const classes = await Class.find({ deleted_at: null });
    console.log(`Found ${classes.length} classes\n`);

    let totalUpdated = 0;
    let totalClasses = 0;

    for (const classDoc of classes) {
      console.log(`\n📚 Class: ${classDoc.class_name} (ID: ${classDoc._id})`);
      console.log(`   Students: ${classDoc.students.length}`);
      
      let needsUpdate = false;
      let studentsUpdated = 0;
      
      // Check each student
      for (let i = 0; i < classDoc.students.length; i++) {
        const student = classDoc.students[i];
        
        console.log(`   Student ${i + 1}: ${student.name} (${student.email})`);
        console.log(`      Current isSelected: ${student.isSelected}`);
        console.log(`      Has userId: ${!!student.userId}`);
        
        // Set isSelected to true if it's false or undefined
        if (student.isSelected !== true) {
          classDoc.students[i].isSelected = true;
          needsUpdate = true;
          studentsUpdated++;
          console.log(`      ✅ Will update to: true`);
        } else {
          console.log(`      ✓ Already true, no change needed`);
        }
      }
      
      // Save if changes were made
      if (needsUpdate) {
        await classDoc.save();
        console.log(`\n   ✅ Updated ${studentsUpdated} students in this class`);
        totalUpdated += studentsUpdated;
        totalClasses++;
      } else {
        console.log(`\n   ✓ No updates needed for this class`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 Summary:');
    console.log(`   Classes processed: ${classes.length}`);
    console.log(`   Classes updated: ${totalClasses}`);
    console.log(`   Total students updated: ${totalUpdated}`);
    console.log('='.repeat(70));

    if (totalUpdated > 0) {
      console.log('\n✅ Fix completed successfully!');
      console.log('💡 Now try assigning your exam again.');
    } else {
      console.log('\n✓ All students already have isSelected: true');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

fixStudentSelection();
