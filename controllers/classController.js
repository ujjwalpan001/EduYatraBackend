import mongoose from 'mongoose';
import Class from '../models/Class.js';

export const getClasses = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      console.log('Unauthorized access attempt:', { userId: user?.id, role: user?.role });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const classes = await Class.find({ teacher_id: user.id, deleted_at: null })
      .select('_id class_name students')
      .lean();
    console.log(`Fetched ${classes.length} classes for user ${user.id}:`, classes);
    return res.status(200).json({ success: true, classes });
  } catch (error) {
    console.error('❌ Error fetching classes:', error);
    return res.status(500).json({ success: false, error: `Failed to fetch classes: ${error.message}` });
  }
};

export const createClass = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { class_name, invitation_code, institute_id, course_id, max_students, students } = req.body;
    if (!class_name || !invitation_code || !institute_id || !course_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const classDoc = new Class({
      class_name,
      invitation_code,
      institute_id,
      course_id,
      teacher_id: user.id,
      max_students: max_students || null,
      students: students || [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    await classDoc.save();
    return res.status(201).json({ success: true, class: classDoc });
  } catch (error) {
    return res.status(500).json({ success: false, error: `Failed to create class: ${error.message}` });
  }
};


export const updateStudent = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { classId, studentId } = req.params;
    const { name, email, userId, isSelected } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, error: 'Invalid class ID' });
    }

    const classDoc = await Class.findOne({ _id: classId, teacher_id: user.id, deleted_at: null });
    if (!classDoc) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const student = classDoc.students.find(s => s._id.toString() === studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (name) student.name = name;
    if (email) student.email = email;
    if (userId) student.userId = userId;
    if (typeof isSelected === 'boolean') student.isSelected = isSelected;

    classDoc.updated_at = new Date();
    await classDoc.save();

    return res.status(200).json({ success: true, class: classDoc });
  } catch (error) {
    return res.status(500).json({ success: false, error: `Failed to update student: ${error.message}` });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { classId, studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, error: 'Invalid class ID' });
    }

    const classDoc = await Class.findOne({ _id: classId, teacher_id: user.id, deleted_at: null });
    if (!classDoc) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const studentIndex = classDoc.students.findIndex(s => s._id.toString() === studentId);
    if (studentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    classDoc.students.splice(studentIndex, 1);
    classDoc.updated_at = new Date();
    await classDoc.save();

    return res.status(200).json({ success: true, class: classDoc });
  } catch (error) {
    return res.status(500).json({ success: false, error: `Failed to delete student: ${error.message}` });
  }
};