
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockListSpaces = jest.fn();
const mockCreateSpace = jest.fn();

jest.unstable_mockModule("../repositories/spacesRepository.js", () => ({
  listSpaces: mockListSpaces,
  createSpace: mockCreateSpace
}));

const { listSpaces, createSpace } = await import("../services/spacesService.js");

beforeEach(() => {
  jest.resetAllMocks();
});

const validSpace = {
  name: "Library Room 201",
  location: "Main Library",
  noiseLevel: "Quiet",
  groupFriendly: true
};

describe("listSpaces", () => {
  test("returns all spaces", async () => {
    const spaces = [validSpace];
    mockListSpaces.mockResolvedValue(spaces);

    const result = await listSpaces();

    expect(result).toEqual(spaces);
    expect(mockListSpaces).toHaveBeenCalledTimes(1);
  });
});

describe("createSpace", () => {
  test("creates a valid space", async () => {
    mockCreateSpace.mockResolvedValue(validSpace);

    const result = await createSpace(validSpace);

    expect(result).toEqual({
      ok: true,
      value: validSpace
    });
    expect(mockCreateSpace).toHaveBeenCalledWith(validSpace);
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
    const result = await createSpace(input);

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(400);
    expect(mockCreateSpace).not.toHaveBeenCalled();
  });

  test("rejects non-boolean groupFriendly", async () => {
    const result = await createSpace({
      ...validSpace,
      groupFriendly: "true"
    });

    expect(result.ok).toBe(false);
    expect(result.error.status).toBe(400);
    expect(mockCreateSpace).not.toHaveBeenCalled();
  });

  test("defaults groupFriendly to false", async () => {
    const { groupFriendly, ...input } = validSpace;
    mockCreateSpace.mockResolvedValue(input);

    const result = await createSpace(input);

    expect(result.ok).toBe(true);
    expect(mockCreateSpace).toHaveBeenCalledWith({
      ...input,
      groupFriendly: false
    });
  });

  test.each([1, 5, 10])(
    "accepts valid capacity %i",
    async (capacity) => {
      mockCreateSpace.mockResolvedValue(validSpace);

      const result = await createSpace({
        ...validSpace,
        capacity
      });

      expect(result.ok).toBe(true);
      expect(mockCreateSpace).toHaveBeenCalledWith({
        ...validSpace,
        capacity
      });
    }
  );

  test("accepts omitted capacity", async () => {
    mockCreateSpace.mockResolvedValue(validSpace);

    const result = await createSpace(validSpace);

    expect(result.ok).toBe(true);
    expect(mockCreateSpace).toHaveBeenCalledWith(validSpace);
  });

  test.each([0, 11, -1, 2.5, "abc", "", null])(
    "rejects invalid capacity %s",
    async (capacity) => {
      const result = await createSpace({
        ...validSpace,
        capacity
      });

      expect(result.ok).toBe(false);
      expect(result.error.status).toBe(400);
      expect(mockCreateSpace).not.toHaveBeenCalled();
    }
  );

  test("propagates repository errors", async () => {
    mockCreateSpace.mockRejectedValue(
      new Error("Database unavailable")
    );

    await expect(createSpace(validSpace))
      .rejects.toThrow("Database unavailable");
  });
});
