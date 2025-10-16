# 🗂️ MongoDB Collection Names Fixed!

## ✅ What Was Fixed

### **Problem:**
- Mongoose was creating collections with auto-generated names
- MongoDB collection was: `questionsetsquestion` (singular, lowercase)
- Code wasn't explicitly specifying collection names
- Questions weren't appearing in the correct MongoDB collection

### **Solution:**
Explicitly specified collection names in both models to match your MongoDB database:

1. **QuestionSet** → `questionsets` collection
2. **QuestionSetQuestion** → `questionsetsquestion` collection

## 🔧 Changes Made

### **1. QuestionSetQues.js Model**
```javascript
// BEFORE (auto-generated name, might be different):
mongoose.model('QuestionSetQuestion', questionSetQuestionSchema);

// AFTER (explicit collection name):
mongoose.model('QuestionSetQuestion', questionSetQuestionSchema, 'questionsetsquestion');
```

### **2. QuestionSet.js Model**
```javascript
// BEFORE:
mongoose.model('QuestionSet', questionSetSchema);

// AFTER:
mongoose.model('QuestionSet', questionSetSchema, 'questionsets');
```

## 📊 How MongoDB Collections Work Now

### **Collection: `questionsets`**
Stores the question set assignments for each student:
```javascript
{
  _id: ObjectId("..."),
  exam_id: ObjectId("68977eba8132d2078a1c4a90"),
  set_number: 1,
  student_email: "student@example.com",
  student_id: ObjectId("...") // optional
  link: "unique-link-here",
  is_completed: false,
  created_at: ISODate("2025-08-09T17:00:42.459Z")
}
```

### **Collection: `questionsetsquestion`**
Stores the actual questions for each question set:
```javascript
{
  _id: ObjectId("68977eba8132d2078a1c4a90"),
  questionset_id: ObjectId("68977eba8132d2078a1c4a8c"), // Links to questionsets
  question_id: ObjectId("68812ffd4be85ae4ef490249"),    // Links to questions
  question_order: 2,
  created_at: ISODate("2025-08-09T17:00:42.459Z"),
  __v: 0
}
```

## 🎯 What This Means

### **Before the Fix:**
- Collections might have been created with different names
- Data might not appear where expected in MongoDB Compass
- Hard to query and verify data

### **After the Fix:**
✅ All question sets save to: `questionsets`  
✅ All questions save to: `questionsetsquestion`  
✅ Consistent, predictable collection names  
✅ Easy to query and verify in MongoDB Compass  

## 🚀 How to Verify

### **1. Assign an Exam to a Class:**
```
POST /api/exams/:examId/assign-group
Body: { "groupId": "your_class_id" }
```

### **2. Check Terminal Logs:**
You'll see detailed output like:
```
📝 ASSIGNING SETS TO STUDENTS
[1/2] Student: Alice (alice@example.com)
   - Creating 5 QuestionSetQuestion documents...
   ✅ Successfully saved 5 questions to QuestionSetQuestion collection!

📊 FINAL RESULTS:
   ✅ Successful: 2
   - QuestionSets saved: 2
   - QuestionSetQuestions saved: 10
   - Expected questions: 10
```

### **3. Verify in MongoDB Compass:**

**Query `questionsets` collection:**
```javascript
db.questionsets.find({ exam_id: ObjectId("your_exam_id") })
```

**Query `questionsetsquestion` collection:**
```javascript
db.questionsetsquestion.find({
  questionset_id: ObjectId("your_questionset_id")
}).sort({ question_order: 1 })
```

### **4. Use Debug Endpoint:**
```
GET /api/exams/:examId/debug-sets
```

This will return:
```json
{
  "success": true,
  "examId": "68977eba8132d2078a1c4a90",
  "totalSets": 2,
  "totalQuestionsSaved": 10,
  "expectedTotalQuestions": 10,
  "allQuestionsMatch": true,
  "sets": [
    {
      "questionSetId": "...",
      "setNumber": 1,
      "studentEmail": "alice@example.com",
      "questionCount": 5,
      "questions": [
        { "questionId": "...", "order": 1 },
        { "questionId": "...", "order": 2 },
        ...
      ]
    }
  ]
}
```

## 📋 Collection Relationships

```
┌─────────────┐
│   exams     │
└──────┬──────┘
       │
       │ exam_id
       ▼
┌─────────────────┐
│  questionsets   │  ← Each student gets one set per exam
└────────┬────────┘
         │
         │ questionset_id
         ▼
┌──────────────────────┐
│ questionsetsquestion │  ← Questions for each set (with order)
└──────────────────────┘
```

## 🔍 Quick MongoDB Queries

### **See all question sets for an exam:**
```javascript
db.questionsets.find({ 
  exam_id: ObjectId("your_exam_id") 
})
```

### **See all questions in a specific set:**
```javascript
db.questionsetsquestion.find({ 
  questionset_id: ObjectId("your_questionset_id") 
}).sort({ question_order: 1 })
```

### **Count questions per set:**
```javascript
db.questionsetsquestion.aggregate([
  { $group: { 
    _id: "$questionset_id", 
    count: { $sum: 1 } 
  }}
])
```

### **Get complete set with questions:**
```javascript
db.questionsets.aggregate([
  { $match: { exam_id: ObjectId("your_exam_id") }},
  { $lookup: {
      from: "questionsetsquestion",
      localField: "_id",
      foreignField: "questionset_id",
      as: "questions"
  }},
  { $project: {
      set_number: 1,
      student_email: 1,
      questionCount: { $size: "$questions" },
      questions: 1
  }}
])
```

## ✨ Summary

**Before:** Collection names were auto-generated and inconsistent ❌  
**After:** Explicit collection names matching MongoDB: `questionsets` & `questionsetsquestion` ✅  

Now all your questions will be properly saved to the `questionsetsquestion` collection and easily accessible for checking, verification, and querying!

---

## 📝 Notes

- Collection names are **case-insensitive** in MongoDB but lowercase is convention
- The third parameter in `mongoose.model()` explicitly sets the collection name
- This ensures consistency across all database operations
- No data migration needed - just defines where new data goes
