import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Space from "../models/Space.js";
import * as repository from "../repositories/spacesRepository.js";
import { startTestDatabase } from "../test-support/mongodb.js";

const sampleSpace = {
  name: "Library Room 201",
  location: "Main Library",
  noiseLevel: "quiet",
  groupFriendly: true,
  capacity: 4,
};

describe("spaces repository with MongoDB", () => {
  let database;

  before(async () => {
    database = await startTestDatabase();
  });

  after(async () => {
    await database?.cleanup();
  });

  beforeEach(async () => {
    await Space.deleteMany({});
  });

  it("persists create, list, find, update, and remove using the same ID string", async () => {
    assert.deepEqual(await repository.getAll(), []);
    const created = await repository.create(sampleSpace);
    const id = String(created._id);

    assert.equal(created.name, sampleSpace.name);
    assert.equal(created.isAvailable, true);
    assert.ok(created.createdAt instanceof Date);
    assert.ok(created.updatedAt instanceof Date);
    assert.equal(created.save, undefined);

    const spaces = await repository.getAll();
    assert.equal(spaces.length, 1);
    assert.equal(String(spaces[0]._id), id);

    const found = await repository.findById(id);
    assert.equal(found.name, sampleSpace.name);
    assert.equal(String(found._id), id);
    assert.equal(found.save, undefined);

    const updated = await repository.updateById(id, { isAvailable: false });
    assert.equal(updated.isAvailable, false);
    assert.equal(String(updated._id), id);
    assert.equal((await repository.findById(id)).isAvailable, false);

    const removed = await repository.removeById(id);
    assert.equal(String(removed._id), id);
    assert.equal(removed.isAvailable, false);
    assert.equal(removed.save, undefined);
    assert.equal(await repository.findById(id), null);
    assert.deepEqual(await repository.getAll(), []);
  });

  it("preserves untouched fields and accepts false, zero, and ObjectId inputs", async () => {
    const created = await repository.create(sampleSpace);
    const updated = await repository.updateById(created._id, {
      groupFriendly: false,
      capacity: 0,
      location: undefined,
    });
    const saved = await repository.findById(created._id);

    assert.equal(updated.groupFriendly, false);
    assert.equal(updated.capacity, 0);
    assert.equal(saved.groupFriendly, false);
    assert.equal(saved.capacity, 0);
    assert.equal(saved.name, sampleSpace.name);
    assert.equal(saved.location, sampleSpace.location);
    assert.equal(saved.noiseLevel, sampleSpace.noiseLevel);
    assert.equal(saved.isAvailable, true);
    assert.equal(String(saved._id), String(created._id));
    assert.deepEqual(saved.createdAt, created.createdAt);
  });

  it("ignores protected, unknown, inherited, and database-operator update fields", async () => {
    const created = await repository.create(sampleSpace);
    const changes = Object.assign(Object.create({ location: "Inherited location" }), {
      name: "Renamed room",
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(0),
      updatedAt: new Date(0),
      __v: 99,
      unexpectedField: "discard me",
      $unset: { noiseLevel: "" },
    });

    await repository.updateById(String(created._id), changes);
    const saved = await repository.findById(String(created._id));

    assert.equal(saved.name, "Renamed room");
    assert.equal(saved.location, sampleSpace.location);
    assert.equal(saved.noiseLevel, sampleSpace.noiseLevel);
    assert.equal(String(saved._id), String(created._id));
    assert.deepEqual(saved.createdAt, created.createdAt);
    assert.notEqual(saved.updatedAt.getTime(), 0);
    assert.equal(saved.__v, created.__v);
    assert.equal(saved.unexpectedField, undefined);
  });

  it("rejects malformed IDs consistently", async () => {
    for (const id of [undefined, null, "", "abc", "0123456789ab", 42, {}, []]) {
      await assert.rejects(repository.findById(id), { code: "INVALID_SPACE_ID" });
      await assert.rejects(repository.updateById(id, { name: "Changed" }), {
        code: "INVALID_SPACE_ID",
      });
      await assert.rejects(repository.removeById(id), { code: "INVALID_SPACE_ID" });
    }
    assert.deepEqual(await repository.getAll(), []);
  });

  it("returns null for valid IDs with no record and does not insert on update", async () => {
    const id = String(new mongoose.Types.ObjectId());

    assert.equal(await repository.findById(id), null);
    assert.equal(await repository.updateById(id, { name: "Missing room" }), null);
    assert.equal(await repository.removeById(id), null);
    assert.deepEqual(await repository.getAll(), []);
  });

  it("rejects invalid stored values and leaves the existing record unchanged", async () => {
    await assert.rejects(repository.create({ location: "Library" }), {
      name: "ValidationError",
    });
    const created = await repository.create(sampleSpace);
    const id = String(created._id);

    await assert.rejects(repository.updateById(id, { name: "" }), {
      name: "ValidationError",
    });
    await assert.rejects(repository.updateById(id, { capacity: "not a number" }), {
      name: "CastError",
    });

    const saved = await repository.findById(id);
    assert.equal(saved.name, sampleSpace.name);
    assert.equal(saved.capacity, sampleSpace.capacity);
    assert.equal((await repository.getAll()).length, 1);
  });
});
