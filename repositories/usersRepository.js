import mongoose from "mongoose";
import User from "../models/User.js";

function requireValidId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    const error = new Error("Invalid user ID");
    error.code = "INVALID_USER_ID";
    throw error;
  }
}

function normalizeEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    const error = new Error("Invalid user email");
    error.code = "INVALID_USER_EMAIL";
    throw error;
  }
  return email.trim().toLowerCase();
}

async function insertUser({ name, email, passwordHash }, role) {
  const normalizedEmail = normalizeEmail(email);
  // unique email index before concurrent registrations.
  await User.init();
  const user = await User.create({ name, email: normalizedEmail, passwordHash, role });
  return user.toObject();
}

// ignore extra fields
export async function createUser({ name, email, passwordHash }) {
  return insertUser({ name, email, passwordHash }, "member");
}

// dont expose
// An existing account causes a duplicate-key error.
export async function createAdmin({ name, email, passwordHash }) {
  return insertUser({ name, email, passwordHash }, "admin");
}

export async function findById(id) {
  requireValidId(id);
  return User.findById(id).lean().exec();
}

export async function findByEmail(email) {
  return User.findOne({ email: normalizeEmail(email) }).lean().exec();
}

// Only authentication code
export async function findByEmailForAuthentication(email) {
  return User.findOne({ email: normalizeEmail(email) })
    .select("+passwordHash").lean().exec();
}
