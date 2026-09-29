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
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <p className="display flex items-center gap-2 text-2xl">
            <span className="mark" aria-hidden />
            TillSnap
          </p>
          <nav className="flex items-center gap-2">
            <Link to="/get" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper">
              Get the app
            </Link>
            <Link to="/login" className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl items-end gap-8 px-5 pt-6 pb-16 lg:grid-cols-[1.15fr_0.85fr] lg:pt-10">
          <div>
            <p className="text-sm font-bold tracking-[0.22em] text-accent uppercase">Corner shops</p>
            <h1 className="display mt-3 text-6xl leading-[0.86] sm:text-8xl">
              The till
              <br />
              that knows
              <br />
              the shelf.
            </h1>
            <p className="mt-6 max-w-md text-lg text-paper/75">
              Staff scan a barcode, see the price, and take the sale. You see stock, and you hear about it the moment something runs out.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/get" className="rounded-full bg-accent px-6 py-3 text-lg font-semibold text-paper">
                Get the app
              </Link>
              <Link to="/login" className="rounded-full bg-paper px-6 py-3 text-lg font-semibold text-ink">
                £5 a month
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src="/photos/counter.jpg"
              alt="A corner shop counter with a tablet used as the till"
              className="aspect-[4/5] w-full border-4 border-accent object-cover sm:aspect-video lg:aspect-[4/5]"
            />
            <div className="absolute right-3 bottom-3 left-3 bg-paper p-4 text-ink sm:left-auto sm:w-60">
              <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">This sale</p>
              <p className="mt-2 flex justify-between text-sm font-semibold">
                <span>Semi milk 2L</span>
                <span>£1.45</span>
              </p>
              <p className="mt-1 flex justify-between text-sm font-semibold">
                <span>Own bread</span>
                <span>£1.10</span>
              </p>
              <p className="display mt-3 flex justify-between border-t-2 border-dashed border-ink pt-2 text-3xl">
                <span>Total</span>
                <span>£2.55</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-14">
        <section className="grid gap-3 sm:grid-cols-3">
          <Card tone="accent" icon={<ScanBarcode />} kicker="01" title="Scan" body="Camera or typed barcode. The price and how many are left show straight away." />
          <Card tone="moss" icon={<ShoppingBag />} kicker="02" title="Till" body="Build a basket on a phone or tablet and record the sale. Stock drops with it." />
          <Card tone="ink" icon={<Bell />} kicker="03" title="Alerts" body="Managers see an out-of-stock note on the desk as soon as a line hits zero." />
        </section>

        <section className="mt-14 grid items-center gap-8 lg:grid-cols-2">
          <img
            src="/photos/scan.jpg"
            alt="A phone scanning the barcode on a carton of milk"
            className="aspect-[4/3] w-full border-4 border-ink object-cover"
          />
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-accent uppercase">On the counter</p>
            <h2 className="display mt-2 text-5xl leading-[0.9]">Point, and the price is there.</h2>
            <p className="mt-4 text-lg text-muted">
              Adding a product and selling one use the same scan. Managers set the price. Staff only change the count on the shelf, or ring it through the till.
            </p>
            <ul className="mt-5 space-y-2 font-semibold">
              <li className="border-l-4 border-accent pl-3">Manager desk for prices, stock, and the staff join code</li>
              <li className="border-l-4 border-moss pl-3">Staff stay on the phone. No extra kit</li>
              <li className="border-l-4 border-ink pl-3">Works on a tablet at the counter</li>
            </ul>
          </div>
        </section>

        <section className="mt-14 grid overflow-hidden bg-accent text-paper lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-bold tracking-[0.18em] uppercase">On the phone</p>
            <h2 className="display mt-2 text-5xl leading-[0.9] sm:text-6xl">Put it on the home screen.</h2>
            <p className="mt-4 max-w-md text-lg text-paper/90">
              iPhone and Android. Open the page, add TillSnap, and the till is an app. No store, no extra account.
            </p>
            <Link to="/get" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-lg font-semibold text-paper">
              Get the app
            </Link>
          </div>
          <img src="/photos/aisle.jpg" alt="A stocked corner shop aisle" className="h-64 w-full object-cover lg:h-full" />
        </section>

        <section className="mt-14 grid items-stretch bg-ink text-paper lg:grid-cols-[0.8fr_1.2fr]">
          <div className="border-b border-paper/20 p-7 sm:p-10 lg:border-r lg:border-b-0">
            <p className="text-sm font-bold tracking-[0.18em] text-accent uppercase">Per shop</p>
            <p className="display mt-2 text-8xl leading-none">£5</p>
            <p className="mt-2 text-xl">a month</p>
          </div>
          <div className="flex flex-col justify-between p-7 sm:p-10">
            <ul className="space-y-3 text-lg">
              <li>Unlimited products and barcodes</li>
              <li>Manager plus staff on their own phones</li>
              <li>Shelf counts, prices, and the cash till</li>
              <li>Out-of-stock alerts on the manager desk</li>
            </ul>
            <Link to="/login" className="mt-8 inline-flex w-fit rounded-full bg-accent px-6 py-3 text-lg font-semibold text-paper">
              Open your shop
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({
  icon,
  title,
  body,
  kicker,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  kicker: string;
  tone: "accent" | "moss" | "ink";
}) {
  const face =
    tone === "accent" ? "bg-accent text-paper" : tone === "moss" ? "bg-moss text-paper" : "bg-ink text-paper";
  return (
    <article className={`${face} p-5`}>
      <div className="flex items-center justify-between">
        {icon}
        <span className="display text-3xl opacity-70">{kicker}</span>
      </div>
      <h2 className="mt-6 text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-paper/80">{body}</p>
    </article>
  );
}

export function Guard() {
  return <RedirectToSignIn />;
}
