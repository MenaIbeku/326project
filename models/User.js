import mongoose from "mongoose";

// Checks the storage format only - must hash passwords.
const bcryptHashPattern = /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: {
      type: String,
      required: true,
      select: false,
      match: [bcryptHashPattern, "passwordHash must be a bcrypt hash"],
    },
    // Signup must ignore client-provided roles <-
    role: { type: String, required: true, enum: ["member", "admin"], default: "member" },
  },
  {
    timestamps: true,
    bufferCommands: false,
    toJSON: {
      transform(_document, result) {
        delete result.passwordHash;
        return result;
      },
    },
  },
);

export default mongoose.model("User", userSchema);
