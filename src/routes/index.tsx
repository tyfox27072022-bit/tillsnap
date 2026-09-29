import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanBarcode, Bell, ShoppingBag } from "lucide-react";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { TillSnap } from "@/components/till-snap";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16">
        <p className="display text-4xl">TillSnap</p>
        <p className="mt-2 text-muted">Scan it. Stock it. Sell it.</p>
      </main>
    );
  }
  return (
    <>
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <TillSnap />
      </SignedIn>
    </>
  );
}

function Landing() {
  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <p className="display text-2xl">TillSnap</p>
        <Link to="/login" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">For corner shops</p>
            <h1 className="display mt-2 text-5xl leading-none sm:text-6xl">The till that knows the shelf.</h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              Staff scan a barcode, see the price, and take the sale. You see stock, and you hear about it the moment something runs out.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/login" className="rounded-full bg-accent px-5 py-3 font-semibold text-paper">
                Start for £5 a month
              </Link>
              <p className="text-sm text-muted">£5 a month per shop, paid by the manager in Stripe. Each shop is billed on its own.</p>
            </div>
          </div>
          <img
            src="/photos/counter.jpg"
            alt="A corner shop counter with a tablet used as the till"
            className="aspect-video w-full rounded-xl border border-line object-cover"
          />
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          <Card icon={<ScanBarcode />} title="Scan" body="Camera or typed barcode. The price and how many are left show straight away." />
          <Card icon={<ShoppingBag />} title="Till" body="Build a basket on a phone or tablet and record the sale. Stock drops with it." />
          <Card icon={<Bell />} title="Alerts" body="Managers see an out-of-stock note on the desk as soon as a line hits zero." />
        </section>

        <section className="mt-16 grid items-center gap-6 lg:grid-cols-2">
          <img
            src="/photos/scan.jpg"
            alt="A phone scanning the barcode on a carton of milk"
            className="w-full rounded-xl border border-line object-cover"
          />
          <div>
            <h2 className="text-4xl">Point, and the price is there.</h2>
            <p className="mt-3 text-muted">
              Adding a product and selling one use the same scan. Managers set the price. Staff only change the count on the shelf, or ring it through the till.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Manager desk for prices, stock, and the staff join code</li>
              <li>Staff stay on the phone. No extra kit</li>
              <li>Works on a tablet at the counter</li>
            </ul>
          </div>
        </section>

        <section className="mt-16 grid items-stretch gap-4 lg:grid-cols-[1fr_1.2fr]">
          <img
            src="/photos/aisle.jpg"
            alt="A stocked corner shop aisle"
            className="h-full max-h-[32rem] w-full rounded-xl border border-line object-cover"
          />
          <article className="flex flex-col justify-between rounded-xl border border-line bg-card p-6 sm:p-8">
            <div>
              <p className="text-sm font-semibold tracking-wide text-accent uppercase">Pricing</p>
              <p className="display mt-2 text-6xl">£5</p>
              <p className="text-lg text-muted">a month, per shop</p>
              <ul className="mt-6 space-y-2">
                <li>Unlimited products and barcodes</li>
                <li>Manager plus staff on their own phones</li>
                <li>Shelf counts, prices, and the cash till</li>
                <li>Out-of-stock alerts on the manager desk</li>
              </ul>
            </div>
            <Link to="/login" className="mt-8 inline-flex w-fit rounded-full bg-ink px-5 py-3 font-semibold text-paper">
              Open your shop
            </Link>
          </article>
        </section>
      </main>
    </div>
  );
}

function Card({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-xl border border-line bg-card p-4">
      <div className="text-accent">{icon}</div>
      <h2 className="mt-2 text-xl">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </article>
  );
}

export function Guard() {
  return <RedirectToSignIn />;
}
