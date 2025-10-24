import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Class from '../models/Class.js';
import ClassStudent from '../models/ClassStudent.js';
import User from '../models/User.js';

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

    console.log(`📝 Creating class: ${class_name} with ${students?.length || 0} students`);

    // Process students - find or create user accounts
    const processedStudents = [];
    const classStudentEntries = [];
    
    if (students && students.length > 0) {
      for (const student of students) {
        if (!student.name || !student.email) {
          console.warn(`⚠️ Skipping student with missing name or email:`, student);
          continue;
        }

        let studentUser = null;
        
        // Try to find existing user by userId first
        if (student.userId && mongoose.Types.ObjectId.isValid(student.userId)) {
          studentUser = await User.findById(student.userId);
        }
        
        // If not found by userId, try by email
        if (!studentUser && student.email) {
          studentUser = await User.findOne({ email: student.email });
        }
        
        // If user still not found, create a new student account
        if (!studentUser) {
          try {
            // Generate username from email (before @ symbol)
            const username = student.email.split('@')[0];
            
            // Generate a random password and hash it
            const tempPassword = Math.random().toString(36).slice(-10);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(tempPassword, salt);
            
            studentUser = new User({
              username: username,
              email: student.email,
              role: 'student',
              password: hashedPassword,
              email_verified: false,
              created_at: new Date(),
              updated_at: new Date()
            });
            await studentUser.save();
            console.log(`✅ Created new student user: ${student.email} (username: ${username})`);
          } catch (createError) {
            console.error(`❌ Failed to create user for ${student.email}:`, createError);
            console.error(`❌ Error details:`, createError.message);
            // If username already exists, try with a random suffix
            if (createError.code === 11000) {
              try {
                const randomSuffix = Math.random().toString(36).substring(2, 6);
                const altUsername = `${student.email.split('@')[0]}_${randomSuffix}`;
                
                // Generate a random password and hash it
                const tempPassword = Math.random().toString(36).slice(-10);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(tempPassword, salt);
                
                studentUser = new User({
                  username: altUsername,
                  email: student.email,
                  role: 'student',
                  password: hashedPassword,
                  email_verified: false,
                  created_at: new Date(),
                  updated_at: new Date()
                });
                await studentUser.save();
                console.log(`✅ Created new student user with alternate username: ${student.email} (username: ${altUsername})`);
              } catch (retryError) {
                console.error(`❌ Failed to create user even with alternate username:`, retryError.message);
                continue;
              }
            } else {
              continue;
            }
          }
        }

        // Add to processed students array with valid userId
        processedStudents.push({
          name: student.name,
          email: student.email,
          userId: studentUser._id,
          isSelected: student.isSelected !== undefined ? student.isSelected : true
        });

        // Prepare ClassStudent entry
        classStudentEntries.push({
          class_id: null, // Will be set after class is created
          student_id: studentUser._id,
          joined_at: new Date(),
          is_active: true
        });
      }
    }

    // Create the class with processed students
    const classDoc = new Class({
      class_name,
      invitation_code,
      institute_id,
      course_id,
      teacher_id: user.id,
      max_students: max_students || null,
      students: processedStudents,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await classDoc.save();
    console.log(`✅ Created class: ${classDoc._id}`);
    
    // Create ClassStudent entries with the class_id
    if (classStudentEntries.length > 0) {
      classStudentEntries.forEach(entry => {
        entry.class_id = classDoc._id;
      });
      
      try {
        await ClassStudent.insertMany(classStudentEntries, { ordered: false });
        console.log(`✅ Created ${classStudentEntries.length} ClassStudent entries for class ${classDoc._id}`);
      } catch (insertError) {
        console.warn(`⚠️ Some ClassStudent entries may already exist:`, insertError.message);
      }
    }
    
    return res.status(201).json({ success: true, class: classDoc });
  } catch (error) {
    console.error('❌ Error creating class:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Invitation code already exists. Please use a unique code.' });
    }
    return res.status(500).json({ success: false, error: `Failed to create class: ${error.message}` });
  }
};

