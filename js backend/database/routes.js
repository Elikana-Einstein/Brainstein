const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
import {User} from './schema.js'
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: "User created successfully"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      userId: user._id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addCanvas = async (req, res) => {
  try {
    const { canvasTitle, userId } = req.body;

    const canvas = new Canvas({
      canvasTitle,
      user: userId
    });

    await canvas.save();

    res.status(201).json({
      message: "Canvas created successfully",
      canvas
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const addSlide = async (req, res) => {
  try {
    const { canvasId, slide, previewImage } = req.body;

    const newSlide = new Slide({
      slide: slide,          // Fabric.js JSON
      previewImage: previewImage,
      canvas: canvasId
    });

    await newSlide.save();

    res.status(201).json({
      message: "Slide added successfully",
      slide: newSlide
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};