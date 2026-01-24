import express from "express";
import { signup, login, updateProfile } from "../controllers/userController.js";
import { getPublicInstitutes } from "../controllers/adminController.js";
import { authenticateToken } from "../middleware/auth.js"; // Named import

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.put("/profile", authenticateToken, updateProfile);
router.get("/institutes", getPublicInstitutes); // Public endpoint for signup

export default router;