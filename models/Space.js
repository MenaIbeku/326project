import mongoose from "mongoose";

const spaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    noiseLevel: { type: String, required: true },
    groupFriendly: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    capacity: { type: Number },
    owner: {type: mongoose.Schema.Types.ObjectId, ref: "User", required:true}
  },
  { timestamps: true, bufferCommands: false }
);

export default mongoose.model("Space", spaceSchema);
