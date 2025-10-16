import mongoose from 'mongoose';
import Class from './models/Class.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB\n');

// Get all classes
const classes = await Class.find({ deleted_at: null });

console.log(`📚 Found ${classes.length} classes:\n`);

classes.forEach((cls, idx) => {
  console.log(`${idx + 1}. Class: "${cls.class_name}"`);
  console.log(`   ID: ${cls._id}`);
  console.log(`   Students: ${cls.students?.length || 0}`);
  
  if (cls.students && cls.students.length > 0) {
    console.log(`   Student Details:`);
    cls.students.forEach((student, sidx) => {
      console.log(`      ${sidx + 1}. ${student.name} (${student.email})`);
      console.log(`         UserId: ${student.userId || 'MISSING'}`);
      console.log(`         IsSelected: ${student.isSelected}`);
    });
  } else {
    console.log(`   ⚠️ NO STUDENTS IN THIS CLASS!`);
  }
  console.log('');
});

mongoose.disconnect();
console.log('\n✅ Disconnected from MongoDB');
