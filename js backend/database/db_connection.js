import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS

import mongoose from 'mongoose';

// Use your connection string (Keep this in your .env file!)

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.uri);
    console.log(" MongoDB Connected with Mongoose");
  } catch (error) {
    console.error(" Connection Error:", error.message);
    process.exit(1); // Stop the server if the DB fails
  }
};
