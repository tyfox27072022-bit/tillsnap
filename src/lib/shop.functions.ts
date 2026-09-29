import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

type Membership = {
  shopId: string;
  role: "admin" | "staff";
  name: string;
  joinCode: string;
  billing: {
    status: string;
    dueAt: string;
    daysLeft: number;
    locked: boolean;
    warn: boolean;
  };
};

const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

function billingOf(status: string, dueAt: string) {
  const due = new Date(dueAt).getTime();
  const lockAt = due + GRACE_MS;
  const now = Date.now();
  // No Stripe key yet: the shop stays open so the till can be tested.
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return { status: status || "trial", dueAt, daysLeft: 14, locked: false, warn: false };
  }
  const covered = Number.isFinite(due) && now < due && status !== "unpaid" && status !== "past_due";
  const locked = !covered && now >= lockAt;
  const warn = !covered && !locked;
  const daysLeft = Math.max(0, Math.ceil((lockAt - now) / (24 * 60 * 60 * 1000)));
  return { status, dueAt, daysLeft, locked, warn };
}

type Product = {
  id: number;
  barcode: string;
  name: string;
  pricePence: number;
  stock: number;
  lowStockAt: number;
  category: string;
};

async function mine(userId: string): Promise<Membership | null> {
  const sql = await getSql();
  const rows = await sql<{
    shop_id: string;
    role: "admin" | "staff";
    name: string;
    join_code: string;
    billing_status: string;
    payment_due_at: string;
  }>`
    select m.shop_id, m.role, s.name, s.join_code, s.billing_status, s.payment_due_at::text as payment_due_at
    from memberships m
    join shops s on s.id = m.shop_id
    where m.user_id = ${userId}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    shopId: row.shop_id,
    role: row.role,
    name: row.name,
    joinCode: row.join_code,
    billing: billingOf(row.billing_status, row.payment_due_at),
  };
}

async function assertOpen(userId: string) {
  const m = await mine(userId);
  if (m?.billing.locked) throw new Error("This shop is locked until the manager pays the £5.");
  return m;
}

function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

const STARTER: Array<[string, string, number, number, string]> = [
  ["5000112637922", "Semi-skimmed milk 2L", 165, 12, "Grocery"],
  ["5000159461122", "White loaf", 135, 8, "Grocery"],
  ["5449000000996", "Cola 500ml", 145, 24, "Drinks"],
  ["5000328270715", "Salted crisps", 95, 30, "Snacks"],
  ["7622210449283", "Milk chocolate bar", 120, 18, "Snacks"],
  ["5010182997204", "Washing-up liquid", 149, 6, "Household"],
];

export const getShop = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => mine(context.userId));

export const createShop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().trim().min(2).max(60) }))
  .handler(async ({ context, data }) => {
    const existing = await mine(context.userId);
    if (existing) return existing;
    const sql = await getSql();
    const id = `shop_${Date.now().toString(36)}`;
    const joinCode = newCode();
    await sql`
      insert into shops (id, name, join_code, billing_status, payment_due_at)
      values (${id}, ${data.name}, ${joinCode}, 'trial', now() + interval '14 days')
    `;
    await sql`
      insert into memberships (user_id, shop_id, role)
      values (${context.userId}, ${id}, 'admin')
    `;
    for (const [barcode, name, price, stock, category] of STARTER) {
      await sql`
        insert into products (shop_id, barcode, name, price_pence, stock, category)
        values (${id}, ${barcode}, ${name}, ${price}, ${stock}, ${category})
      `;
    }
    return mine(context.userId);
  });

export const joinShop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ code: z.string().trim().min(4).max(12) }))
  .handler(async ({ context, data }) => {
    const existing = await mine(context.userId);
    if (existing) return existing;
    const sql = await getSql();
    const shops = await sql<{ id: string }>`
      select id from shops where join_code = ${data.code.toUpperCase()} limit 1
    `;
    const shop = shops[0];
    if (!shop) throw new Error("That shop code is not recognised.");
    const open = await sql<{ billing_status: string; payment_due_at: string }>`
      select billing_status, payment_due_at::text as payment_due_at from shops where id = ${shop.id}
    `;
    const bill = open[0];
    if (bill && billingOf(bill.billing_status, bill.payment_due_at).locked) {
      throw new Error("This shop is locked until the manager pays the £5.");
    }
    await sql`
      insert into memberships (user_id, shop_id, role)
      values (${context.userId}, ${shop.id}, 'staff')
    `;
    return mine(context.userId);
  });

export const leaveShop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const m = await mine(context.userId);
    if (!m || m.role !== "staff") return { rotated: false };
    const sql = await getSql();
    await sql`delete from memberships where user_id = ${context.userId} and shop_id = ${m.shopId}`;
    await sql`update shops set join_code = ${newCode()} where id = ${m.shopId}`;
    return { rotated: true };
  });

export const listProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Product[]> => {
    const m = await mine(context.userId);
    if (!m) return [];
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      barcode: string;
      name: string;
      price_pence: number;
      stock: number;
      low_stock_at: number;
      category: string;
    }>`
      select id, barcode, name, price_pence, stock, low_stock_at, category
      from products
      where shop_id = ${m.shopId}
      order by name asc
    `;
    return rows.map((r) => ({
      id: Number(r.id),
      barcode: r.barcode,
      name: r.name,
      pricePence: Number(r.price_pence),
      stock: Number(r.stock),
      lowStockAt: Number(r.low_stock_at),
      category: r.category,
    }));
  });

const productInput = z.object({
  barcode: z.string().trim().min(4).max(32),
  name: z.string().trim().min(1).max(80),
  pricePence: z.number().int().min(0).max(1_000_000),
  stock: z.number().int().min(0).max(100_000),
  lowStockAt: z.number().int().min(0).max(1000),
  category: z.string().trim().min(1).max(40),
});

async function raiseIfOut(shopId: string, barcode: string, name: string, stock: number) {
  if (stock > 0) return;
  const sql = await getSql();
  const open = await sql<{ id: number }>`
    select id from alerts
    where shop_id = ${shopId} and barcode = ${barcode} and dismissed = false
    limit 1
  `;
  if (open[0]) return;
  await sql`
    insert into alerts (shop_id, barcode, name)
    values (${shopId}, ${barcode}, ${name})
  `;
}

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(productInput)
  .handler(async ({ context, data }) => {
    const m = await assertOpen(context.userId);
    if (!m) throw new Error("Join a shop first.");
    if (m.role !== "admin") throw new Error("Only the manager can add or reprice products.");
    const sql = await getSql();
    await sql`
      insert into products (shop_id, barcode, name, price_pence, stock, low_stock_at, category, updated_at)
      values (${m.shopId}, ${data.barcode}, ${data.name}, ${data.pricePence}, ${data.stock}, ${data.lowStockAt}, ${data.category}, now())
      on conflict (shop_id, barcode) do update set
        name = excluded.name,
        price_pence = excluded.price_pence,
        stock = excluded.stock,
        low_stock_at = excluded.low_stock_at,
        category = excluded.category,
        updated_at = now()
    `;
    await raiseIfOut(m.shopId, data.barcode, data.name, data.stock);
    return { ok: true };
  });

export const setStock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ barcode: z.string().min(4), stock: z.number().int().min(0).max(100_000) }))
  .handler(async ({ context, data }) => {
    const m = await assertOpen(context.userId);
    if (!m) throw new Error("Join a shop first.");
    const sql = await getSql();
    const rows = await sql<{ name: string }>`
      update products set stock = ${data.stock}, updated_at = now()
      where shop_id = ${m.shopId} and barcode = ${data.barcode}
      returning name
    `;
    if (!rows[0]) throw new Error("That barcode is not on this shop's shelf.");
    await raiseIfOut(m.shopId, data.barcode, rows[0].name, data.stock);
    return { ok: true };
  });

export const listAlerts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const m = await mine(context.userId);
    if (!m || m.role !== "admin") return [];
    const sql = await getSql();
    const rows = await sql<{ id: number; barcode: string; name: string; created_at: string }>`
      select id, barcode, name, created_at::text as created_at
      from alerts
      where shop_id = ${m.shopId} and dismissed = false
      order by id desc
      limit 40
    `;
    return rows.map((r) => ({
      id: Number(r.id),
      barcode: r.barcode,
      name: r.name,
      createdAt: String(r.created_at),
    }));
  });

export const dismissAlert = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ context, data }) => {
    const m = await mine(context.userId);
    if (!m || m.role !== "admin") throw new Error("Managers only.");
    const sql = await getSql();
    await sql`
      update alerts set dismissed = true
      where id = ${data.id} and shop_id = ${m.shopId}
    `;
    return { ok: true };
  });

export const checkout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      lines: z
        .array(z.object({ barcode: z.string(), qty: z.number().int().min(1).max(99) }))
        .min(1)
        .max(80),
      method: z.enum(["cash", "card"]).default("cash"),
    }),
  )
  .handler(async ({ context, data }) => {
    const m = await assertOpen(context.userId);
    if (!m) throw new Error("Join a shop first.");
    const sql = await getSql();
    const sold: Array<{ barcode: string; name: string; qty: number; pricePence: number }> = [];
    let total = 0;
    for (const line of data.lines) {
      const rows = await sql<{ name: string; price_pence: number; stock: number }>`
        select name, price_pence, stock from products
        where shop_id = ${m.shopId} and barcode = ${line.barcode}
        limit 1
      `;
      const p = rows[0];
      if (!p) throw new Error(`Unknown barcode ${line.barcode}`);
      const next = Number(p.stock) - line.qty;
      if (next < 0) throw new Error(`${p.name} only has ${p.stock} left.`);
      await sql`
        update products set stock = ${next}, updated_at = now()
        where shop_id = ${m.shopId} and barcode = ${line.barcode}
      `;
      await raiseIfOut(m.shopId, line.barcode, p.name, next);
      const price = Number(p.price_pence);
      total += price * line.qty;
      sold.push({ barcode: line.barcode, name: p.name, qty: line.qty, pricePence: price });
    }
    await sql`
      insert into sales (shop_id, user_id, total_pence, items, method)
      values (${m.shopId}, ${context.userId}, ${total}, ${JSON.stringify(sold)}, ${data.method})
    `;
    const saved = await sql<{ id: number }>`
      select id from sales where shop_id = ${m.shopId} order by id desc limit 1
    `;
    return { totalPence: total, id: Number(saved[0]?.id ?? 0), method: data.method };
  });

export const voidLastSale = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const m = await assertOpen(context.userId);
    if (!m) throw new Error("Join a shop first.");
    const sql = await getSql();
    const rows = await sql<{ id: number; items: string }>`
      select id, items from sales
      where shop_id = ${m.shopId} and voided = false
      order by id desc
      limit 1
    `;
    const sale = rows[0];
    if (!sale) throw new Error("There is no sale to cancel.");
    const items = JSON.parse(sale.items) as Array<{ barcode: string; qty: number }>;
    for (const item of items) {
      await sql`
        update products set stock = stock + ${item.qty}, updated_at = now()
        where shop_id = ${m.shopId} and barcode = ${item.barcode}
      `;
    }
    await sql`update sales set voided = true where id = ${sale.id}`;
    return { ok: true };
  });

export const listSales = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const m = await mine(context.userId);
    if (!m || m.role !== "admin") return { rows: [], monthCash: 0, monthCard: 0 };
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      total_pence: number;
      items: string;
      created_at: string;
      method: string;
      voided: boolean;
    }>`
      select id, total_pence, items, created_at::text as created_at, method, voided
      from sales
      where shop_id = ${m.shopId}
      order by id desc
      limit 20
    `;
    const month = await sql<{ cash: number; card: number }>`
      select
        coalesce(sum(case when method = 'cash' then total_pence else 0 end), 0) as cash,
        coalesce(sum(case when method = 'card' then total_pence else 0 end), 0) as card
      from sales
      where shop_id = ${m.shopId}
        and voided = false
        and created_at >= date_trunc('month', now())
    `;
    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        totalPence: Number(r.total_pence),
        createdAt: String(r.created_at),
        items: String(r.items),
        method: r.method,
        voided: Boolean(r.voided),
      })),
      monthCash: Number(month[0]?.cash ?? 0),
      monthCard: Number(month[0]?.card ?? 0),
    };
  });

export const startShopCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { startCheckout } = await import("./billing.server");
    return startCheckout(context.userId);
  });

export const confirmShopCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ sessionId: z.string().min(5) }))
  .handler(async ({ context, data }) => {
    const { confirmCheckout } = await import("./billing.server");
    return confirmCheckout(context.userId, data.sessionId);
  });
