import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question.js';

dotenv.config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abhi20025:abhi123@cluster0.zc2ho.mongodb.net/ExamZone?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    checkQuestions();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function checkQuestions() {
  try {
    console.log('\n🔍 Checking questions in database...\n');
    
    // Get total count
    const totalCount = await Question.countDocuments();
    console.log(`📊 Total questions in database: ${totalCount}\n`);
    
    // Get first 3 questions
    const questions = await Question.find().limit(3);
    
    if (questions.length === 0) {
      console.log('❌ No questions found in database!');
      process.exit(0);
    }
    
    questions.forEach((q, index) => {
      console.log(`\n📝 Question #${index + 1}:`);
      console.log(`   ID: ${q._id}`);
      console.log(`   Subject: ${q.subject || 'N/A'}`);
      console.log(`   Question Type: ${q.question_type || 'N/A'}`);
      console.log(`   Topic: ${q.topic || 'N/A'}`);
      console.log(`   Difficulty: ${q.difficulty_rating || 'N/A'}`);
      console.log(`   \n   📄 Content Fields:`);
      console.log(`   - latex_code: ${q.latex_code ? `✅ (${q.latex_code.length} chars) "${q.latex_code.substring(0, 80)}..."` : '❌ EMPTY/MISSING'}`);
      console.log(`   - katex_code: ${q.katex_code ? `✅ (${q.katex_code.length} chars) "${q.katex_code.substring(0, 80)}..."` : '❌ EMPTY/MISSING'}`);
      console.log(`   - correct_option_latex: ${q.correct_option_latex ? `✅ (${q.correct_option_latex.length} chars)` : '❌ EMPTY/MISSING'}`);
      console.log(`   - correct_option_katex: ${q.correct_option_katex ? `✅ (${q.correct_option_katex.length} chars)` : '❌ EMPTY/MISSING'}`);
      console.log(`   - incorrect_option_latex: ${q.incorrect_option_latex && q.incorrect_option_latex.length > 0 ? `✅ (${q.incorrect_option_latex.length} options)` : '❌ EMPTY/MISSING'}`);
      console.log(`   - incorrect_option_katex: ${q.incorrect_option_katex && q.incorrect_option_katex.length > 0 ? `✅ (${q.incorrect_option_katex.length} options)` : '❌ EMPTY/MISSING'}`);
      console.log(`   \n   🏦 Question Bank: ${q.question_bank_id}`);
    });
    
    console.log('\n✅ Done! Check the output above.\n');
    mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}
