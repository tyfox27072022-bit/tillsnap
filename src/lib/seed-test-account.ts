import { createServerFn } from "@tanstack/react-start";

export const TEST_MANAGER_EMAIL = "manager@tillsnap.test";
export const TEST_STAFF_EMAIL = "staff@tillsnap.test";
export const TEST_PASSWORD = "tilltest1";

export const prepareTestAccounts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { seedTestAccounts } = await import("./seed-test-account.server");
    await seedTestAccounts();
    return { ready: true as const };
  } catch {
    return { ready: false as const };
  }
});
