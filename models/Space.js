import mongoose from "mongoose";

// Storage shape only service layer (Mena) for validation & rules
const spaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    noiseLevel: { type: String, required: true },
    groupFriendly: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    capacity: {type: Number, required: true}
  },
  { timestamps: true, bufferCommands: false },
);

export default mongoose.model("Space", spaceSchema);
