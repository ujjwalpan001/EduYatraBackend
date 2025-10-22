// Quick test script to verify TestSubmission model and data
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name';

async function testAttendedTests() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import the model
    const { default: TestSubmission } = await import('./models/TestSubmission.js');
    console.log('✅ TestSubmission model loaded:', TestSubmission.modelName);

    // Count total submissions
    const totalCount = await TestSubmission.countDocuments();
    console.log(`\n📊 Total test submissions in database: ${totalCount}`);

    if (totalCount > 0) {
      // Get all submissions
      const allSubmissions = await TestSubmission.find().limit(5).lean();
      console.log('\n📝 Sample submissions (up to 5):');
      allSubmissions.forEach((sub, idx) => {
        console.log(`\n${idx + 1}. Submission ID: ${sub._id}`);
        console.log(`   Student Email: ${sub.student_email}`);
        console.log(`   Exam ID: ${sub.exam_id}`);
        console.log(`   Score: ${sub.percentage}%`);
        console.log(`   Submitted At: ${sub.submitted_at}`);
      });

      // Group by student email
      const byStudent = await TestSubmission.aggregate([
        {
          $group: {
            _id: '$student_email',
            count: { $sum: 1 }
          }
        }
      ]);
      
      console.log('\n👥 Submissions by student:');
      byStudent.forEach(s => {
        console.log(`   ${s._id}: ${s.count} test(s)`);
      });
    } else {
      console.log('\n⚠️  No test submissions found in database');
      console.log('   Students need to complete tests first!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAttendedTests();
