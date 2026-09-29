import { createHmac, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE = "tillsnap_test";
const WEEK = 60 * 60 * 24 * 30;

const ACCOUNTS = [
  { email: "manager@tillsnap.test", password: "tilltest1", id: "test-manager", name: "Test Manager", role: "admin" },
  { email: "staff@tillsnap.test", password: "tilltest1", id: "test-staff", name: "Test Staff", role: "staff" },
] as const;

export type TestAccount = {
  id: string;
  email: string;
  displayName: string;
};

function secret() {
  return process.env.BETTER_AUTH_SECRET?.trim() || "tillsnap-set-BETTER_AUTH_SECRET";
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function matchTestAccount(email: string, password: string) {
  return ACCOUNTS.find((account) => account.email === email.trim().toLowerCase() && account.password === password);
}

export function writeTestCookie(userId: string) {
  const exp = Date.now() + WEEK * 1000;
  const body = `${userId}.${exp}`;
  setCookie(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: WEEK,
  });
}

export function clearTestCookie() {
  deleteCookie(COOKIE, { path: "/" });
}

export function readTestCookie(): TestAccount | null {
  const raw = getCookie(COOKIE);
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, mac] = parts;
  if (!userId || !exp || !mac) return null;
  if (!safeEqual(sign(`${userId}.${exp}`), mac)) return null;
  if (Number(exp) < Date.now()) return null;
  const account = ACCOUNTS.find((item) => item.id === userId);
  if (!account) return null;
  return { id: account.id, email: account.email, displayName: account.name };
}
