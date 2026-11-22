import * as spacesRepository from "../repositories/spacesRepository.js";

function failure(status, message) {
  return {
    ok: false,
    error: { status, message }
  };
}

function isOwnerOrAdmin(space, user) {
  if (!user?._id) return false;

  return (
    user.role === "admin" ||
    (
      space.owner != null &&
      String(space.owner) === String(user._id)
    )
  );
}

export async function listSpaces() {
  return await spacesRepository.listSpaces();
}

export async function getSpace(id) {
  return await spacesRepository.findById(id);
}

export async function createSpace(data, user) {
  if (!user?._id) {
    return failure(401, "Authentication required.");
  }

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
    return failure(
      400,
      "Name, location, and noise level are required."
    );
  }

  const groupFriendly = data?.groupFriendly ?? false;

  if (typeof groupFriendly !== "boolean") {
    return failure(
      400,
      "Group friendly must be true or false."
    );
  }

  const spaceData = {
    name,
    location,
    noiseLevel,
    groupFriendly,
    owner: user._id
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
      return failure(
        400,
        "Capacity must be a whole number between 1 and 10."
      );
    }

    spaceData.capacity = capacity;
  }

  const newSpace = await spacesRepository.createSpace(spaceData);

  return {
    ok: true,
    value: newSpace
  };
}

export async function updateSpace(id, data, user) {
  if (!user?._id) {
    return failure(401, "Authentication required.");
  }

  const space = await spacesRepository.findById(id);

  if (!space) {
    return failure(404, "Study space not found.");
  }

  if (!isOwnerOrAdmin(space, user)) {
    return failure(
      403,
      "You are not authorized to update this space."
    );
  }

  const allowedFields = [
    "name",
    "location",
    "noiseLevel",
    "groupFriendly",
    "isAvailable",
    "capacity"
  ];

  const updates = Object.fromEntries(
    Object.entries(data ?? {}).filter(
      ([key]) => allowedFields.includes(key)
    )
  );

  if (Object.keys(updates).length === 0) {
    return failure(400, "No valid fields provided for update.");
  }

  for (const field of ["name", "location", "noiseLevel"]) {
    if (field in updates) {
      if (
        typeof updates[field] !== "string" ||
        !updates[field].trim()
      ) {
        return failure(400, `${field} must be a non-empty string.`);
      }

      updates[field] = updates[field].trim();
    }
  }

  for (const field of ["groupFriendly", "isAvailable"]) {
    if (field in updates && typeof updates[field] !== "boolean") {
      return failure(400, `${field} must be true or false.`);
    }
  }

  if ("capacity" in updates) {
    const capacity = Number(updates.capacity);

    if (
      updates.capacity === null ||
      String(updates.capacity).trim() === "" ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 10
    ) {
      return failure(
        400,
        "Capacity must be a whole number between 1 and 10."
      );
    }

    updates.capacity = capacity;
  }

  const updatedSpace = await spacesRepository.updateById(
    id,
    updates
  );

  if (!updatedSpace) {
    return failure(404, "Study space not found.");
  }

  return {
    ok: true,
    value: updatedSpace
  };
}

export async function deleteSpace(id, user) {
  if (!user?._id) {
    return failure(401, "Authentication required.");
  }

  const space = await spacesRepository.findById(id);

  if (!space) {
    return failure(404, "Study space not found.");
  }

  if (!isOwnerOrAdmin(space, user)) {
    return failure(
      403,
      "You are not authorized to delete this space."
    );
  }

  const deletedSpace = await spacesRepository.removeById(id);

  if (!deletedSpace) {
    return failure(404, "Study space not found.");
  }

  return {
    ok: true,
    value: deletedSpace
  };
}
