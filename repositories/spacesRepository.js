import Space from "../models/Space.js";

// Return plain objects so the service does not depend on Mongoose documents.
export async function listSpaces() {
  return Space.find().sort({ createdAt: -1, _id: -1 }).lean().exec();
}

export async function createSpace({
  name,
  location,
  capacity,
  isAvailable,
}) {
  const space = await Space.create({
    name,
    location,
    capacity,
        isAvailable,
  });
  return space.toObject();
}
