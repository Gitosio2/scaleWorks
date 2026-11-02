import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Set DISABLE_SIGNUP=true once the owner account exists. Off by default.
    disableSignUp: process.env.DISABLE_SIGNUP === "true",
  },
  // Counters live in memory, so on serverless each instance counts on its own:
  // this slows down guessing but is not a hard global limit.
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  // Must be the last plugin: lets server actions set the session cookie.
  plugins: [nextCookies()],
});
