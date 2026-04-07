/**
 * One-time script: upload existing walkthrough videos to Cloudinary
 * and create Tutorial documents in MongoDB.
 *
 * Usage: npx tsx walkthroughs/upload-existing.ts
 */
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

// Load env from .env or server .env
config({ path: path.resolve(__dirname, '..', '.env') });
config({ path: path.resolve(__dirname, '..', 'server', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!MONGODB_URI || !CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('Missing env vars. Need: MONGODB_URI, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  console.error('Create a .env file in project root or set them in environment.');
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

// Tutorial schema (inline to avoid import issues)
const tutorialSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: { type: String, default: 'ready' },
  videoUrl: String,
  publicId: String,
  thumbnailUrl: String,
  createdAt: { type: Date, default: Date.now },
  createdBy: String,
});
const Tutorial = mongoose.model('Tutorial', tutorialSchema, 'tutorials');

// Videos to upload
const videos = [
  {
    file: 'walkthrough-videos/export-library-narrated.mp4',
    title: 'ייצוא משחק מספרייה',
    description: 'איך לייצא משחק מספריית התוכן ולשמור אותו במערכת',
  },
];

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected!\n');

  for (const video of videos) {
    const filePath = path.resolve(__dirname, '..', video.file);

    if (!existsSync(filePath)) {
      console.log(`⚠️  Skipping "${video.title}" — file not found: ${video.file}`);
      continue;
    }

    console.log(`📤 Uploading "${video.title}"...`);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        { resource_type: 'video', folder: 'yooz/tutorials' },
        (err, res) => (err ? reject(err) : resolve(res as { secure_url: string; public_id: string })),
      );
    });

    console.log(`   ✅ Uploaded: ${result.secure_url}`);

    await Tutorial.create({
      title: video.title,
      description: video.description,
      status: 'ready',
      videoUrl: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl: result.secure_url.replace(/\.\w+$/, '.jpg'),
      createdBy: 'admin@yooz.com',
    });

    console.log(`   ✅ Saved to DB\n`);
  }

  await mongoose.disconnect();
  console.log('Done! Check the סרטוני הדרכה tab.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
