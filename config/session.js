import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";

export const SESSION_COOKIE_NAME = "study-space.sid";
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;

export function validateSessionSecret(secret) {
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes. Generate a random secret and set it in .env.");
  }
}

export function createSessionStore() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Connect to MongoDB before creating the session store.");
  }

  const store = MongoStore.create({
    client: mongoose.connection.getClient(),
    dbName: mongoose.connection.name,
    collectionName: "sessions",
    ttl: SESSION_MAX_AGE / 1000,
  });
  // Driver errors may contain connection details.
  store.on("error", () => console.error("MongoDB session storage failed."));
  return store;
}

export function getCookieOptions(nodeEnv = process.env.NODE_ENV) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv === "production",
  };
}

export function getSessionOptions({ store, secret, nodeEnv }) {
  validateSessionSecret(secret);
  if (!store) throw new Error("A MongoDB session store is required.");

  return {
    name: SESSION_COOKIE_NAME,
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: { ...getCookieOptions(nodeEnv), maxAge: SESSION_MAX_AGE },
  };
}

export function createSessionMiddleware(options) {
  return session(getSessionOptions(options));
}
