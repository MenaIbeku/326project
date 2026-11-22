import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Space from "../models/Space.js";
import { connectDatabase } from "../config/database.js";

test("a space preserves its fields and receives storage defaults", async () => {
  const owner = new mongoose.Types.ObjectId();

  const space = new Space({
    name: "Library",
    location: "Floor 2",
    noiseLevel: "quiet",
    owner,
  });

  await space.validate();

  assert.equal(space.name, "Library");
  assert.equal(space.location, "Floor 2");
  assert.equal(space.noiseLevel, "quiet");
  assert.equal(String(space.owner), String(owner));
  assert.equal(space.groupFriendly, false);
  assert.equal(space.isAvailable, true);
  assert.ok(space._id);
});

test("the storage schema requires name, location, noiseLevel, and owner", async () => {
  await assert.rejects(new Space({}).validate(), (error) => {
    assert.deepEqual(
      Object.keys(error.errors).sort(),
      ["location", "name", "noiseLevel", "owner"]
    );
    return true;
  });
});

test("explicit values override defaults and unknown fields are not stored", async () => {
  const owner = new mongoose.Types.ObjectId();

  const space = new Space({
    name: "Group Room",
    location: "Student Center",
    noiseLevel: "moderate",
    groupFriendly: true,
    isAvailable: false,
    owner,
    unexpectedField: "discard me",
  });

  await space.validate();

  assert.equal(space.noiseLevel, "moderate");
  assert.equal(space.groupFriendly, true);
  assert.equal(space.isAvailable, false);
  assert.equal(String(space.owner), String(owner));
  assert.equal(space.toObject().unexpectedField, undefined);
});

test("missing database configuration fails before attempting a connection", async () => {
  await assert.rejects(connectDatabase(""), /MONGODB_URI is required/);
});
