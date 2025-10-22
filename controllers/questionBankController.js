import QuestionBank from "../models/QuestionBank.js";
import Question from "../models/Question.js";

export const getAllQuestionBanks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let questionBanks;
    if (userRole === "student") {
      // Students see public/shared question banks or those tied to their course/institute
      questionBanks = await QuestionBank.find({
        $or: [
          { visibility: { $in: ["public", "shared"] } },
          { created_by: userId }, // In case students create question banks
        ],
      }).populate("created_by", "fullName");
    } else {
      // Teachers and admins see only their own question banks
      questionBanks = await QuestionBank.find({ created_by: userId }).populate(
        "created_by",
        "fullName"
      );
    }

    // Enrich data with question count and difficulty
    const enrichedData = await Promise.all(
      questionBanks.map(async (bank) => {
        const questions = await Question.find({ question_bank_id: bank._id });
        const totalDifficulty = questions.reduce(
          (sum, q) => sum + (q.difficulty_rating || 1),
          0
        );
        const avgDifficulty = questions.length > 0 ? totalDifficulty / questions.length : 1;
        const difficultyLabel =
          avgDifficulty >= 3 ? "Hard" : avgDifficulty >= 2 ? "Medium" : "Easy";

        return {
          _id: bank._id,
          name: bank.name,
          course_code: bank.course_code,
          questions: questions.length,
          difficulty: difficultyLabel,
          visibility: bank.visibility,
          created_at: bank.created_at,
          updated_at: bank.updated_at,
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

    const questions = await Question.find({ 
      question_bank_id: questionBankId,
      deleted_at: null 
    }).select(
      '_id latex_code katex_code question_type difficulty_rating subject correct_option_latex correct_option_katex incorrect_option_latex incorrect_option_katex topic Sub_topic'
    );
    
    console.log(`✅ getQuestionsByBankId: Found ${questions.length} questions for bank ${questionBankId}`);
    if (questions.length > 0) {
      console.log('📝 First question has:', {
        id: questions[0]._id,
        latex_code: !!questions[0].latex_code,
        katex_code: !!questions[0].katex_code,
        subject: questions[0].subject
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