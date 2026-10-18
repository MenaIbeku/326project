import mongoose from "mongoose";

// Storage shape only service layer (Mena) for validation & rules
const spaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true, bufferCommands: false },
);

export default mongoose.model("Space", spaceSchema);
