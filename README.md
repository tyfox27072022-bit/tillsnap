# TillSnap

Corner-shop till. £5 a month per shop, paid in Stripe.

## Cloudflare

Deploy command (this is the only command Cloudflare needs to run):

```bash
npx wrangler deploy
```

That builds the site, then publishes it. Before the shop will open, add these runtime variables and redeploy:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | A long random string |
| `BETTER_AUTH_URL` | The public https address |
| `VITE_AUTH_ENABLED` | `true` |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `https://YOUR-DOMAIN/api/stripe/webhook` |