// Add students to an existing class
export const addStudents = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { classId } = req.params;
    const { students } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, error: 'Invalid class ID' });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, error: 'Students array is required' });
    }

    // Find the class and verify teacher access
    const classDoc = await Class.findOne({ _id: classId, teacher_id: user.id, deleted_at: null });
    if (!classDoc) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    console.log(`📝 Adding ${students.length} students to class ${classDoc.class_name}`);

    // Add students to Class.students array (existing behavior)
    classDoc.students.push(...students);
    classDoc.updated_at = new Date();
    await classDoc.save();

    // Also create ClassStudent entries for analytics
    const classStudentEntries = [];
    const warnings = [];

    for (const student of students) {
      let studentUser = null;
      
      // Try to find user by userId first, then by email
      if (student.userId) {
        studentUser = await User.findById(student.userId);
      }
      
      if (!studentUser && student.email) {
        studentUser = await User.findOne({ email: student.email });
      }

      if (studentUser) {
        // Check if ClassStudent entry already exists
        const existingEntry = await ClassStudent.findOne({
          class_id: classDoc._id,
          student_id: studentUser._id
        });

        if (!existingEntry) {
          classStudentEntries.push({
            class_id: classDoc._id,
            student_id: studentUser._id,
            joined_at: new Date(),
            is_active: true
          });
        } else {
          console.log(`ℹ️  ClassStudent entry already exists for ${student.name || student.email}`);
        }
      } else {
        warnings.push(`User not found for student: ${student.name || student.email}`);
        console.warn(`⚠️  Could not find User for student: ${student.name || student.email}`);
      }
    }

    // Insert new ClassStudent entries
    if (classStudentEntries.length > 0) {
      await ClassStudent.insertMany(classStudentEntries, { ordered: false });
      console.log(`✅ Created ${classStudentEntries.length} ClassStudent entries for class ${classDoc._id}`);
    }

    const response = { 
      success: true, 
      class: classDoc,
      classStudentEntriesCreated: classStudentEntries.length
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error adding students:', error);
    return res.status(500).json({ success: false, error: `Failed to add students: ${error.message}` });
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
    console.log('🗑️ DELETE student request from user:', user?.id, user?.role);
    
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      console.log('❌ Unauthorized delete student attempt');
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { classId, studentId } = req.params;
    console.log('📋 Delete student params:', { classId, studentId });

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      console.log('❌ Invalid class ID format');
      return res.status(400).json({ success: false, error: 'Invalid class ID' });
    }

    const classDoc = await Class.findOne({ _id: classId, teacher_id: user.id, deleted_at: null });
    if (!classDoc) {
      console.log('❌ Class not found or unauthorized');
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const studentIndex = classDoc.students.findIndex(s => s._id.toString() === studentId);
    if (studentIndex === -1) {
      console.log('❌ Student not found in class');
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const student = classDoc.students[studentIndex];
    console.log('👤 Found student to delete:', student.name, student.email);

    // Remove from Class.students array using $pull to avoid validation
    await Class.updateOne(
      { _id: classDoc._id },
      { 
        $pull: { students: { _id: studentId } },
        $set: { updated_at: new Date() }
      }
    );
    console.log('✅ Removed from Class.students array');

    // Also remove from ClassStudent collection if it exists
    if (student.userId) {
      const deleteResult = await ClassStudent.deleteOne({
        class_id: classDoc._id,
        student_id: student.userId
      });
      if (deleteResult.deletedCount > 0) {
        console.log(`✅ Deleted ClassStudent entry for student ${student.userId} in class ${classDoc._id}`);
      } else {
        console.log(`ℹ️  No ClassStudent entry found for student ${student.userId}`);
      }
    }

    console.log('✅ Student deletion successful');
    return res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting student:', error);
    return res.status(500).json({ success: false, error: `Failed to delete student: ${error.message}` });
  }
};

// Delete entire class/batch
export const deleteClass = async (req, res) => {
  try {
    const { user } = req;
    console.log('🗑️ DELETE class request from user:', user?.id, user?.role);
    
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      console.log('❌ Unauthorized delete class attempt');
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { classId } = req.params;
    console.log('📋 Delete class ID:', classId);

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      console.log('❌ Invalid class ID format');
      return res.status(400).json({ success: false, error: 'Invalid class ID' });
    }

    // Find the class and verify teacher access
    const classDoc = await Class.findOne({ _id: classId, teacher_id: user.id, deleted_at: null });
    if (!classDoc) {
      console.log('❌ Class not found or unauthorized');
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    console.log('📚 Found class to delete:', classDoc.class_name);

    // Soft delete: set deleted_at timestamp using updateOne to avoid validation
    await Class.updateOne(
      { _id: classDoc._id },
      { $set: { deleted_at: new Date() } }
    );
    console.log('✅ Class soft deleted');

    // Also delete all ClassStudent entries for this class
    const deleteResult = await ClassStudent.deleteMany({ class_id: classDoc._id });
    console.log(`✅ Deleted ${deleteResult.deletedCount} ClassStudent entries for class ${classDoc._id}`);

    return res.status(200).json({ 
      success: true, 
      message: 'Class deleted successfully',
      studentsRemoved: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('❌ Error deleting class:', error);
    return res.status(500).json({ success: false, error: `Failed to delete class: ${error.message}` });
  }
};