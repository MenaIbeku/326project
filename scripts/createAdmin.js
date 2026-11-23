import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { createAdmin } from "../services/authService.js";

export async function promptForAdminAccount(input = process.stdin, output = process.stdout) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error("Run this command in an interactive terminal.");
  }

  let hideInput = false;
  const terminalOutput = new Writable({
    write(chunk, encoding, callback) {
      if (hideInput) callback();
      else output.write(chunk, encoding, callback);
    },
  });
  const prompts = createInterface({ input, output: terminalOutput, terminal: true });
  const cancellation = new AbortController();
  const cancel = () => cancellation.abort();
  prompts.on("SIGINT", cancel);
  prompts.on("close", cancel);

  async function question(label, secret = false) {
    if (!secret) return prompts.question(label, { signal: cancellation.signal });

    // Write only the label directly
    output.write(label);
    hideInput = true;
    try {
      return await prompts.question("", { signal: cancellation.signal });
    } finally {
      hideInput = false;
      output.write("\n");
    }
  }

  try {
    const name = await question("Admin name: ");
    const email = await question("Admin email: ");
    const password = await question("Password (hidden): ", true);
    const confirmation = await question("Confirm password (hidden): ", true);

    if (password !== confirmation) {
      throw new Error("Password does not match.");
    }

    return { name, email, password };
  } finally {
    prompts.removeListener("SIGINT", cancel);
    prompts.removeListener("close", cancel);
    prompts.close();
    terminalOutput.end();
  }
}

export async function runCreateAdmin() {
  if (process.argv.length > 2) {
    console.error("This command accepts no arguments.");
    process.exitCode = 1;
    return;
  }

  let account;
  try {
    account = await promptForAdminAccount();
  } catch (error) {
    console.error(error.name === "AbortError" ? "Admin creation cancelled." : error.message);
    process.exitCode = 1;
    return;
  }

  try {
    await connectDatabase();
    const result = await createAdmin(account);
    if (!result.ok) {
      console.error(result.error.message);
      process.exitCode = 1;
      return;
    }

    console.log(`Admin account created for ${result.value.email}. You can now log in.`);
  } catch {
    console.error("Could not create the admin account.");
    process.exitCode = 1;
  } finally {
    account.password = undefined;
    try {
      await disconnectDatabase();
    } catch {
      console.error("Could not close the database connection cleanly.");
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCreateAdmin();
}
