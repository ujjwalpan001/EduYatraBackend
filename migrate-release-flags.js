import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exam from './models/Exam.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

async function migrateReleaseFlags() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Count total exams first
    const totalExams = await Exam.countDocuments({});
    console.log(`\n📊 Found ${totalExams} total exams in database`);

    // Force update ALL exams to set release flags to false
    const result = await Exam.updateMany(
      {}, // Update ALL exams
      {
        $set: {
          score_released: false,
          answers_released: false
        }
      }
    );

    console.log(`\n✅ Migration completed!`);
    console.log(`   Matched ${result.matchedCount} exams`);
    console.log(`   Updated ${result.modifiedCount} exams`);
    
    // Show sample exams with their release status
    const sampleExams = await Exam.find({}).select('title score_released answers_released').limit(10);
    console.log(`\n📊 Sample exams after migration (showing 10 of ${totalExams}):`);
    sampleExams.forEach((exam, index) => {
      console.log(`   ${index + 1}. ${exam.title}`);
      console.log(`      - score_released: ${exam.score_released}`);
      console.log(`      - answers_released: ${exam.answers_released}`);
    });

    console.log(`\n⚠️  All exams have been reset to score_released=false and answers_released=false`);
    console.log(`   Teachers must now toggle ON to release scores/answers to students`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateReleaseFlags();
