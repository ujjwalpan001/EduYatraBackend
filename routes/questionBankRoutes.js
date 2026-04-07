import express from "express";
import {
  getAllQuestionBanks,
  getQuestionsByBankId,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
} from "../controllers/questionBankController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/all", authenticateToken, getAllQuestionBanks);
router.get("/questions", authenticateToken, getQuestionsByBankId);
router.post("/create", authenticateToken, createQuestionBank);
router.patch("/:id", authenticateToken, updateQuestionBank);
router.delete("/:id", authenticateToken, deleteQuestionBank);

export default router;