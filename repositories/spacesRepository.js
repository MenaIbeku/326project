import mongoose from "mongoose";
import Space from "../models/Space.js";

function requireValidId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    const error = new Error("Invalid space ID");
    error.code = "INVALID_SPACE_ID";
    throw error;
  }
}

// Return plain objects so the service does not depend on Mongoose documents.
export async function listSpaces() {
  return Space.find().sort({ createdAt: -1, _id: -1 }).lean().exec();
}

export async function createSpace({
  name,
  location,
  noiseLevel,
  groupFriendly,
  isAvailable,
  capacity
}) {
  const space = await Space.create({
    name,
    location,
    noiseLevel,
    groupFriendly,
    isAvailable,
    capacity
  });
  return space.toObject();
}

export async function findById(id) {
  requireValidId(id);

  return Space.findById(id).lean().exec();
}

export async function updateById(id, changes) {
  requireValidId(id);

  const allowedFields = [
    "name",
    "location",
    "noiseLevel",
    "groupFriendly",
    "isAvailable",
    "capacity",
  ];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(changes, field) && changes[field] !== undefined) {
      updates[field] = changes[field];
    }
  }

  return Space.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  ).lean().exec();
}

export async function removeById(id) {
  requireValidId(id);

  return Space.findByIdAndDelete(id).lean().exec();
}

export {
  listSpaces as getAll,
  createSpace as create,
};
