import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { createSessionStore } from "../config/session.js";
import User from "../models/User.js";
import * as usersRepository from "../repositories/usersRepository.js";
import * as authService from "../services/authService.js";
import { startTestDatabase } from "../test-support/mongodb.js";

const account = {
  name: "Alex Genov",
  email: "alex@example.com",
  password: "correct horse battery staple",
};

describe("authentication", () => {
  let database, store, server, baseUrl, sessions;

  before(async () => {
    database = await startTestDatabase();
    await User.init();
    store = createSessionStore();
    await store.collectionP;
    sessions = mongoose.connection.collection("sessions");
    const app = createApp({
      sessionStore: store,
      sessionSecret: "test-only-session-secret-with-at-least-32-bytes",
    });
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    try {
      await store?.close();
    } finally {
      await database?.cleanup();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await sessions.deleteMany({});
  });

  async function request(path, data, cookie = "") {
    const response = await fetch(baseUrl + path, {
      method: data === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }

  it("saves a member with a hashed password and supports user lookups", async () => {
    const result = await request("/auth/signup", { ...account, email: " ALEX@EXAMPLE.COM " });
    assert.equal(result.status, 201);
    assert.equal(result.body.user.role, "member");
    assert.equal(result.body.user.passwordHash, undefined);
    const saved = await User.collection.findOne({ email: account.email });
    assert.equal(saved.password, undefined);
    assert.equal(await bcrypt.compare(account.password, saved.passwordHash), true);
    const found = await usersRepository.findById(result.body.user._id);
    assert.equal(found.email, account.email);
    assert.equal(found.passwordHash, undefined);
    assert.equal((await usersRepository.findByEmail(" ALEX@EXAMPLE.COM ")).email, account.email);
    assert.equal((await request("/health")).status, 200);
  });

  it("blocks admin signup and refuses duplicate accounts or admin upgrades", async () => {
    const result = await request("/auth/signup", { ...account, role: "admin" });
    assert.equal(result.status, 201);
    assert.equal(result.body.user.role, "member");
    const duplicate = await request("/auth/signup", { ...account, email: " ALEX@EXAMPLE.COM " });
    assert.equal(duplicate.status, 409);
    const admin = await authService.createAdmin(account);
    assert.equal(admin.error.status, 409);
    assert.equal((await usersRepository.findByEmail(account.email)).role, "member");
    assert.equal(await User.countDocuments(), 1);
  });

  it("rejects invalid account information", async () => {
    const inputs = [
      {},
      { ...account, name: "" },
      { ...account, email: "not-an-email" },
      { ...account, email: { $ne: null } },
      { ...account, password: "short" },
      { ...account, password: "a".repeat(73) },
    ];
    for (const input of inputs) {
      assert.equal((await request("/auth/signup", input)).status, 400);
    }
    assert.equal(await User.countDocuments(), 0);
  });

  it("logs in with a new session and removes it on logout", async () => {
    const signup = await request("/auth/signup", account);
    const login = await request("/auth/login", account, signup.cookie);
    assert.equal(login.status, 200);
    assert.notEqual(login.cookie, signup.cookie);
    assert.equal(await sessions.countDocuments(), 1);
    const session = JSON.parse((await sessions.findOne()).session);
    assert.equal(session.userId, signup.body.user._id);
    assert.equal(session.role, "member");
    assert.equal(session.passwordHash, undefined);
    assert.equal((await request("/auth/me", undefined, login.cookie)).status, 200);
    assert.equal((await request("/auth/me", undefined, signup.cookie)).status, 401);
    const tamperedCookie = login.cookie.slice(0, -1) + (login.cookie.endsWith("a") ? "b" : "a");
    assert.equal((await request("/auth/me", undefined, tamperedCookie)).status, 401);
    assert.equal((await request("/auth/logout", {}, login.cookie)).status, 204);
    assert.equal(await sessions.countDocuments(), 0);
    assert.equal((await request("/auth/me", undefined, login.cookie)).status, 401);
  });

  it("serves browser forms and account controls", async () => {
    for (const page of ["signup", "login"]) {
      const response = await fetch(`${baseUrl}/auth/${page}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /id="auth-form"/);
      assert.match(html, /type="password"/);
      assert.match(html, /src="\/auth-client.js"/);
      assert.ok(html.includes(`action="/auth/${page}"`));
      assert.equal(html.includes('name="role"'), false);
    }
    const spaces = await fetch(`${baseUrl}/spaces`);
    assert.match(await spaces.text(), /id="auth-status"/);
  });

  it("rejects incorrect passwords and unknown users", async () => {
    await authService.signup(account);
    const wrong = await request("/auth/login", { ...account, password: "wrong password" });
    const unknown = await request("/auth/login", { ...account, email: "missing@example.com" });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
    assert.equal(await sessions.countDocuments(), 0);
  });

  it("creates an admin through the trusted service and keeps the role on login", async () => {
    const admin = await authService.createAdmin(account);
    assert.equal(admin.ok, true);
    assert.equal(admin.value.role, "admin");
    assert.equal(admin.value.passwordHash, undefined);
    const login = await request("/auth/login", { ...account, role: "member" });
    assert.equal(login.status, 200);
    const session = JSON.parse((await sessions.findOne()).session);
    assert.equal(session.userId, String(admin.value._id));
    assert.equal(session.role, "admin");
  });
});
