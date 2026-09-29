import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";

const PRICE_PENCE = 500;

function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe is not connected yet. Add STRIPE_SECRET_KEY.");
  return key;
}

async function stripe(path: string, params?: URLSearchParams, method = "POST") {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params,
  });
  const json = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || "Stripe refused the request.");
  return json as Record<string, any>;
}

async function markPaid(shopId: string, customer: string, subscriptionId: string, periodEndUnix: number) {
  const sql = await getSql();
  await sql`
    update shops
    set stripe_customer_id = ${customer},
        stripe_subscription_id = ${subscriptionId},
        billing_status = 'active',
        payment_due_at = ${new Date(periodEndUnix * 1000).toISOString()}
    where id = ${shopId}
  `;
}

async function shopByCustomer(customer: string) {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select id from shops where stripe_customer_id = ${customer} limit 1
  `;
  return rows[0]?.id ?? null;
}

export async function startCheckout(userId: string) {
  const sql = await getSql();
  const rows = await sql<{
    shop_id: string;
    role: string;
    name: string;
    stripe_customer_id: string | null;
  }>`
    select m.shop_id, m.role, s.name, s.stripe_customer_id
    from memberships m
    join shops s on s.id = m.shop_id
    where m.user_id = ${userId}
    limit 1
  `;
  const shop = rows[0];
  if (!shop) throw new Error("Open a shop first.");
  if (shop.role !== "admin") throw new Error("Only the manager can pay for the shop.");

  let customer = shop.stripe_customer_id;
  if (!customer) {
    const params = new URLSearchParams();
    params.set("name", shop.name);
    params.set("metadata[shopId]", shop.shop_id);
    const created = await stripe("/customers", params);
    customer = String(created.id);
    await sql`update shops set stripe_customer_id = ${customer} where id = ${shop.shop_id}`;
  }

  const request = getRequest();
  const origin = new URL(request.url).origin;
  const session = new URLSearchParams();
  session.set("mode", "subscription");
  session.set("customer", customer);
  session.set("client_reference_id", shop.shop_id);
  session.set("success_url", `${origin}/?billing=success&session_id={CHECKOUT_SESSION_ID}`);
  session.set("cancel_url", `${origin}/?billing=cancel`);
  session.set("metadata[shopId]", shop.shop_id);
  session.set("subscription_data[metadata][shopId]", shop.shop_id);
  session.set("line_items[0][quantity]", "1");
  session.set("line_items[0][price_data][currency]", "gbp");
  session.set("line_items[0][price_data][unit_amount]", String(PRICE_PENCE));
  session.set("line_items[0][price_data][recurring][interval]", "month");
  session.set("line_items[0][price_data][product_data][name]", "TillSnap shop");
  const created = await stripe("/checkout/sessions", session);
  return { url: String(created.url) };
}

export async function confirmCheckout(userId: string, sessionId: string) {
  const sql = await getSql();
  const rows = await sql<{ shop_id: string; role: string }>`
    select shop_id, role from memberships where user_id = ${userId} limit 1
  `;
  const mine = rows[0];
  if (!mine || mine.role !== "admin") throw new Error("Only the manager can confirm payment.");
  const session = await stripe(`/checkout/sessions/${sessionId}`, undefined, "GET");
  const shopId = String((session.metadata as { shopId?: string } | undefined)?.shopId ?? session.client_reference_id ?? "");
  if (shopId !== mine.shop_id) throw new Error("That payment is for a different shop.");
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { paid: false };
  }
  const subscriptionId = String(session.subscription ?? "");
  const customer = String(session.customer ?? "");
  let periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  if (subscriptionId) {
    const sub = await stripe(`/subscriptions/${subscriptionId}`, undefined, "GET");
    if (typeof sub.current_period_end === "number") periodEnd = sub.current_period_end;
  }
  await markPaid(shopId, customer, subscriptionId, periodEnd);
  return { paid: true };
}

export async function handleStripeWebhook(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("Webhook secret missing", { status: 500 });
  const raw = await request.text();
  const header = request.headers.get("stripe-signature") ?? "";
  if (!validSignature(raw, header, secret)) return new Response("Bad signature", { status: 400 });
  const event = JSON.parse(raw) as { type: string; data: { object: Record<string, unknown> } };
  const obj = event.data.object;
  if (event.type === "checkout.session.completed") {
    const shopId = String((obj.metadata as { shopId?: string } | undefined)?.shopId ?? obj.client_reference_id ?? "");
    const subscriptionId = String(obj.subscription ?? "");
    const customer = String(obj.customer ?? "");
    if (shopId && subscriptionId) {
      const sub = await stripe(`/subscriptions/${subscriptionId}`, undefined, "GET");
      const end = typeof sub.current_period_end === "number" ? sub.current_period_end : Math.floor(Date.now() / 1000) + 30 * 86400;
      await markPaid(shopId, customer, subscriptionId, end);
    }
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const customer = String(obj.customer ?? "");
    const shopId = await shopByCustomer(customer);
    if (shopId) {
      const sql = await getSql();
      if (event.type === "invoice.paid") {
        const lines = obj.lines as { data?: Array<{ period?: { end?: number } }> } | undefined;
        const end = lines?.data?.[0]?.period?.end;
        if (end) {
          await sql`
            update shops
            set billing_status = 'active', payment_due_at = ${new Date(end * 1000).toISOString()}
            where id = ${shopId}
          `;
        }
      } else {
        await sql`update shops set billing_status = 'past_due' where id = ${shopId} and billing_status <> 'past_due'`;
      }
    }
  }
  if (event.type === "customer.subscription.deleted") {
    const customer = String(obj.customer ?? "");
    const shopId = await shopByCustomer(customer);
    const end = typeof obj.current_period_end === "number" ? obj.current_period_end : Math.floor(Date.now() / 1000);
    if (shopId) {
      const sql = await getSql();
      await sql`
        update shops
        set billing_status = 'canceled', payment_due_at = ${new Date(end * 1000).toISOString()}
        where id = ${shopId}
      `;
    }
  }
  return new Response("ok");
}

function validSignature(raw: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("="));
  const timestamp = parts.find((part) => part[0] === "t")?.[1];
  const signatures = parts.filter((part) => part[0] === "v1").map((part) => part[1] ?? "");
  if (!timestamp || signatures.length === 0) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const a = Buffer.from(expected);
  return signatures.some((sig) => {
    const b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
