import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { createSessionStore, validateSessionSecret } from "./config/session.js";
import { createApp } from "./app.js";
import User from "./models/User.js";
const PORT = process.env.PORT || 3000;

try {
  validateSessionSecret(process.env.SESSION_SECRET);
  await connectDatabase();
  await User.init();
  const sessionStore = createSessionStore();
  // Wait for the session collection and TTL index before accepting requests.
  await sessionStore.collectionP;
  const app = createApp({
    sessionStore,
    sessionSecret: process.env.SESSION_SECRET,
    nodeEnv: process.env.NODE_ENV || "development",
    trustProxy: process.env.TRUST_PROXY === "1" ? 1 : false,
  });
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
} catch {
  console.error("Startup failed. Check MONGODB_URI, MongoDB availability, and SESSION_SECRET (at least 32 random bytes).");
  await disconnectDatabase();
  process.exitCode = 1;
}
