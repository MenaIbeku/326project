import {
  jest,
  describe,
  test,
  expect,
  beforeEach
} from "@jest/globals";

// Mock repository functions so tests don't require MongoDB.
const mockListSpaces = jest.fn();
const mockCreateSpace = jest.fn();
const mockFindById = jest.fn();
const mockUpdateById = jest.fn();
const mockRemoveById = jest.fn();

jest.unstable_mockModule("../repositories/spacesRepository.js", () => ({
  listSpaces: mockListSpaces,
  createSpace: mockCreateSpace,
  findById: mockFindById,
  updateById: mockUpdateById,
  removeById: mockRemoveById
}));

const {
  listSpaces,
  createSpace,
  updateSpace,
  deleteSpace
} = await import("../services/spacesService.js");

beforeEach(() => {
  jest.resetAllMocks();
});

// Sample study-space data.
const validSpace = {
  name: "Library Room 201",
  location: "Main Library",
  noiseLevel: "Quiet",
  groupFriendly: true
};

// Sample authenticated users.
const owner = {
  _id: "user1",
  role: "member"
};

const otherMember = {
  _id: "user2",
  role: "member"
};

const admin = {
  _id: "admin1",
  role: "admin"
};

// Sample existing study-space record.
const existingSpace = {
  _id: "space1",
  ...validSpace,
  owner: "user1"
};

// --------------------------------------------------
// SPRINT 3: LIST SPACES
// --------------------------------------------------

describe("listSpaces", () => {
  test("returns all spaces", async () => {
    const spaces = [validSpace];
    mockListSpaces.mockResolvedValue(spaces);

    const result = await listSpaces();

    expect(result).toEqual(spaces);
    expect(mockListSpaces).toHaveBeenCalledTimes(1);
  });
});

// --------------------------------------------------
// SPRINT 3: CREATE SPACE VALIDATION
// --------------------------------------------------

describe("createSpace", () => {
  test("creates a valid space", async () => {
    const createdSpace = {
      ...validSpace,
      owner: owner._id
    };

    mockCreateSpace.mockResolvedValue(createdSpace);

    const result = await createSpace(validSpace, owner);

    expect(result).toEqual({
      ok: true,
      value: createdSpace
    });

    expect(mockCreateSpace).toHaveBeenCalledWith({
      ...validSpace,
      owner: owner._id
    });
  });

  test.each([
    ["missing name", { ...validSpace, name: undefined }],
    ["empty name", { ...validSpace, name: "" }],
    ["whitespace name", { ...validSpace, name: "   " }],
    ["missing location", { ...validSpace, location: undefined }],
    ["empty location", { ...validSpace, location: "" }],
    ["missing noiseLevel", { ...validSpace, noiseLevel: undefined }],
    ["empty noiseLevel", { ...validSpace, noiseLevel: "" }],
    ["whitespace noiseLevel", { ...validSpace, noiseLevel: "   " }]
  ])("rejects %s", async (_, input) => {
    const result = await createSpace(input, owner);

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(400);
    expect(mockCreateSpace).not.toHaveBeenCalled();
  });

  test("rejects non-boolean groupFriendly", async () => {
    const result = await createSpace(
      {
        ...validSpace,
        groupFriendly: "true"
      },
      owner
    );

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(400);
    expect(mockCreateSpace).not.toHaveBeenCalled();
  });

  test("defaults groupFriendly to false", async () => {
    const { groupFriendly, ...input } = validSpace;

    mockCreateSpace.mockResolvedValue(input);

    const result = await createSpace(input, owner);

    expect(result.ok).toBe(true);

    expect(mockCreateSpace).toHaveBeenCalledWith({
      ...input,
      groupFriendly: false,
      owner: owner._id
    });
  });

  test.each([1, 5, 10])(
    "accepts valid capacity %i",
    async (capacity) => {
      mockCreateSpace.mockResolvedValue(validSpace);

      const result = await createSpace(
        {
          ...validSpace,
          capacity
        },
        owner
      );

      expect(result.ok).toBe(true);

      expect(mockCreateSpace).toHaveBeenCalledWith({
        ...validSpace,
        capacity,
        owner: owner._id
      });
    }
  );

  test("accepts omitted capacity", async () => {
    mockCreateSpace.mockResolvedValue(validSpace);

    const result = await createSpace(validSpace, owner);

    expect(result.ok).toBe(true);

    expect(mockCreateSpace).toHaveBeenCalledWith({
      ...validSpace,
      owner: owner._id
    });
  });

  test.each([0, 11, -1, 2.5, "abc", "", null])(
    "rejects invalid capacity %s",
    async (capacity) => {
      const result = await createSpace(
        {
          ...validSpace,
          capacity
        },
        owner
      );

      expect(result.ok).toBe(false);
      expect(result.error.status).toBe(400);
      expect(mockCreateSpace).not.toHaveBeenCalled();
    }
  );

  test("propagates repository errors", async () => {
    mockCreateSpace.mockRejectedValue(
      new Error("Database unavailable")
    );

    await expect(
      createSpace(validSpace, owner)
    ).rejects.toThrow("Database unavailable");
  });
});

