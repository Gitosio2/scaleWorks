# Account recovery

How to regain access when the password is lost, and how to close public sign-up.
Introduced in PR #27 (`feat/account-recovery`).

## Reset a lost password

Run from the project root, in an interactive terminal (it will not work piped or from a non-TTY shell):

```bash
npx tsx scripts/reset-password.ts <email>
```

What happens:

1. Loads `DATABASE_URL` from `.env.local`.
2. Looks up the user by email (case-insensitive). Fails if it does not exist.
3. Asks for the new password twice. Input is hidden and never lands in the shell history. Minimum 8 characters.
4. Hashes it with better-auth's own hasher (`better-auth/crypto`), so the normal login accepts it.
5. Updates the user's credential account and **deletes all their sessions**, so every device is signed out.

Things to check before running it:

- **Which database it targets.** The script writes to whatever `DATABASE_URL` points to in `.env.local`. To reset the password of the deployed app, that URL must be the production database; if it is a dev database, you will reset the wrong account.
- The user must have an email + password login. Accounts without one are rejected with `That user has no password login to reset.`
- The script was not run against a real database when the PR was written (only its startup path was checked). Try it once on a test account before relying on it.

## Close public sign-up

Once your owner account exists, set this environment variable:

```
DISABLE_SIGNUP=true
```

Effect:

- The sign-up API endpoint is rejected (`400 EMAIL_PASSWORD_SIGN_UP_DISABLED`).
- The login page hides the "Create account" link.
- It is **off by default**: nothing changes unless the variable is set.

Where to set it:

- Local: in `.env.local`, then restart `npm run dev`.
- Vercel: add it in the project's environment variables and **redeploy**. The auth config reads it when the server starts, so a running deployment will not pick up a new value.

To open sign-up again, remove the variable (or set it to anything other than `true`) and restart or redeploy.

## Login rate limit

At most **5 sign-in attempts per minute** per client; the 6th within the window returns `429`.

Counters are kept in memory, so on serverless hosting each instance counts separately. It slows down password guessing but is not a hard global limit.

## Recommended order

1. Make sure your owner account exists and you can log in.
2. Set `DISABLE_SIGNUP=true` and redeploy.
3. If you ever lose the password, use the reset script against the right database.
