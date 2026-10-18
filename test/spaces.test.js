import test from "node:test";
import assert from "node:assert/strict";
import Space from "../models/Space.js";
import { connectDatabase } from "../config/database.js";

test("a space preserves its fields and receives storage defaults", async () => {
  const space = new Space({ name: "Library", location: "Floor 2", capacity: 4 });
  await space.validate();
  assert.equal(space.name, "Library");
  assert.equal(space.location, "Floor 2");
  assert.equal(space.capacity, 4);
  assert.equal(space.isAvailable, true);
  assert.ok(space._id);
});

test("the storage schema requires name, location, and capacity", async () => {
  await assert.rejects(new Space({}).validate(), (error) => {
    assert.deepEqual(Object.keys(error.errors).sort(), ["capacity", "location", "name"]);
    return true;
  });
});

test("explicit values override defaults and unknown fields are not stored", async () => {
  const space = new Space({
    name: "Group Room", location: "Student Center", capacity: 8,
    isAvailable: false,
    unexpectedField: "discard me",
  });
  await space.validate();
  assert.equal(space.isAvailable, false);
  assert.equal(space.toObject().unexpectedField, undefined);
});

test("missing database configuration fails before attempting a connection", async () => {
  await assert.rejects(connectDatabase(""), /MONGODB_URI is required/);
});