// --------------------------------------------------
// SPRINT 4: AUTHENTICATED CREATION AND OWNERSHIP
// --------------------------------------------------

describe("Sprint 4: authenticated creation", () => {
  test("rejects unauthenticated creation", async () => {
    const result = await createSpace(validSpace, null);

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(401);
    expect(mockCreateSpace).not.toHaveBeenCalled();
  });

  test("assigns ownership to the logged-in user", async () => {
    mockCreateSpace.mockResolvedValue({
      ...validSpace,
      owner: owner._id
    });

    const result = await createSpace(validSpace, owner);

    expect(result.ok).toBe(true);

    expect(mockCreateSpace).toHaveBeenCalledWith({
      ...validSpace,
      owner: owner._id
    });
  });

  test("ignores client-supplied owner", async () => {
    mockCreateSpace.mockResolvedValue({
      ...validSpace,
      owner: owner._id
    });

    await createSpace(
      {
        ...validSpace,
        owner: otherMember._id
      },
      owner
    );

    expect(mockCreateSpace).toHaveBeenCalledWith({
      ...validSpace,
      owner: owner._id
    });
  });
});

// --------------------------------------------------
// SPRINT 4: UPDATE AUTHORIZATION
// --------------------------------------------------

describe("Sprint 4: update authorization", () => {
  test("rejects updates from non-owners with 403", async () => {
    mockFindById.mockResolvedValue(existingSpace);

    const result = await updateSpace(
      "space1",
      { name: "Changed Name" },
      otherMember
    );

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(403);
    expect(mockUpdateById).not.toHaveBeenCalled();
  });

  test("allows owners to update their spaces", async () => {
    mockFindById.mockResolvedValue(existingSpace);

    const updatedSpace = {
      ...existingSpace,
      name: "Updated Name"
    };

    mockUpdateById.mockResolvedValue(updatedSpace);

    const result = await updateSpace(
      "space1",
      { name: "Updated Name" },
      owner
    );

    expect(result).toEqual({
      ok: true,
      value: updatedSpace
    });

    expect(mockUpdateById).toHaveBeenCalledWith(
      "space1",
      { name: "Updated Name" }
    );
  });

  test("allows admins to update any space", async () => {
    mockFindById.mockResolvedValue(existingSpace);

    const updatedSpace = {
      ...existingSpace,
      name: "Admin Update"
    };

    mockUpdateById.mockResolvedValue(updatedSpace);

    const result = await updateSpace(
      "space1",
      { name: "Admin Update" },
      admin
    );

    expect(result.ok).toBe(true);

    expect(mockUpdateById).toHaveBeenCalledWith(
      "space1",
      { name: "Admin Update" }
    );
  });

  test("prevents changing the owner through updates", async () => {
    mockFindById.mockResolvedValue(existingSpace);

    const result = await updateSpace(
      "space1",
      { owner: otherMember._id },
      owner
    );

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(400);
    expect(mockUpdateById).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------
// SPRINT 4: DELETE AUTHORIZATION
// --------------------------------------------------

describe("Sprint 4: delete authorization", () => {
  test("rejects deletion by non-owners with 403", async () => {
    mockFindById.mockResolvedValue(existingSpace);

    const result = await deleteSpace(
      "space1",
      otherMember
    );

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(403);
    expect(mockRemoveById).not.toHaveBeenCalled();
  });

  test("allows owners to delete their spaces", async () => {
    mockFindById.mockResolvedValue(existingSpace);
    mockRemoveById.mockResolvedValue(existingSpace);

    const result = await deleteSpace("space1", owner);

    expect(result.ok).toBe(true);
    expect(mockRemoveById).toHaveBeenCalledWith("space1");
  });

  test("allows admins to delete any space", async () => {
    mockFindById.mockResolvedValue(existingSpace);
    mockRemoveById.mockResolvedValue(existingSpace);

    const result = await deleteSpace("space1", admin);

    expect(result.ok).toBe(true);
    expect(mockRemoveById).toHaveBeenCalledWith("space1");
  });

  test("returns 404 when the space does not exist", async () => {
    mockFindById.mockResolvedValue(null);

    const result = await deleteSpace("missing", owner);

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(404);
    expect(mockRemoveById).not.toHaveBeenCalled();
  });

  test("rejects unauthenticated deletion", async () => {
    const result = await deleteSpace("space1", null);

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(401);
    expect(mockFindById).not.toHaveBeenCalled();
    expect(mockRemoveById).not.toHaveBeenCalled();
  });
});
