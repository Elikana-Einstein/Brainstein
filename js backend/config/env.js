
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY,
};

if (!config.geminiApiKey) {
  throw new Error('GEMINI_API_KEY is missing from your environment.');
}
