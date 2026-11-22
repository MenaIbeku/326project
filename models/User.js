import mongoose from "mongoose";

// Checks the storage format only
const bcryptHashPattern = /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

function omitPasswordHash(_document, result) {
  delete result.passwordHash;
  return result;
}

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
    role: {
      type: String,
      required: true,
      enum: ["member", "admin"],
      default: "member",
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
    toJSON: { transform: omitPasswordHash },
    toObject: { transform: omitPasswordHash },
  },
);

export default mongoose.model("User", userSchema);
