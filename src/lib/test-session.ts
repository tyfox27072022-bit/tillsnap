import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const signInTestAccount = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const { matchTestAccount, writeTestCookie } = await import("./test-session.server");
    const account = matchTestAccount(data.email, data.password);
    if (!account) return { ok: false as const };
    writeTestCookie(account.id);
    return { ok: true as const };
  });

export const readTestSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readTestCookie } = await import("./test-session.server");
  const account = readTestCookie();
  if (!account) return null;
  return {
    id: account.id,
    displayName: account.displayName,
    primaryEmail: account.email,
    profileImageUrl: null,
    isDevFallback: false,
  };
});

export const clearTestSession = createServerFn({ method: "POST" }).handler(async () => {
  const { clearTestCookie } = await import("./test-session.server");
  clearTestCookie();
  return { ok: true };
});
