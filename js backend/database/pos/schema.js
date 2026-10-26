import { pool } from "../../database.js";


export const createTables = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      password TEXT NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS canvases (
      id SERIAL PRIMARY KEY,
      canvas_title VARCHAR(255),
      ai_context TEXT,
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS slides (
      id SERIAL PRIMARY KEY,
      slide JSONB,
      preview_image TEXT,
      canvas_id INTEGER NOT NULL
        REFERENCES canvases(id) ON DELETE CASCADE
    );
  `;

  try {
    await pool.query(query);
    console.log("PostgreSQL tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error.message);
    throw error;
  }
};
