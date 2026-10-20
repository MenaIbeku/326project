import * as spacesRepository from "../repositories/spacesRepository.js";

export async function listSpaces() {
  return await spacesRepository.listSpaces();
}

export async function createSpace(data) {
  const name = typeof data?.name === "string"
    ? data.name.trim()
    : "";

  const location = typeof data?.location === "string"
    ? data.location.trim()
    : "";

  const noiseLevel = typeof data?.noiseLevel === "string"
    ? data.noiseLevel.trim()
    : "";

  if (!name || !location || !noiseLevel) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "Name, location, and noise level are required."
      }
    };
  }

  const groupFriendly = data?.groupFriendly ?? false;

  if (typeof groupFriendly !== "boolean") {
    return {
      ok: false,
      error: {
        status: 400,
        message: "Group friendly must be true or false."
      }
    };
  }

  const spaceData = {
    name,
    location,
    noiseLevel,
    groupFriendly
  };

  if (data?.capacity !== undefined) {
    const capacity = Number(data.capacity);

    if (
      data.capacity === null ||
      String(data.capacity).trim() === "" ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 10
    ) {
      return {
        ok: false,
        error: {
          status: 400,
          message: "Capacity must be a whole number between 1 and 10."
        }
      };
    }

    spaceData.capacity = capacity;
  }

  const newSpace = await spacesRepository.createSpace(spaceData);

  return {
    ok: true,
    value: newSpace
  };
}
