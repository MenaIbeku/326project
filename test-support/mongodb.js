import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { connectDatabase, disconnectDatabase } from "../config/database.js";

async function availablePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  return port;
}

function waitForMongoDB(process) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => finish(new Error(
      `Test MongoDB did not start within 20 seconds.\n${output}`,
    )), 20_000);

    function finish(error) {
      clearTimeout(timeout);
      process.stdout.off("data", onData);
      process.stderr.off("data", onData);
      process.off("error", onError);
      process.off("exit", onExit);
      if (error) reject(error);
      else resolve();
    }

    function onData(chunk) {
      output = (output + chunk.toString()).slice(-4000);
      if (output.includes("Waiting for connections")) finish();
    }

    function onError(error) {
      finish(new Error(
        "Cannot start test MongoDB. Install mongod or set MONGOD_BINARY to its path.",
        { cause: error },
      ));
    }

    function onExit(code, signal) {
      finish(new Error(`Test MongoDB exited (${code ?? signal}).\n${output}`));
    }

    process.stdout.on("data", onData);
    process.stderr.on("data", onData);
    process.once("error", onError);
    process.once("exit", onExit);
  });
}

async function stopMongoDB(process) {
  if (!process?.pid || process.exitCode !== null || process.signalCode !== null) return;
  const exited = once(process, "exit");
  process.kill("SIGTERM");
  const timeout = setTimeout(() => process.kill("SIGKILL"), 5000);
  try {
    await exited;
  } finally {
    clearTimeout(timeout);
  }
}

export async function startTestDatabase() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "study-spaces-test-"));
  let mongoProcess;
  let cleanedUp = false;

  async function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      await disconnectDatabase();
    } finally {
      try {
        await stopMongoDB(mongoProcess);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  }

  try {
    const port = await availablePort();
    mongoProcess = spawn(process.env.MONGOD_BINARY || "mongod", [
      "--dbpath", directory,
      "--bind_ip", "127.0.0.1",
      "--port", String(port),
      "--nounixsocket",
      "--quiet",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    await waitForMongoDB(mongoProcess);
    // logs so the child process cannot block on full pipes.
    mongoProcess.stdout.resume();
    mongoProcess.stderr.resume();
    const uri = `mongodb://127.0.0.1:${port}/study_spaces_test`;
    await connectDatabase(uri);
    return { uri, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
