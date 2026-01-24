import express from "express";
import { signup, login, updateProfile } from "../controllers/userController.js";
import { authenticateToken } from "../middleware/auth.js"; // Named import

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.put("/profile", authenticateToken, updateProfile);

export default router;