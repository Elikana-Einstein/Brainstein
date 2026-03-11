import {mongoose} from 'mongoose'
const { Schema } = mongoose;

const userSchema = new Schema({
  name: String,
  password: String,
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const canvasSchema = new Schema({
  canvasTitle: String,
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

const slideSchema = new Schema({
  slide: Schema.Types.Mixed,   // Fabric.js JSON
  previewImage: String,
  canvas: {
    type: Schema.Types.ObjectId,
    ref: "Canvas",
    required: true
  }
});

export const User = mongoose.model("User", userSchema);
export const Canvas = mongoose.model("Canvas", canvasSchema);
export const Slide = mongoose.model("Slide", slideSchema);
