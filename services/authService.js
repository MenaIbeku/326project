import bcrypt from "bcrypt";
import * as usersRepository from "../repositories/usersRepository.js";

const HASH_ROUNDS = 12;
// Unknown emails still take the bcrypt comparison path. This is not an account.
const DUMMY_HASH = "$2b$12$WxCo0vPE9bBFHqu5ec1vROw9HX9oldOvUjlORqFZrKZlmEDIlbcUS";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function failure(status, message) {
  return { ok: false, error: { status, message } };
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validEmail(email) {
  return email.length <= 254 && emailPattern.test(email);
}

function publicUser(user) {
  const { _id, name, email, role, createdAt, updatedAt } = user;
  return { _id, name, email, role, createdAt, updatedAt };
}

async function createAccount(data, isAdmin = false) {
  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const email = normalizeEmail(data?.email);
  const password = data?.password;

  if (!name || name.length > 100 || !validEmail(email)) {
    return failure(400, "A name of 1–100 characters and a valid email are required.");
  }

  if (typeof password !== "string" || [...password].length < 12 ||
      !password.trim() || Buffer.byteLength(password, "utf8") > 72) {
    return failure(400, "Password must contain at least 12 characters and no more than 72 UTF-8 bytes.");
  }

  // Preserve spaces in the password
  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
  try {
    const account = { name, email, passwordHash };
    const user = isAdmin
      ? await usersRepository.createAdmin(account)
      : await usersRepository.createUser(account);
    return { ok: true, value: publicUser(user) };
  } catch (error) {
    if (error.code === 11000) {
      return failure(409, "An account with this email already exists.");
    }
    throw error;
  }
}

export async function signup(data) {
  return createAccount(data);
}

// Used only by the operator command
export async function createAdmin(data) {
  return createAccount(data, true);
}

export async function login(data) {
  const email = normalizeEmail(data?.email);
  const password = data?.password;
  if (!validEmail(email) || typeof password !== "string" ||
      !password.length || Buffer.byteLength(password, "utf8") > 72) {
    return failure(400, "A valid email and password are required.");
  }

  const user = await usersRepository.findByEmailForAuthentication(email);
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches) {
    return failure(401, "Invalid email or password.");
  }

  return { ok: true, value: publicUser(user) };
}
