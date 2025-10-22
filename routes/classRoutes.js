import express from 'express';
import { createClass, getClasses, addStudents, updateStudent, deleteStudent, deleteClass } from '../controllers/classController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authenticateToken, createClass);
router.get('/', authenticateToken, getClasses);
router.post('/:classId/students', authenticateToken, addStudents);
router.patch('/:classId/students/:studentId', authenticateToken, updateStudent);
router.delete('/:classId/students/:studentId', authenticateToken, deleteStudent);
router.delete('/:classId', authenticateToken, deleteClass);

export default router;