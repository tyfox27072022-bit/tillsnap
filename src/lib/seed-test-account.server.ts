import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";

const TEST_MANAGER_EMAIL = "manager@tillsnap.test";
const TEST_STAFF_EMAIL = "staff@tillsnap.test";
const TEST_PASSWORD = "tilltest1";

const STARTER: Array<[string, string, number, number, string]> = [
  ["5000112637922", "Semi-skimmed milk 2L", 165, 12, "Grocery"],
  ["5000159461122", "White loaf", 135, 8, "Grocery"],
  ["5449000000996", "Cola 500ml", 145, 24, "Drinks"],
  ["5000328270715", "Salted crisps", 95, 30, "Snacks"],
  ["7622210449283", "Milk chocolate bar", 120, 18, "Snacks"],
  ["5010182997204", "Washing-up liquid", 149, 6, "Household"],
];

async function ensureUser(email: string, name: string) {
  const sql = await getSql();
  const existing = await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`;
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const password = await hashPassword(TEST_PASSWORD);
  const now = new Date().toISOString();
  await sql`
    insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    values (${id}, ${name}, ${email}, true, ${now}, ${now})
  `;
  await sql`
    insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    values (${accountId}, ${id}, 'credential', ${id}, ${password}, ${now}, ${now})
  `;
  return id;
}

export async function seedTestAccounts() {
  const sql = await getSql();
  const managerId = await ensureUser(TEST_MANAGER_EMAIL, "Test Manager");
  const staffId = await ensureUser(TEST_STAFF_EMAIL, "Test Staff");
  const mine = await sql<{ shop_id: string }>`
    select shop_id from memberships where user_id = ${managerId} limit 1
  `;
  let shopId = mine[0]?.shop_id;
  if (!shopId) {
    shopId = "shop_test";
    await sql`
      insert into shops (id, name, join_code, billing_status, payment_due_at)
      values (${shopId}, 'Corner shop', 'SNAP01', 'trial', now() + interval '14 days')
      on conflict (id) do nothing
    `;
    await sql`
      insert into memberships (user_id, shop_id, role)
      values (${managerId}, ${shopId}, 'admin')
      on conflict (user_id, shop_id) do nothing
    `;
    for (const [barcode, name, price, stock, category] of STARTER) {
      await sql`
        insert into products (shop_id, barcode, name, price_pence, stock, category)
        values (${shopId}, ${barcode}, ${name}, ${price}, ${stock}, ${category})
        on conflict (shop_id, barcode) do nothing
      `;
    }
  }
  const staff = await sql<{ user_id: string }>`
    select user_id from memberships where user_id = ${staffId} limit 1
  `;
  if (!staff[0]) {
    await sql`
      insert into memberships (user_id, shop_id, role)
      values (${staffId}, ${shopId}, 'staff')
      on conflict (user_id, shop_id) do nothing
    `;
  }
}
