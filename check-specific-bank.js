import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abhi20025:abhi123@cluster0.zc2ho.mongodb.net/ExamZone?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    checkQuestionBank();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function checkQuestionBank() {
  try {
    // Check the bank ID from the console screenshot
    const bankId = '688136884be85ae4ef490291';
    
    const questions = await Question.find({ 
      question_bank_id: bankId,
      deleted_at: null 
    });
    
    console.log(`\n📊 Total questions for bank ${bankId}: ${questions.length}\n`);
    
    if (questions.length === 0) {
      console.log('❌ NO QUESTIONS FOUND for this bank!');
      mongoose.disconnect();
      process.exit(0);
    }
    
    // Check first 3 questions
    for (let i = 0; i < Math.min(3, questions.length); i++) {
      const q = questions[i];
      console.log(`\n📝 Question ${i + 1}: ${q._id}`);
      console.log(`   - latex_code: ${q.latex_code ? `✅ (${q.latex_code.length} chars) "${q.latex_code}"` : '❌ EMPTY/NULL'}`);
      console.log(`   - katex_code: ${q.katex_code ? `✅ (${q.katex_code.length} chars)` : '❌ EMPTY/NULL'}`);
      console.log(`   - subject: ${q.subject}`);
      console.log(`   - question_type: ${q.question_type}`);
      console.log(`   - correct_option_katex: ${q.correct_option_katex ? '✅' : '❌'}`);
      console.log(`   - incorrect_option_katex: ${q.incorrect_option_katex?.length || 0} options`);
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
