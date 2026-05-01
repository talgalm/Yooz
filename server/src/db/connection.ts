import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';

export async function connectDB(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 2,
  });
  console.log('✅ Connected to MongoDB');

  // Drop stale indexes that no longer match the schema
  try {
    const db = mongoose.connection.db;
    if (db) {
      const stationsIndexes = await db.collection('stations').indexes();
      if (stationsIndexes.some((idx) => idx.name === 'key_1')) {
        await db.collection('stations').dropIndex('key_1');
        console.log('🧹 Dropped stale key_1 index from stations');
      }
    }
  } catch {
    // Ignore if index doesn't exist
  }
}
