import QuestionBank from "../models/QuestionBank.js";
import Question from "../models/Question.js";

export const getAllQuestionBanks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let questionBanks;
    if (userRole === "student") {
      // Students see public/shared question banks only (excluding soft-deleted)
      questionBanks = await QuestionBank.find({
        deleted_at: null,
        $or: [
          { visibility: { $in: ["public"] } },
          { created_by: userId },
        ],
      }).populate("created_by", "fullName");
    } else {
      // Teachers and admins see own banks + other teachers' public/shared banks (excluding soft-deleted)
      questionBanks = await QuestionBank.find({
        deleted_at: null,
        $or: [
          { created_by: userId },
          { visibility: { $in: ["public"] } },
        ],
      }).populate("created_by", "fullName");
    }

    // Enrich data with question count and difficulty
    const enrichedData = await Promise.all(
      questionBanks.map(async (bank) => {
        const questions = await Question.find({ question_bank_id: bank._id });
        const toDifficultyScore = (question) => {
          if (typeof question.difficulty_rating === 'number' && question.difficulty_rating > 0) {
            return question.difficulty_rating;
          }

          const level = String(question.level || '').toLowerCase();
          if (level === 'hard') return 3;
          if (level === 'medium') return 2;
          return 1;
        };

        const totalDifficulty = questions.reduce((sum, q) => sum + toDifficultyScore(q), 0);
        const avgDifficulty = questions.length > 0 ? totalDifficulty / questions.length : 1;
        const difficultyLabel =
          avgDifficulty >= 3 ? "Hard" : avgDifficulty >= 2 ? "Medium" : "Easy";

        const ownerId = bank.created_by?._id?.toString() || bank.created_by?.toString();
        const isOwner = ownerId === userId;

        return {
          _id: bank._id,
          name: bank.name,
          course_code: bank.course_code,
          questions: questions.length,
          difficulty: difficultyLabel,
          visibility: bank.visibility,
          created_at: bank.created_at,
          updated_at: bank.updated_at,
          // Ownership info for frontend to conditionally show edit/delete and creator name
          isOwner,
          createdByName: isOwner ? null : (bank.created_by?.fullName || null),
          created_by_id: ownerId || null,
        };
      })
    );

    res.status(200).json({ success: true, data: enrichedData });
  } catch (error) {
    console.error("Error fetching question banks:", error);
    res.status(500).json({ success: false, error: "Server error fetching question banks" });
  }
};

export const getQuestionsByBankId = async (req, res) => {
  try {
    const { questionBankId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify user has access to the question bank
    const questionBank = await QuestionBank.findById(questionBankId);
    if (!questionBank) {
      return res.status(404).json({ success: false, error: "Question bank not found" });
    }
    if (
      questionBank.visibility === "private" &&
      userRole !== "admin" &&
      questionBank.created_by.toString() !== userId
    ) {
      return res.status(403).json({ success: false, error: "Unauthorized access" });
    }

    // All questions in the bank are returned — visibility is controlled at bank level only
    const questionFilter = { question_bank_id: questionBankId, deleted_at: null };

    const questions = await Question.find(questionFilter).select(
      '_id latex_code katex_code question_type difficulty_rating subject correct_option_latex correct_option_katex incorrect_option_latex incorrect_option_katex topic Sub_topic'
    );

    console.log(`✅ getQuestionsByBankId: Found ${questions.length} questions for bank ${questionBankId}`);
    if (questions.length > 0) {
      console.log('📝 First question has:', {
        id: questions[0]._id,
        latex_code: !!questions[0].latex_code,
        katex_code: !!questions[0].katex_code,
        subject: questions[0].subject,
      });
    }

    res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ success: false, error: "Server error fetching questions" });
  }
};

export const createQuestionBank = async (req, res) => {
  try {
    const { name, course_code, visibility } = req.body;
    const userId = req.user.id;

    if (!name || !course_code) {
      return res
        .status(400)
        .json({ success: false, error: "Name and course code are required" });
    }

    const questionBank = new QuestionBank({
      name,
      course_code,
      created_by: userId,
      visibility: visibility || "private",
    });

    await questionBank.save();
    res.status(201).json({
      success: true,
      questionBank: {
        _id: questionBank._id,
        name: questionBank.name,
        course_code: questionBank.course_code,
        questions: 0,
        difficulty: "Easy",
        visibility: questionBank.visibility,
        created_at: questionBank.created_at,
        updated_at: questionBank.updated_at,
      },
    });
  } catch (error) {
    console.error("Error creating question bank:", error);
    res.status(500).json({ success: false, error: "Server error creating question bank" });
  }
};

export const deleteQuestionBank = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const questionBank = await QuestionBank.findById(id);
    if (!questionBank) {
      return res.status(404).json({ success: false, error: "Question bank not found" });
    }

    // Only owner or admin can delete
    if (questionBank.created_by.toString() !== userId && userRole !== "admin") {
      return res.status(403).json({ success: false, error: "Only the owner can delete this question bank" });
    }

    // Soft delete
    questionBank.deleted_at = new Date();
    await questionBank.save();

    res.status(200).json({ success: true, message: "Question bank deleted successfully" });
  } catch (error) {
    console.error("Error deleting question bank:", error);
    res.status(500).json({ success: false, error: "Server error deleting question bank" });
  }
};

export const updateQuestionBank = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { visibility, name, course_code } = req.body;

    const questionBank = await QuestionBank.findById(id);
    if (!questionBank) {
      return res.status(404).json({ success: false, error: "Question bank not found" });
    }

    // Only the owner or admin can update
    if (questionBank.created_by.toString() !== userId && userRole !== "admin") {
      return res.status(403).json({ success: false, error: "Only the owner can edit this question bank" });
    }

    // Apply updates
    if (visibility) questionBank.visibility = visibility;
    if (name) questionBank.name = name;
    if (course_code) questionBank.course_code = course_code;
    questionBank.updated_at = new Date();

    await questionBank.save();

    res.status(200).json({
      success: true,
      questionBank: {
        _id: questionBank._id,
        name: questionBank.name,
        course_code: questionBank.course_code,
        visibility: questionBank.visibility,
        updated_at: questionBank.updated_at,
      },
    });
  } catch (error) {
    console.error("Error updating question bank:", error);
    res.status(500).json({ success: false, error: "Server error updating question bank" });
  }
};
