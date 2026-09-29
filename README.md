# TillSnap

Corner-shop till. £5 a month per shop, paid in Stripe.

## Cloudflare

1. Workers & Pages → Create → Connect to Git → `tyfox27072022-bit/tillsnap`.
2. Build command: `npm run build`
3. Deploy command: `npx wrangler deploy`
4. Add these as **runtime** variables (encrypted), then redeploy:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon or any Postgres). Not SQLite. |
| `BETTER_AUTH_SECRET` | A long random string |
| `BETTER_AUTH_URL` | The public https address Cloudflare gives you |
| `VITE_AUTH_ENABLED` | `true` (also set this as a **build** variable) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `https://YOUR-DOMAIN/api/stripe/webhook` |

Stripe webhook events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.

The first request creates the tables. Each shop is its own £5 subscription.
