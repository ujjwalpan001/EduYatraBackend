import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question.js';
import QuestionBank from './models/QuestionBank.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abhi20025:abhi123@cluster0.zc2ho.mongodb.net/ExamZone?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    findBanksWithQuestions();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function findBanksWithQuestions() {
  try {
    // Get all question banks
    const banks = await QuestionBank.find({ deleted_at: null }).select('_id name');
    
    console.log(`\n📊 Found ${banks.length} question banks\n`);
    console.log('Checking which banks have questions...\n');
    
    for (const bank of banks) {
      const questionCount = await Question.countDocuments({ 
        question_bank_id: bank._id,
        deleted_at: null 
      });
      
      if (questionCount > 0) {
        console.log(`✅ Bank: "${bank.name}"`);
        console.log(`   ID: ${bank._id}`);
        console.log(`   Questions: ${questionCount}`);
        
        // Check if questions have content
        const sampleQuestion = await Question.findOne({ 
          question_bank_id: bank._id,
          deleted_at: null 
        });
        
        if (sampleQuestion) {
          console.log(`   Sample question has:`);
          console.log(`   - latex_code: ${sampleQuestion.latex_code ? '✅' : '❌'}`);
          console.log(`   - katex_code: ${sampleQuestion.katex_code ? '✅' : '❌'}`);
        }
        console.log('');
      } else {
        console.log(`⚠️  Bank: "${bank.name}" (ID: ${bank._id}) - NO QUESTIONS`);
      }
    }
    
    console.log('\n✅ Done!\n');
    mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}
