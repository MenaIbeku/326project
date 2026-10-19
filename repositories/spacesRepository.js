import Space from "../models/Space.js";

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
