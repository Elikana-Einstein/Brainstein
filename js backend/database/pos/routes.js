
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../database.js";

// SIGNUP
export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [username, email, hashedPassword]
    );

    return res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    console.error("Signup error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT id, name, email, password FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      userId: user.id,
      userName: user.name,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ADD CANVAS
export const addCanvas = async (req, res) => {
  try {
    const { canvasTitle, userId, context } = req.body;

    if (!canvasTitle || !userId) {
      return res.status(400).json({
        message: "Canvas title and user ID are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO canvases (canvas_title, user_id, ai_context)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [canvasTitle, userId, context ?? null]
    );

    const canvas = result.rows[0];

    return res.status(201).json({
      message: "Canvas created successfully",
      canvasId: canvas.id,
    });
  } catch (error) {
    console.error("Add canvas error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "User does not exist",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ADD SLIDE
export const addSlide = async (req, res) => {
  try {
    const { canvasId, slide, previewImage } = req.body;

    if (!canvasId || slide == null) {
      return res.status(400).json({
        message: "Canvas ID and slide data are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO slides (slide, preview_image, canvas_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [JSON.stringify(slide), previewImage ?? null, canvasId]
    );

    return res.status(201).json({
      message: "Slide added successfully",
      slide: result.rows[0],
    });
  } catch (error) {
    console.error("Add slide error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "Canvas does not exist",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// GET CANVASES FOR A USER
export const getCanvas = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, canvas_title, ai_context, user_id
       FROM canvases
       WHERE user_id = $1
       ORDER BY id DESC`,
      [id] 
    );

    return res.json({
      canvas: result.rows,
    });
  } catch (error) {
    console.error("Get canvases error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


// GET SLIDES FOR A CANVAS
export const getSlides = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, slide, preview_image, canvas_id
       FROM slides
       WHERE canvas_id = $1
       ORDER BY id ASC`,
      [id]
    );

    return res.json({
      slides: result.rows,
    });
  } catch (error) {
    console.error("Get slides error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


// UPDATE SLIDE
export const updateSlide = async (req, res) => {
  try {
    const { slide, previewImage } = req.body;
    const { slideId } = req.params;

    if (!slideId || slide == null) {
      return res.status(400).json({
        message: "Slide ID and slide data required",
      });
    }

    const result = await pool.query(
      `UPDATE slides
       SET slide = $1, preview_image = $2
       WHERE id = $3
       RETURNING *`,
      [
        JSON.stringify(slide),
        previewImage ?? null,
        slideId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Slide not found",
      });
    }

    return res.json({
      message: "Slide updated successfully",
      slide: result.rows[0],
    });
  } catch (error) {
    console.error("Update slide error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


// DELETE SLIDE
export const deleteSlide = async (req, res) => {
  try {
    const { slideId } = req.params;

    const result = await pool.query(
      "DELETE FROM slides WHERE id = $1 RETURNING id",
      [slideId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Slide not found",
      });
    }

    return res.json({
      message: "Slide deleted successfully",
    });
  } catch (error) {
    console.error("Delete slide error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
