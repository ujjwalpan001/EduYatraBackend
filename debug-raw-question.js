import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abhi20025:abhi123@cluster0.zc2ho.mongodb.net/ExamZone?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    debugQuestion();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function debugQuestion() {
  try {
    // Get one question
    const question = await Question.findOne({ question_bank_id: '6880f0ac9de1667ac43d1fed' });
    
    if (!question) {
      console.log('❌ No question found for that bank');
      mongoose.disconnect();
      process.exit(0);
    }
    
    console.log('\n📝 RAW QUESTION DATA:\n');
    console.log('ID:', question._id);
    console.log('\n--- LATEX_CODE ---');
    console.log('Type:', typeof question.latex_code);
    console.log('Length:', question.latex_code?.length);
    console.log('Content:', JSON.stringify(question.latex_code));
    
    console.log('\n--- KATEX_CODE ---');
    console.log('Type:', typeof question.katex_code);
    console.log('Length:', question.katex_code?.length);
    console.log('First 200 chars:', question.katex_code?.substring(0, 200));
    console.log('Content (JSON):', JSON.stringify(question.katex_code?.substring(0, 200)));
    
    console.log('\n--- CORRECT OPTION KATEX ---');
    console.log('Type:', typeof question.correct_option_katex);
    console.log('Length:', question.correct_option_katex?.length);
    console.log('First 100 chars:', question.correct_option_katex?.substring(0, 100));
    
    console.log('\n--- INCORRECT OPTIONS KATEX ---');
    console.log('Type:', typeof question.incorrect_option_katex);
    console.log('Is Array:', Array.isArray(question.incorrect_option_katex));
    console.log('Length:', question.incorrect_option_katex?.length);
    if (question.incorrect_option_katex && question.incorrect_option_katex.length > 0) {
      console.log('First option length:', question.incorrect_option_katex[0]?.length);
      console.log('First option preview:', question.incorrect_option_katex[0]?.substring(0, 100));
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
