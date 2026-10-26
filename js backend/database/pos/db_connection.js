import { pool } from "../../database.js";


export const connectPosDB = async () => {
  try {
    const client = await pool.connect();
    console.log("PostgreSQL Connected Successfully!");
    client.release();
  } catch (error) {
    console.error("Database Connection Error:", error.message);
    process.exit(1);
  }
};


