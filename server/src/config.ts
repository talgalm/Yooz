import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
if (isProduction && !process.env.ADMIN_EMAIL) {
  throw new Error('ADMIN_EMAIL must be set in production');
}
if (isProduction && !process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD must be set in production');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-fallback';
export const CLIENT_BUILD_PATH = path.resolve(__dirname, '../../client/dist');
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yooz.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Cloudinary config
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

// Gemini AI config
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

if (!process.env.JWT_SECRET) {
  console.warn('⚠ JWT_SECRET not set in .env, using fallback (not safe for production)');
}
