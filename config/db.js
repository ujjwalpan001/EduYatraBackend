import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/examzone_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true // Recommended options
    });
    console.log('MongoDB Connected: ExamZone');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

export default connectDB;