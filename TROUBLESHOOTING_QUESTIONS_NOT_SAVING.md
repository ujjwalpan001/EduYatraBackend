# 🔧 Troubleshooting: Questions Not Saving to QuestionSetQuestion

## 🧪 Step 1: Test Collection Names

Call this endpoint to verify collection names:
```
GET http://localhost:5000/api/exams/YOUR_EXAM_ID/test-save
```

This will show you:
- Model collection names
- Document counts
- Raw MongoDB collection counts

Expected output:
```json
{
  "success": true,
  "collections": {
    "questionSetModel": "questionsets",
    "questionSetQuestionModel": "questionsetsquestion"
  },
  "counts": {
    "modelQuestionSets": 10,
    "modelQuestionSetQuestions": 50,
    "rawQuestionSets": 10,
    "rawQuestionSetQuestions": 50
  }
}
```

## 🔍 Step 2: Assign Exam and Check Logs

Assign an exam to a class and watch the terminal carefully:

```
POST http://localhost:5000/api/exams/YOUR_EXAM_ID/assign-group
Body: { "groupId": "YOUR_CLASS_ID" }
```

### Expected Terminal Output:
```
📝 ASSIGNING SETS TO STUDENTS
[1/2] Student: Alice (alice@example.com)
   - Creating QuestionSet document...
   ✅ QuestionSet saved! ID: 507f1f77bcf86cd799439011
   
   - Creating 5 QuestionSetQuestion documents...
   - Sample question mapping: {
       questionset_id: 507f1f77bcf86cd799439011,
       total_questions: 5,
       first_question: 68812ffd4be85ae4ef490249,
       last_question: 68812ffd4be85ae4ef490250
     }
   ✅ Successfully saved 5 questions to QuestionSetQuestion collection!
   - Question IDs saved: 68977eba..., 68977ebb..., ...
```

### ⚠️ If You See Errors:

**Error: "E11000 duplicate key error"**
- QuestionSet with same data already exists
- Solution: Delete old question sets first
  ```
  POST http://localhost:5000/api/exams/YOUR_EXAM_ID/regenerate-sets
  ```

**Error: "ValidationError"**
- Check that all required fields are present
- Make sure `questionset_id` and `question_id` are valid ObjectIds

**No Error But No Data:**
- Check MongoDB Compass to see if data is in a different collection
- Run the test-save endpoint to verify collection names

## 📊 Step 3: Verify in MongoDB Compass

### Check QuestionSets Collection:
1. Open MongoDB Compass
2. Navigate to your database
3. Look for collection: `questionsets`
4. Query: `{ exam_id: ObjectId("YOUR_EXAM_ID") }`

Expected result:
```javascript
{
  _id: ObjectId("..."),
  exam_id: ObjectId("YOUR_EXAM_ID"),
  set_number: 1,
  student_email: "student@example.com",
  student_id: ObjectId("..."),
  link: "...",
  is_completed: false,
  created_at: ISODate("...")
}
```

### Check QuestionSetQuestion Collection:
1. In MongoDB Compass
2. Look for collection: `questionsetsquestion` (singular, all lowercase)
3. Query: `{ questionset_id: ObjectId("QUESTIONSET_ID_FROM_ABOVE") }`

Expected result:
```javascript
{
  _id: ObjectId("..."),
  questionset_id: ObjectId("..."),
  question_id: ObjectId("..."),
  question_order: 1,
  created_at: ISODate("..."),
  __v: 0
}
```

## 🎯 Step 4: Use Debug Endpoint

```
GET http://localhost:5000/api/exams/YOUR_EXAM_ID/debug-sets
```

This shows all question sets with their questions:
```json
{
  "success": true,
  "examId": "...",
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
        { "id": "...", "questionId": "...", "order": 1 },
        { "id": "...", "questionId": "...", "order": 2 },
        ...
      ]
    }
  ]
}
```

## 🔎 Common Issues & Solutions

### Issue 1: Collection Name Mismatch
**Symptom:** Data saves but appears in wrong collection

**Check:**
```javascript
// In MongoDB Compass, list all collections
// Look for variations like:
// - questionsetquestions (plural)
// - questionsetquestion (singular)
// - question_set_questions (with underscores)
```

**Solution:** Already fixed in models - collections are explicitly named:
- `questionsets`
- `questionsetsquestion`

### Issue 2: Data Not Visible in Compass
**Symptom:** Terminal shows "saved" but Compass shows empty

**Solutions:**
1. **Refresh Compass:** Click the refresh button on the collection
2. **Check Filters:** Make sure no filters are applied
3. **Check Database:** Verify you're looking at the right database (should be "ExamZone")
4. **Query Directly:** Use query: `{}` to see all documents

### Issue 3: insertMany Fails Silently
**Symptom:** No error but questions don't save

**Debug Steps:**
1. Check if `questionsForThisSet` has data:
   ```javascript
   console.log('Questions to save:', questionsForThisSet);
   ```

2. Check if QuestionSet was saved:
   ```javascript
   console.log('Saved QuestionSet ID:', savedQuestionSet._id);
   ```

3. Verify question mapping:
   ```javascript
   console.log('Question mapping:', questionSetQuestions);
   ```

### Issue 4: Wrong Collection Being Used
**Symptom:** Questions save to different collection than expected

**Fix:** Run this query in MongoDB Compass to find where data went:
```javascript
// In Mongo Shell
db.getCollectionNames().forEach(function(collName) {
  var count = db[collName].count();
  if (count > 0) {
    print(collName + ": " + count);
  }
});
```

## 📝 Manual Verification Query

Run this in MongoDB Compass aggregation pipeline:

```javascript
[
  // Step 1: Get all question sets for your exam
  {
    $match: { exam_id: ObjectId("YOUR_EXAM_ID") }
  },
  // Step 2: Join with questions
  {
    $lookup: {
      from: "questionsetsquestion",
      localField: "_id",
      foreignField: "questionset_id",
      as: "questions"
    }
  },
  // Step 3: Show summary
  {
    $project: {
      set_number: 1,
      student_email: 1,
      questionCount: { $size: "$questions" },
      questions: 1
    }
  }
]
```

## ✅ Success Checklist

After assigning exam, verify:
- [ ] Terminal shows "✅ Successfully saved X questions to QuestionSetQuestion collection!"
- [ ] `questionsets` collection has documents
- [ ] `questionsetsquestion` collection has documents  
- [ ] Debug endpoint returns question data
- [ ] MongoDB Compass shows data in correct collections
- [ ] Student can access their exam questions

## 🆘 Still Not Working?

1. **Share Terminal Output:** Copy the full terminal output when assigning exam
2. **Check MongoDB Compass:** Screenshot showing collections and one document from each
3. **Test Endpoint:** Call `/test-save` and share the response
4. **Verify Exam ID:** Make sure you're using the correct exam ID

---

## Quick Test Commands

```bash
# Test 1: Check collection names and counts
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/exams/EXAM_ID/test-save

# Test 2: Get debug info
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/exams/EXAM_ID/debug-sets

# Test 3: Assign exam
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"CLASS_ID"}' \
  http://localhost:5000/api/exams/EXAM_ID/assign-group
```

Run these commands and check the responses!
