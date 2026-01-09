// Quick test script to check TestSubmission structure
import mongoose from 'mongoose';
import TestSubmission from './models/TestSubmission.js';
import connectDB from './config/db.js';

const submissionId = '695f3ab5602e441ab0f698b3';

await connectDB();

mongoose.connection.once('open', async () => {
  try {
    console.log('🔍 Looking for submission:', submissionId);
    
    const submission = await TestSubmission.findById(submissionId).lean();
    
    if (!submission) {
      console.log('❌ Submission not found');
    } else {
      console.log('✅ Submission found:');
      console.log('   Exam ID:', submission.exam_id);
      console.log('   Student Email:', submission.student_email);
      console.log('   Question Set ID:', submission.question_set_id);
      console.log('   Answers type:', typeof submission.answers);
      console.log('   Answers is Map?:', submission.answers instanceof Map);
      console.log('   Answers keys:', submission.answers ? Array.from(submission.answers.keys()) : []);
      console.log('   Score:', submission.score);
      console.log('   Total Questions:', submission.total_questions);
      console.log('\n📋 Full submission object:');
      console.log(JSON.stringify(submission, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
});
