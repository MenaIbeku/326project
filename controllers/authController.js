import * as authService from "../services/authService.js";
import * as usersRepository from "../repositories/usersRepository.js";
import { SESSION_COOKIE_NAME, getCookieOptions } from "../config/session.js";

async function establishSession(req, user) {
  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
  req.session.userId = String(user._id);
  req.session.role = user.role;
  await new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

async function clearSession(req, res) {
  if (req.session) {
    await new Promise((resolve, reject) => {
      req.session.destroy((error) => error ? reject(error) : resolve());
    });
  }
  res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions(req.app.get("env")));
}

export async function signup(req, res) {
  const result = await authService.signup(req.body);
  if (!result.ok) {
    return res.status(result.error.status).json({ error: result.error.message });
  }

  await establishSession(req, result.value);
  return res.status(201).json({ user: result.value });
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  if (!result.ok) {
    return res.status(result.error.status).json({ error: result.error.message });
  }

  await establishSession(req, result.value);
  return res.status(200).json({ user: result.value });
}

export async function logout(req, res) {
  await clearSession(req, res);
  return res.sendStatus(204);
}

export async function me(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Login required." });
  }

  const user = await usersRepository.findById(req.session.userId);
  if (!user) {
    await clearSession(req, res);
    return res.status(401).json({ error: "Login required." });
  }

  // Keep this session aligned with the stored role.
  req.session.role = user.role;
  return res.status(200).json({ user });
}
