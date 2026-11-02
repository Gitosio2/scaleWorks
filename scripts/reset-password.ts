// Resets a user's password straight in the database, for when it is lost.
//
//   npx tsx scripts/reset-password.ts <email>
//
// Reads DATABASE_URL from .env.local and prompts for the new password (hidden),
// so it never lands in the shell history. It hashes with better-auth's own
// hasher, so the normal login keeps working, and it signs out every device.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { hashPassword } from "better-auth/crypto";
import { account, session, user } from "../src/db/auth-schema";

const MIN_PASSWORD_LENGTH = 8;

config({ path: ".env.local" });

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (char: string) => {
      for (const c of char) {
        if (c === "\u0003") process.exit(130); // Ctrl+C
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npx tsx scripts/reset-password.ts <email>");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set in .env.local");
  if (!process.stdin.isTTY) throw new Error("Run this from an interactive terminal.");

  const db = drizzle(neon(process.env.DATABASE_URL));

  const [found] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (!found) throw new Error(`No user with email ${email}`);

  const password = await askHidden("New password: ");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password !== (await askHidden("Repeat password: "))) {
    throw new Error("Passwords do not match.");
  }

  const updated = await db
    .update(account)
    .set({ password: await hashPassword(password) })
    .where(and(eq(account.userId, found.id), eq(account.providerId, "credential")))
    .returning({ id: account.id });
  if (updated.length === 0) throw new Error("That user has no password login to reset.");

  await db.delete(session).where(eq(session.userId, found.id));
  console.log(`Password updated for ${email}. All sessions were closed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
