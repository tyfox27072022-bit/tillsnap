/** Translate the app's Postgres-shaped SQL into Durable Object SQLite. */
export function toSqlite(text) {
  return text
    .replace(/now\(\)\s*\+\s*interval '14 days'/gi, "datetime('now', '+14 days')")
    .replace(/date_trunc\(\s*'month'\s*,\s*now\(\)\s*\)/gi, "datetime('now', 'start of month')")
    .replace(/::text/gi, "")
    .replace(/\bnow\(\)/gi, "datetime('now')")
    .replace(
      /coalesce\(sum\(total_pence\) filter \(where method = 'cash'\), 0\)/gi,
      "coalesce(sum(case when method = 'cash' then total_pence else 0 end), 0)",
    )
    .replace(
      /coalesce\(sum\(total_pence\) filter \(where method = 'card'\), 0\)/gi,
      "coalesce(sum(case when method = 'card' then total_pence else 0 end), 0)",
    );
}

function placeholders(text) {
  const numbers = [...text.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  const highest = numbers.reduce((n, v) => Math.max(n, v), 0);
  let next = text;
  for (let i = highest; i >= 1; i -= 1) next = next.replaceAll(`$${i}`, "?");
  return next;
}

const SCHEMA = `
create table if not exists shops (
  id text primary key,
  name text not null,
  join_code text not null unique,
  created_at text not null default (datetime('now')),
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_status text not null default 'trial',
  payment_due_at text
);
create table if not exists memberships (
  user_id text not null,
  shop_id text not null,
  role text not null,
  created_at text not null default (datetime('now')),
  primary key (user_id, shop_id)
);
create table if not exists products (
  id integer primary key autoincrement,
  shop_id text not null,
  barcode text not null,
  name text not null,
  price_pence integer not null,
  stock integer not null default 0,
  low_stock_at integer not null default 3,
  category text not null default 'Grocery',
  updated_at text not null default (datetime('now')),
  unique (shop_id, barcode)
);
create table if not exists alerts (
  id integer primary key autoincrement,
  shop_id text not null,
  barcode text not null,
  name text not null,
  created_at text not null default (datetime('now')),
  dismissed integer not null default 0
);
create table if not exists sales (
  id integer primary key autoincrement,
  shop_id text not null,
  user_id text not null,
  total_pence integer not null,
  items text not null,
  created_at text not null default (datetime('now')),
  method text not null default 'cash',
  voided integer not null default 0
);
`;

const STARTER = [
  ["5000112637922", "Semi-skimmed milk 2L", 165, 12, "Grocery"],
  ["5000159461122", "White loaf", 135, 8, "Grocery"],
  ["5449000000996", "Cola 500ml", 145, 24, "Drinks"],
  ["5000328270715", "Salted crisps", 95, 30, "Snacks"],
  ["7622210449283", "Milk chocolate bar", 120, 18, "Snacks"],
  ["5010182997204", "Washing-up liquid", 149, 6, "Household"],
];

export class TillSnapStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    ctx.blockConcurrencyWhile(async () => {
      const sql = ctx.storage.sql;
      for (const statement of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
        sql.exec(statement);
      }
      sql.exec(
        `insert into shops (id, name, join_code, billing_status, payment_due_at)
         values ('shop_test', 'Corner shop', 'SNAP01', 'trial', datetime('now', '+14 days'))
         on conflict (id) do nothing`,
      );
      sql.exec(
        `insert into memberships (user_id, shop_id, role) values ('test-manager', 'shop_test', 'admin')
         on conflict (user_id, shop_id) do nothing`,
      );
      sql.exec(
        `insert into memberships (user_id, shop_id, role) values ('test-staff', 'shop_test', 'staff')
         on conflict (user_id, shop_id) do nothing`,
      );
      for (const [barcode, name, price, stock, category] of STARTER) {
        sql.exec(
          `insert into products (shop_id, barcode, name, price_pence, stock, category)
           values ('shop_test', ?, ?, ?, ?, ?)
           on conflict (shop_id, barcode) do nothing`,
          barcode,
          name,
          price,
          stock,
          category,
        );
      }
    });
  }

  async fetch(request) {
    try {
      const body = await request.json();
      const text = placeholders(toSqlite(String(body.text ?? "")));
      const params = Array.isArray(body.params) ? body.params.map(box) : [];
      const cursor = this.ctx.storage.sql.exec(text, ...params);
      const rows = cursor.toArray().map((row) => {
        const out = {};
        for (const [key, value] of Object.entries(row)) out[key] = value;
        return out;
      });
      return Response.json({ rows });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Store query failed" },
        { status: 400 },
      );
    }
  }
}

function box(value) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "bigint") return Number(value);
  return value;
}
