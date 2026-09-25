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

export const MANAGE_OWNER_EMAIL = process.env.MANAGE_OWNER_EMAIL || 'admin@yooz.com';
export const MANAGE_OWNER_PASSWORD = process.env.MANAGE_OWNER_PASSWORD || 'eran6954';
export const MANAGE_OWNER_NAME = process.env.MANAGE_OWNER_NAME || 'Eran';
export const MANAGE_MEMBER_EMAIL = process.env.MANAGE_MEMBER_EMAIL || 'tal@yooz.com';
export const MANAGE_MEMBER_PASSWORD = process.env.MANAGE_MEMBER_PASSWORD || '123456';
export const MANAGE_MEMBER_NAME = process.env.MANAGE_MEMBER_NAME || 'Tal';

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

export const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || '';
export const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || '';

export const REGISTER_PHONE_KEY = process.env.REGISTER_PHONE_KEY || '';

export const TEXTME_API_TOKEN = process.env.TEXTME_API_TOKEN || '';
export const TEXTME_USERNAME = process.env.TEXTME_USERNAME || '';
export const TEXTME_SOURCE = process.env.TEXTME_SOURCE || 'Yooz';

export const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
export const EMAIL_FROM = 'דוחות אוטומטיים Yooz <reports@yooz.org.il>';

if (!process.env.JWT_SECRET) {
  console.warn('⚠ JWT_SECRET not set in .env, using fallback (not safe for production)');
}
