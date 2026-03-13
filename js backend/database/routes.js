import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {User,Canvas,Slide} from './schema.js'

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // check if user exists
    const existingUser = await User.findOne({ email });
    console.log(existingUser);
    
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = new User({
      name:username,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: "User created successfully"
    });
    console.log(user);
    

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const login = async (req, res) => {
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
      userId: user._id,
      userName:user.name
    });
    console.log(user);
    

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addCanvas = async (req, res) => {
  try {
    const { canvasTitle, userId,context } = req.body;
      
      
    const canvas = new Canvas({
      canvasTitle, 
      user: userId,
      aiContext:context
    });

    await canvas.save();

    res.status(201).json({
      message: "Canvas created successfully",
      canvasId:canvas._id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
    
  }
};


export const addSlide = async (req, res) => {
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


export const getCanvas = async (req,res) => {
  
  
  try {
    const canvas = await Canvas.find({user:req.params.id});
    res.json({
      canvas
    })
    
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
    
  }
}

export const getSlides =async (req,res)=>{
  try{
    const slides = await Slide.find({canvas:req.params.id})
    res.json({
      slides
    })
  }catch (error){
     res.status(500).json({
      error: error.message
    });
  }
}

export const updateSlide =async(req, res) => {
  try {
    const { slide, previewImage } = req.body;
    const { slideId } = req.params;

    if (!slideId || !slide) {
      return res.status(400).json({ message: 'Slide ID and slide data required' });
    }

    // Update the slide document
    const updatedSlide = await Slide.findByIdAndUpdate(
      slideId,
      { 
        $set: { slide, previewImage } 
      },
      { returnDocument: 'after' } // returns the updated document
    );

    if (!updatedSlide) {
      return res.status(404).json({ message: 'Slide not found' });
    }

    res.status(201).json({ message: 'Slide updated successfully', slide: updatedSlide });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};



export const deleteSlide = async(req,res) => {
    const { slideId } = req.params;


  try {
    const deleted = await Slide.findByIdAndDelete(slideId);
    if (!deleted) {
      return res.status(404).json({ message: 'Slide not deleted' });
      
    }
    res.status(201).json({ message: 'Slide deleted successfully' });
    
  } catch (err) {
    console.error('Error deleting slide:', err);
    throw err;
  }
};