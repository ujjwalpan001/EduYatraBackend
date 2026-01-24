// backend/seed-institutes.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Institute from './models/Institute.js';

// Load environment variables
dotenv.config();

const seedInstitutes = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/eduyatra';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Default institutes
    const defaultInstitutes = [
      { name: 'SRMAP', location: 'Mangalagiri, Andhra Pradesh' },
      { name: 'VIT AP', location: 'Amaravati, Andhra Pradesh' },
      { name: 'SRM KTR', location: 'Kattankulathur, Tamil Nadu' },
      { name: 'KLU', location: 'Vaddeswaram, Andhra Pradesh' }
    ];

    console.log('🌱 Seeding institutes...');
    let created = 0;
    let existing = 0;

    for (const inst of defaultInstitutes) {
      const existingInst = await Institute.findOne({ name: inst.name });
      if (!existingInst) {
        await Institute.create(inst);
        console.log(`  ✅ Created: ${inst.name}`);
        created++;
      } else {
        console.log(`  ℹ️  Already exists: ${inst.name}`);
        existing++;
      }
    }

    console.log('\n🎉 Institute seeding completed!');
    console.log(`📊 Summary: ${created} created, ${existing} already existed`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding institutes:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Make sure MongoDB is running');
    console.error('  2. Check MONGO_URI in .env file');
    console.error('  3. Default: mongodb://localhost:27017/eduyatra');
    process.exit(1);
  }
};

seedInstitutes();
