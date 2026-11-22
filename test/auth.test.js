import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { createSessionStore, getSessionOptions } from "../config/session.js";
import User from "../models/User.js";
import * as usersRepository from "../repositories/usersRepository.js";
import * as authService from "../services/authService.js";
import { startTestDatabase } from "../test-support/mongodb.js";

const account = {
  name: "Alex Genov",
  email: "alex@example.com",
  password: "correct horse battery staple",
};
const sessionSecret = "test-only-session-secret-with-at-least-32-bytes";

describe("authentication with MongoDB", () => {
  let database;
  let store;
  let server;
  let baseUrl;
  let passwordHash;

  before(async () => {
    database = await startTestDatabase();
    await User.init();
    passwordHash = await bcrypt.hash(account.password, 12);
    store = createSessionStore();
    const app = createApp({ sessionStore: store, sessionSecret });
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
    try {
      await store?.close();
    } finally {
      await database?.cleanup();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await mongoose.connection.collection("sessions").deleteMany({});
  });

  async function request(path, { method = "GET", body, cookie, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return {
      response,
      body: text ? JSON.parse(text) : null,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }

  async function createMember(overrides = {}) {
    return usersRepository.createUser({
      name: account.name,
      email: account.email,
      passwordHash,
      ...overrides,
    });
  }

  async function savedSession(cookie) {
    assert.ok(cookie?.startsWith("study-space.sid="));
    const signedId = decodeURIComponent(cookie.slice("study-space.sid=".length));
    assert.ok(signedId.startsWith("s:"));
    const id = signedId.slice(2).split(".")[0];
    const document = await mongoose.connection.collection("sessions").findOne({ _id: id });
    return document ? JSON.parse(document.session) : null;
  }

  it("persists a member with a real bcrypt hash and no plaintext password", async () => {
    const result = await request("/auth/signup", {
      method: "POST",
      body: { ...account, name: "  Alex Genov  ", email: "  Alex@Example.COM  " },
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.user.name, account.name);
    assert.equal(result.body.user.email, account.email);
    assert.equal(result.body.user.role, "member");
    assert.equal(result.body.user.password, undefined);
    assert.equal(result.body.user.passwordHash, undefined);
    assert.equal(User.modelName, "User");

    const saved = await User.collection.findOne({ email: account.email });
    assert.equal(String(saved._id), result.body.user._id);
    assert.equal(saved.password, undefined);
    assert.notEqual(saved.passwordHash, account.password);
    assert.equal(bcrypt.getRounds(saved.passwordHash), 12);
    assert.equal(await bcrypt.compare(account.password, saved.passwordHash), true);
    assert.ok(saved.createdAt instanceof Date);
    assert.ok(saved.updatedAt instanceof Date);

    for (const user of [
      await usersRepository.findById(result.body.user._id),
      await usersRepository.findByEmail(" ALEX@EXAMPLE.COM "),
    ]) {
      assert.equal(String(user._id), result.body.user._id);
      assert.equal(user.passwordHash, undefined);
      assert.equal(user.save, undefined);
    }
    const authenticationUser = await usersRepository.findByEmailForAuthentication(account.email);
    assert.equal(authenticationUser.passwordHash, saved.passwordHash);
    const document = await User.findById(saved._id).select("+passwordHash");
    assert.equal(document.toObject().passwordHash, undefined);
    assert.equal(document.toJSON().passwordHash, undefined);
  });

  it("ignores supplied admin roles, session fields, IDs, and password hashes during signup", async () => {
    const injected = JSON.parse('{"__proto__":{"role":"admin"},"constructor":{"prototype":{"role":"admin"}}}');
    const requestedId = new mongoose.Types.ObjectId();
    for (const [index, role] of ["admin", { $set: "admin" }, ["admin"]].entries()) {
      const result = await request("/auth/signup", {
        method: "POST",
        body: {
          ...account,
          ...injected,
          email: `member${index}@example.com`,
          role,
          _id: String(requestedId),
          userId: "attacker-selected-id",
          session: { role: "admin", userId: "attacker-selected-id" },
          passwordHash: "attacker-selected-hash",
          createdAt: new Date(0),
        },
      });
      assert.equal(result.response.status, 201);
      assert.equal(result.body.user.role, "member");
      assert.notEqual(result.body.user._id, String(requestedId));
      assert.notEqual(result.body.user.createdAt, new Date(0).toISOString());
      const session = await savedSession(result.cookie);
      assert.equal(session.userId, result.body.user._id);
      assert.equal(session.role, "member");
      assert.equal(session.password, undefined);
      assert.equal(session.passwordHash, undefined);
      assert.equal((await User.collection.findOne({ email: `member${index}@example.com` })).session, undefined);
    }
  });

  it("also forces member at the repository boundary and rejects plaintext hashes", async () => {
    const input = Object.assign(Object.create({ role: "admin" }), {
      name: account.name,
      email: account.email,
      passwordHash,
      isAdmin: true,
    });
    const user = await usersRepository.createUser(input);
    assert.equal(user.role, "member");
    assert.equal(user.isAdmin, undefined);
    const explicitRole = await createMember({ email: "another@example.com", role: "admin" });
    assert.equal(explicitRole.role, "member");

    await assert.rejects(createMember({ email: "plaintext@example.com", passwordHash: account.password }), {
      name: "ValidationError",
    });
    assert.equal(await usersRepository.findByEmail("plaintext@example.com"), null);
  });

  it("enforces normalized email uniqueness under concurrent signup requests", async () => {
    const results = await Promise.all([
      request("/auth/signup", { method: "POST", body: account }),
      request("/auth/signup", { method: "POST", body: { ...account, email: " ALEX@EXAMPLE.COM " } }),
    ]);
    assert.deepEqual(results.map(({ response }) => response.status).sort(), [201, 409]);
    assert.equal(await User.countDocuments(), 1);
    const rejected = results.find(({ response }) => response.status === 409);
    assert.equal(typeof rejected.body.error, "string");
    assert.equal(JSON.stringify(rejected.body).includes(account.password), false);
    assert.equal(JSON.stringify(rejected.body).includes("passwordHash"), false);
  });

  it("rejects missing, malformed, nonstring, and out-of-range signup data", async () => {
    const invalidInputs = [
      {},
      { ...account, name: "   " },
      { ...account, name: { $ne: null } },
      { ...account, email: "not-an-email" },
      { ...account, email: { $ne: null } },
      { ...account, password: [account.password] },
      { ...account, password: "short" },
      { ...account, password: "😀".repeat(11) },
      { ...account, password: "a".repeat(73) },
      { ...account, password: "😀".repeat(19) },
    ];
    for (const body of invalidInputs) {
      const result = await request("/auth/signup", { method: "POST", body });
      assert.equal(result.response.status, 400);
      assert.equal(result.cookie, undefined);
      assert.equal(typeof result.body.error, "string");
    }
    assert.equal(await User.countDocuments(), 0);
  });

  it("accepts the bcrypt byte boundary and preserves meaningful password whitespace", async () => {
    for (const [index, password] of ["😀".repeat(18), "  a long secret phrase  "].entries()) {
      const result = await request("/auth/signup", {
        method: "POST",
        body: { ...account, email: `boundary${index}@example.com`, password },
      });
      assert.equal(result.response.status, 201);
      const saved = await usersRepository.findByEmailForAuthentication(result.body.user.email);
      assert.equal(await bcrypt.compare(password, saved.passwordHash), true);
      if (password !== password.trim()) {
        assert.equal(await bcrypt.compare(password.trim(), saved.passwordHash), false);
      }
    }
  });

  it("sets the agreed session fields and rotates the session on successful login", async () => {
    const signedUp = await request("/auth/signup", { method: "POST", body: account });
    assert.equal(signedUp.response.status, 201);
    const cookieHeader = signedUp.response.headers.get("set-cookie");
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Lax/i);

    const loggedIn = await request("/auth/login", {
      method: "POST",
      cookie: signedUp.cookie,
      body: { email: " ALEX@EXAMPLE.COM ", password: account.password, role: "admin" },
    });
    assert.equal(loggedIn.response.status, 200);
    assert.equal(loggedIn.body.user._id, signedUp.body.user._id);
    assert.equal(loggedIn.body.user.passwordHash, undefined);
    assert.notEqual(loggedIn.cookie, signedUp.cookie);
    assert.equal(await savedSession(signedUp.cookie), null);
    const session = await savedSession(loggedIn.cookie);
    assert.equal(session.userId, signedUp.body.user._id);
    assert.equal(typeof session.userId, "string");
    assert.equal(session.role, "member");

    const me = await request("/auth/me", { cookie: loggedIn.cookie });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.user._id, signedUp.body.user._id);
    assert.equal(me.body.user.passwordHash, undefined);
    assert.equal((await request("/auth/me", { cookie: signedUp.cookie })).response.status, 401);
  });

  it("rejects wrong and unknown credentials without creating an authenticated session", async () => {
    await createMember();
    const wrong = await request("/auth/login", {
      method: "POST",
      body: { email: account.email, password: "incorrect password" },
    });
    const unknown = await request("/auth/login", {
      method: "POST",
      body: { email: "missing@example.com", password: account.password },
    });
    assert.equal(wrong.response.status, 401);
    assert.equal(unknown.response.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
    assert.equal(wrong.cookie, undefined);
    assert.equal(unknown.cookie, undefined);
    assert.equal(await mongoose.connection.collection("sessions").countDocuments(), 0);
    assert.equal((await request("/auth/me")).response.status, 401);
  });

  it("creates admins only through trusted provisioning and preserves their role on login", async () => {
    const provisioned = await authService.createAdmin({ ...account, role: "member" });
    assert.equal(provisioned.ok, true);
    assert.equal(provisioned.value.role, "admin");
    assert.equal(provisioned.value.passwordHash, undefined);

    const signupAttempt = await request("/auth/signup", { method: "POST", body: account });
    assert.equal(signupAttempt.response.status, 409);
    assert.equal((await usersRepository.findByEmail(account.email)).role, "admin");

    const login = await request("/auth/login", {
      method: "POST",
      body: { email: account.email, password: account.password, role: "member" },
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.body.user.role, "admin");
    assert.equal((await savedSession(login.cookie)).role, "admin");
  });

  it("refuses to overwrite or promote an existing account during admin provisioning", async () => {
    const member = await createMember();
    const result = await authService.createAdmin({ ...account, password: "a different admin password" });
    assert.equal(result.ok, false);
    assert.equal(result.error.status, 409);
    const saved = await usersRepository.findByEmailForAuthentication(account.email);
    assert.equal(String(saved._id), String(member._id));
    assert.equal(saved.role, "member");
    assert.equal(saved.passwordHash, passwordHash);
    assert.equal(await User.countDocuments(), 1);
  });

  it("destroys the stored session on logout and rejects reuse of its cookie", async () => {
    await createMember();
    const login = await request("/auth/login", { method: "POST", body: account });
    assert.equal(login.response.status, 200);
    const logout = await request("/auth/logout", { method: "POST", body: {}, cookie: login.cookie });
    assert.equal(logout.response.status, 204);
    assert.equal(logout.body, null);
    assert.match(logout.response.headers.get("set-cookie"), /^study-space\.sid=;/);
    assert.equal(await savedSession(login.cookie), null);
    assert.equal((await request("/auth/me", { cookie: login.cookie })).response.status, 401);
  });

  it("rejects query injection and malformed IDs before database lookup", async () => {
    await createMember();
    for (const email of [{ $ne: null }, [account.email], null]) {
      await assert.rejects(usersRepository.findByEmail(email), { code: "INVALID_USER_EMAIL" });
      await assert.rejects(usersRepository.findByEmailForAuthentication(email), { code: "INVALID_USER_EMAIL" });
      const response = await request("/auth/login", {
        method: "POST",
        body: { email, password: account.password },
      });
      assert.equal(response.response.status, 400);
    }
    for (const id of ["not-an-id", { $ne: null }, null]) {
      await assert.rejects(usersRepository.findById(id), { code: "INVALID_USER_ID" });
    }
    assert.equal(await usersRepository.findById(new mongoose.Types.ObjectId()), null);
  });

  it("allows bodyless logout with the required JSON content type", async () => {
    await createMember();
    const login = await request("/auth/login", { method: "POST", body: account });
    const logout = await request("/auth/logout", {
      method: "POST",
      cookie: login.cookie,
      headers: { "Content-Type": "application/json" },
    });
    assert.equal(logout.response.status, 204);
    assert.equal(await savedSession(login.cookie), null);
  });

  it("keeps the existing study-space create and list routes working", async () => {
    const created = await request("/spaces", {
      method: "POST",
      body: { name: "Library Room 201", location: "Main Library", noiseLevel: "quiet", groupFriendly: false },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.name, "Library Room 201");
    const listed = await fetch(`${baseUrl}/spaces`);
    assert.equal(listed.status, 200);
    assert.match(await listed.text(), /Library Room 201/);
  });

  it("requires JSON and rejects cross-origin authentication requests", async () => {
    const form = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(account),
    });
    assert.equal(form.status, 415);
    await form.text();

    for (const origin of ["https://attacker.example", "null"]) {
      const rejected = await request("/auth/signup", {
        method: "POST",
        headers: { Origin: origin },
        body: account,
      });
      assert.equal(rejected.response.status, 403);
    }
    assert.equal(await User.countDocuments(), 0);
    const accepted = await request("/auth/signup", {
      method: "POST",
      headers: { Origin: baseUrl },
      body: account,
    });
    assert.equal(accepted.response.status, 201);
  });

  it("returns a generic malformed-JSON error without echoing the submitted password", async () => {
    const response = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: `{"password":"${account.password}`,
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.includes(account.password), false);
    assert.equal(body.passwordHash, undefined);
  });

  it("uses secure cookies in production and requires a session secret", () => {
    const options = getSessionOptions({ store, secret: sessionSecret, nodeEnv: "production" });
    assert.equal(options.cookie.secure, true);
    assert.equal(options.cookie.httpOnly, true);
    assert.equal(options.cookie.sameSite, "lax");
    assert.equal(options.resave, false);
    assert.equal(options.saveUninitialized, false);
    assert.throws(() => getSessionOptions({ store, secret: "", nodeEnv: "production" }), /SESSION_SECRET/);
  });
});
