import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanBarcode, Bell, ShoppingBag } from "lucide-react";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { TillSnap } from "@/components/till-snap";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending } = useCurrentUserState();
  if (isPending) return <Landing />;
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
        <nav className="flex items-center gap-2">
          <Link to="/get" className="rounded-full border border-ink px-4 py-2 text-sm font-semibold">
            Get the app
          </Link>
          <Link to="/login" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">Corner shops</p>
            <h1 className="display mt-2 text-5xl leading-[0.92] sm:text-7xl">The till that knows the shelf.</h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Staff scan a barcode, see the price, and take the sale. You see stock, and you hear about it the moment something runs out.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/get" className="rounded-full bg-accent px-5 py-3 font-semibold text-paper">
                Get the app
              </Link>
              <Link to="/login" className="rounded-full border border-ink px-5 py-3 font-semibold">
                Start for £5 a month
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src="/photos/counter.jpg"
              alt="A corner shop counter with a tablet used as the till"
              className="aspect-[4/5] w-full rounded-xl border border-line object-cover sm:aspect-video lg:aspect-[4/5]"
            />
            <div className="absolute -bottom-5 left-4 right-4 rounded-xl border border-line bg-card p-4 shadow-sm sm:left-auto sm:w-64">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">This sale</p>
              <p className="mt-2 flex justify-between text-sm">
                <span>Semi milk 2L</span>
                <span>£1.45</span>
              </p>
              <p className="mt-1 flex justify-between text-sm">
                <span>Own bread</span>
                <span>£1.10</span>
              </p>
              <p className="display mt-3 flex justify-between border-t border-dashed border-line pt-2 text-2xl">
                <span>Total</span>
                <span>£2.55</span>
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          <Card icon={<ScanBarcode />} title="Scan" body="Camera or typed barcode. The price and how many are left show straight away." />
          <Card icon={<ShoppingBag />} title="Till" body="Build a basket on a phone or tablet and record the sale. Stock drops with it." />
          <Card icon={<Bell />} title="Alerts" body="Managers see an out-of-stock note on the desk as soon as a line hits zero." />
        </section>

        <section className="mt-16 grid items-center gap-6 lg:grid-cols-2">
          <img
            src="/photos/scan.jpg"
            alt="A phone scanning the barcode on a carton of milk"
            className="aspect-[4/3] w-full rounded-xl border border-line object-cover"
          />
          <div>
            <h2 className="text-4xl leading-tight">Point, and the price is there.</h2>
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

        <section className="mt-16 overflow-hidden rounded-xl border border-ink bg-ink text-paper">
          <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold tracking-wide text-accent uppercase">Download</p>
              <h2 className="display mt-2 text-4xl leading-none sm:text-5xl">Put it on the home screen.</h2>
              <p className="mt-3 max-w-md text-paper/80">
                iPhone and Android. Open the page, add TillSnap, and the till is an app. No store, no extra account.
              </p>
            </div>
            <Link to="/get" className="inline-flex w-fit rounded-full bg-paper px-5 py-3 font-semibold text-ink">
              Get the app
            </Link>
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
    <article className="rounded-xl border border-line bg-card p-5">
      <div className="text-accent">{icon}</div>
      <h2 className="mt-3 text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </article>
  );
}

export function Guard() {
  return <RedirectToSignIn />;
}
