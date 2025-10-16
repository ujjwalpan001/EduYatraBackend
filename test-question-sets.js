import mongoose from 'mongoose';
import QuestionSet from './models/QuestionSet.js';
import QuestionSetQuestion from './models/QuestionSetQues.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing QuestionSet and QuestionSetQuestion models...\n');

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB\n');

// Test 1: Check QuestionSet collection name
console.log('📦 Model Information:');
console.log(`   QuestionSet collection: ${QuestionSet.collection.name}`);
console.log(`   QuestionSetQuestion collection: ${QuestionSetQuestion.collection.name}`);

// Test 2: Check if any QuestionSets exist
const questionSetsCount = await QuestionSet.countDocuments();
console.log(`\n📊 Data Check:`);
console.log(`   Total QuestionSets: ${questionSetsCount}`);

if (questionSetsCount > 0) {
  const sampleSet = await QuestionSet.findOne().lean();
  console.log(`\n   Sample QuestionSet:`, JSON.stringify(sampleSet, null, 2));
  
  // Check questions for this set
  const questionsCount = await QuestionSetQuestion.countDocuments({ 
    questionset_id: sampleSet._id 
  });
  console.log(`\n   Questions for this set: ${questionsCount}`);
  
  if (questionsCount > 0) {
    const sampleQuestions = await QuestionSetQuestion.find({ 
      questionset_id: sampleSet._id 
    }).limit(3).lean();
    console.log(`\n   Sample Questions:`, JSON.stringify(sampleQuestions, null, 2));
  } else {
    console.log(`   ⚠️ No questions found in QuestionSetQuestion collection!`);
  }
}

// Test 3: Check all questions in QuestionSetQuestion collection
const allQuestionsCount = await QuestionSetQuestion.countDocuments();
console.log(`\n📋 Total QuestionSetQuestions in database: ${allQuestionsCount}`);

if (allQuestionsCount > 0) {
  const allQuestions = await QuestionSetQuestion.find().limit(5).lean();
  console.log(`\n   First 5 QuestionSetQuestions:`);
  allQuestions.forEach((q, idx) => {
    console.log(`   ${idx + 1}. QuestionSet ID: ${q.questionset_id}, Question ID: ${q.question_id}, Order: ${q.question_order}`);
  });
}

// Test 4: Show all collections in database
const collections = await mongoose.connection.db.listCollections().toArray();
console.log(`\n📚 All Collections in Database:`);
collections.forEach((col, idx) => {
  console.log(`   ${idx + 1}. ${col.name}`);
});

// Test 5: Raw query to check data
console.log(`\n🔍 Raw Collection Queries:`);
const rawQuestionSets = await mongoose.connection.db.collection('questionsets').countDocuments();
const rawQuestionSetQuestions = await mongoose.connection.db.collection('questionsetsquestion').countDocuments();
console.log(`   Raw questionsets count: ${rawQuestionSets}`);
console.log(`   Raw questionsetsquestion count: ${rawQuestionSetQuestions}`);

// Also check alternate spellings
const altNames = ['questionsetquestions', 'questionsetquestion', 'question_set_questions'];
for (const altName of altNames) {
  try {
    const count = await mongoose.connection.db.collection(altName).countDocuments();
    if (count > 0) {
      console.log(`   ⚠️ Found data in '${altName}': ${count} documents`);
    }
  } catch (err) {
    // Collection doesn't exist, that's fine
  }
}

mongoose.disconnect();
console.log('\n✅ Disconnected from MongoDB');
