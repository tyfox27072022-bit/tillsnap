import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Camera, LayoutGrid, ScanBarcode, Settings, ShoppingBag, Store } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { LangProvider, LANGS, useI18n } from "@/lib/i18n";
import {
  checkout,
  createShop,
  dismissAlert,
  getShop,
  joinShop,
  leaveShop,
  listAlerts,
  listProducts,
  listSales,
  saveProduct,
  setStock,
  startShopCheckout,
  confirmShopCheckout,
  voidLastSale,
} from "@/lib/shop.functions";

type Shop = {
  shopId: string;
  role: "admin" | "staff";
  name: string;
  joinCode: string;
  billing: { status: string; dueAt: string; daysLeft: number; locked: boolean; warn: boolean };
};
type Product = {
  id: number;
  barcode: string;
  name: string;
  pricePence: number;
  stock: number;
  lowStockAt: number;
  category: string;
};
type AlertRow = { id: number; barcode: string; name: string; createdAt: string };
type Line = { barcode: string; name: string; pricePence: number; qty: number };

const money = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export function TillSnap() {
  return (
    <LangProvider>
      <ShopGate />
    </LangProvider>
  );
}

function ShopGate() {
  const { t } = useI18n();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const next = await getShop();
    setShop(next);
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      refresh().catch((e: Error) => setError(e.message));
      return;
    }
    confirmShopCheckout({ data: { sessionId } })
      .then(() => refresh())
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        window.history.replaceState({}, "", "/");
      });
  }, [refresh]);

  if (shop === undefined) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16">
        <p className="display text-3xl">TillSnap</p>
        <p className="mt-2 text-muted">{t.opening}</p>
      </main>
    );
  }

  if (!shop) return <Onboard onReady={setShop} />;
  if (shop.billing.locked) return <Locked shop={shop} />;

  return (
    <>
      {shop.billing.warn ? <PaymentWarning shop={shop} /> : null}
      <Floor shop={shop} bootError={error} />
    </>
  );
}

function PayButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="rounded-full bg-ink px-4 py-3 font-semibold text-paper disabled:opacity-50"
        onClick={() => {
          setBusy(true);
          setError("");
          startShopCheckout()
            .then((result) => {
              window.location.href = result.url;
            })
            .catch((e: Error) => {
              setError(e.message);
              setBusy(false);
            });
        }}
      >
        {busy ? "Opening Stripe…" : "Pay £5 with Stripe"}
      </button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function PaymentWarning({ shop }: { shop: Shop }) {
  const due = new Date(shop.billing.dueAt).toLocaleDateString("en-GB");
  const days = shop.billing.daysLeft === 1 ? "1 day" : `${shop.billing.daysLeft} days`;
  return (
    <div className="mx-auto mt-3 max-w-6xl px-4">
      <div className="rounded-xl border border-ink bg-card px-4 py-3">
        <p className="font-semibold">The £5 payment for {shop.name} was due on {due}.</p>
        <p className="mt-1 text-sm">If it is not paid, this shop loses access in {days}.</p>
        {shop.role === "admin" ? (
          <div className="mt-3">
            <PayButton />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Ask the manager to pay. Staff cannot take payment for the subscription.</p>
        )}
      </div>
    </div>
  );
}

function Locked({ shop }: { shop: Shop }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <p className="display text-4xl">Shop locked</p>
      <p className="mt-3 text-muted">
        The £5 for {shop.name} was due more than 7 days ago, so the till is closed until it is paid.
      </p>
      {shop.role === "admin" ? (
        <div className="mt-6">
          <PayButton />
        </div>
      ) : (
        <p className="mt-4">Ask the manager to pay in Stripe. You will need a new staff code after it is paid.</p>
      )}
    </main>
  );
}

function Onboard({ onReady }: { onReady: (s: Shop) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("Corner shop");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<Shop | null>) => {
    setBusy(true);
    setError("");
    try {
      const shop = await fn();
      if (shop) onReady(shop);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the shop");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-screen max-w-lg content-center gap-6 px-5 py-12">
      <div>
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">{t.yourShop}</p>
        <h1 className="display mt-1 text-4xl">{t.openTill}</h1>
        <p className="mt-2 text-muted">{t.openHint}</p>
      </div>
      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-xl">{t.manager}</h2>
        <label className="mt-3 block text-sm font-medium" htmlFor="shop-name">
          {t.shopName}
        </label>
        <input
          id="shop-name"
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          disabled={busy}
          className="mt-3 w-full rounded-full bg-ink px-4 py-3 font-semibold text-paper disabled:opacity-60"
          onClick={() => run(() => createShop({ data: { name } }))}
        >
          {t.createShop}
        </button>
      </section>
      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-xl">{t.staff}</h2>
        <label className="mt-3 block text-sm font-medium" htmlFor="join-code">
          {t.shopCode}
        </label>
        <input
          id="join-code"
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-3 tracking-widest uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="button"
          disabled={busy}
          className="mt-3 w-full rounded-full border border-ink px-4 py-3 font-semibold disabled:opacity-60"
          onClick={() => run(() => joinShop({ data: { code } }))}
        >
          {t.joinShop}
        </button>
      </section>
      {error ? <p className="text-danger">{error}</p> : null}
    </main>
  );
}

type Tab = "scan" | "shelf" | "till" | "desk" | "settings";

function Floor({ shop, bootError }: { shop: Shop; bootError: string }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("till");
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [basket, setBasket] = useState<Line[]>([]);
  const [error, setError] = useState(bootError);

  const load = useCallback(async () => {
    const [items, notes] = await Promise.all([listProducts(), listAlerts()]);
    setProducts(items);
    setAlerts(notes);
  }, []);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
    const id = window.setInterval(() => {
      if (shop.role === "admin") {
        listAlerts()
          .then(setAlerts)
          .catch(() => undefined);
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [load, shop.role]);

  const addToBasket = (p: Product) => {
    setBasket((lines) => {
      const i = lines.findIndex((l) => l.barcode === p.barcode);
      if (i >= 0) {
        const next = [...lines];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...lines, { barcode: p.barcode, name: p.name, pricePence: p.pricePence, qty: 1 }];
    });
    setTab("till");
  };

  const tabs: Array<[Tab, string, typeof ScanBarcode]> =
    shop.role === "admin"
      ? [
          ["till", t.till, ShoppingBag],
          ["scan", t.scan, ScanBarcode],
          ["shelf", t.shelf, LayoutGrid],
          ["desk", t.desk, Store],
          ["settings", t.settings, Settings],
        ]
      : [
          ["till", t.till, ShoppingBag],
          ["scan", t.scan, ScanBarcode],
          ["shelf", t.shelf, LayoutGrid],
          ["settings", t.settings, Settings],
        ];

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-ink px-4 py-3 text-paper">
        <div>
          <p className="display flex items-center gap-2 text-2xl leading-none">
            <span className="mark" aria-hidden />
            TillSnap
          </p>
          <p className="mt-1 text-sm text-paper/70">
            {shop.name} · {shop.role === "admin" ? t.managerRole : t.staffRole}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {shop.role === "admin" && alerts.length > 0 ? (
            <button
              type="button"
              className="relative rounded-full bg-accent px-3 py-2 text-sm font-semibold text-paper"
              onClick={() => setTab("desk")}
            >
              <span className="inline-flex items-center gap-1">
                <Bell size={16} /> {alerts.length}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-full border border-paper/40 px-4 py-2 text-sm font-semibold"
            onClick={() => setTab("settings")}
          >
            {t.settings}
          </button>
        </div>
      </header>
      {error ? <p className="mx-4 mt-3 rounded-xl bg-card px-3 py-2 text-danger">{error}</p> : null}
      <div className="flex-1 px-4 pt-4">
        {tab === "scan" ? (
          <ScanPane
            products={products}
            onFound={addToBasket}
            onStock={async (barcode, stock) => {
              await setStock({ data: { barcode, stock } });
              await load();
            }}
            onError={setError}
          />
        ) : null}
        {tab === "shelf" ? <Shelf products={products} onSell={addToBasket} /> : null}
        {tab === "till" ? (
          <Till
            products={products}
            basket={basket}
            setBasket={setBasket}
            onPaid={async (method) => {
              await checkout({
                data: { lines: basket.map((l) => ({ barcode: l.barcode, qty: l.qty })), method },
              });
              setBasket([]);
              await load();
            }}
            onVoid={async () => {
              await voidLastSale();
              await load();
            }}
            onError={setError}
          />
        ) : null}
        {tab === "settings" ? <SettingsPane role={shop.role} /> : null}
        {tab === "desk" && shop.role === "admin" ? (
          <Desk
            shop={shop}
            products={products}
            alerts={alerts}
            onChange={load}
            onError={setError}
          />
        ) : null}
      </div>
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl px-1 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                tab === id ? "text-accent" : "text-muted"
              }`}
              onClick={() => setTab(id)}
            >
              <span className={`rounded-full px-3 py-1 ${tab === id ? "bg-accent/10" : ""}`}>
                <Icon size={20} />
              </span>
              {label}
              {id === "till" && basket.length ? ` (${basket.reduce((n, l) => n + l.qty, 0)})` : ""}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

type DetectorCtor = new (o: { formats: string[] }) => {
  detect: (s: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

function BarcodeCam({
  onCode,
  onError,
  once,
  label,
}: {
  onCode: (code: string) => void;
  onError: (m: string) => void;
  once?: boolean;
  label?: string;
}) {
  const [live, setLive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  const onErrorRef = useRef(onError);
  onCodeRef.current = onCode;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!live) return;
    let stop = false;
    let stream: MediaStream | null = null;
    const Detector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stop || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!Detector) return;
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        let last = "";
        let until = 0;
        const tick = async () => {
          if (stop || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            const now = Date.now();
            if (value && (value !== last || now >= until)) {
              last = value;
              until = now + 1400;
              onCodeRef.current(value);
              if (once) {
                stop = true;
                stream?.getTracks().forEach((t) => t.stop());
                setLive(false);
                return;
              }
            }
          } catch {
            /* frame not ready */
          }
          if (!stop) requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch (e) {
        onErrorRef.current(e instanceof Error ? e.message : "Camera blocked");
        setLive(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [live, once]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink">
      {live ? (
        <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
      ) : (
        <button
          type="button"
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-paper"
          onClick={() => setLive(true)}
        >
          <Camera size={28} />
          {label ?? "Scan barcode"}
        </button>
      )}
    </div>
  );
}

function ScanPane({
  products,
  onFound,
  onStock,
  onError,
}: {
  products: Product[];
  onFound: (p: Product) => void;
  onStock: (barcode: string, stock: number) => Promise<void>;
  onError: (m: string) => void;
}) {
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");
  const hit = products.find((p) => p.barcode === code.trim());

  useEffect(() => {
    if (hit) setQty(String(hit.stock));
  }, [hit]);

  return (
    <section className="space-y-4">
      <BarcodeCam onCode={setCode} onError={onError} />
      <label className="block text-sm font-medium" htmlFor="barcode">
        Barcode
      </label>
      <input
        id="barcode"
        inputMode="numeric"
        className="w-full rounded-xl border border-line bg-card px-3 py-3 text-lg"
        placeholder="Scan or type"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {!hit && code.trim().length >= 4 ? (
        <p className="text-muted">Not on the shelf yet. A manager can add it from Desk.</p>
      ) : null}
      {hit ? (
        <article className="rounded-xl border border-line bg-card p-4">
          <p className="text-sm text-muted">{hit.category}</p>
          <h2 className="text-2xl">{hit.name}</h2>
          <p className="mt-1 text-2xl font-semibold">{money(hit.pricePence)}</p>
          <p className={hit.stock <= 0 ? "text-danger font-semibold" : hit.stock <= hit.lowStockAt ? "text-accent" : "text-moss"}>
            {hit.stock <= 0 ? "Out of stock" : `${hit.stock} on the shelf`}
          </p>
          <label className="mt-3 block text-sm font-medium" htmlFor="qty">
            Set stock
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="qty"
              inputMode="numeric"
              className="w-full rounded-xl border border-line bg-paper px-3 py-3"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <button
              type="button"
              className="rounded-full bg-ink px-4 py-3 font-semibold text-paper"
              onClick={() =>
                onStock(hit.barcode, Number(qty) || 0).catch((e: Error) => onError(e.message))
              }
            >
              Save
            </button>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-full bg-accent px-4 py-3 font-semibold text-paper"
            onClick={() => onFound(hit)}
          >
            Add to till
          </button>
        </article>
      ) : null}
    </section>
  );
}

function Shelf({ products, onSell }: { products: Product[]; onSell: (p: Product) => void }) {
  const [q, setQ] = useState("");
  const rows = products.filter((p) => `${p.name} ${p.barcode}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="space-y-3">
      <input
        className="w-full rounded-xl border border-line bg-card px-3 py-3"
        placeholder="Search the shelf"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {rows.map((p) => (
        <article key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-4">
          <div>
            <h2 className="text-lg leading-tight">{p.name}</h2>
            <p className="text-sm text-muted">{p.barcode}</p>
            <p className={p.stock <= 0 ? "text-danger font-semibold" : "text-moss"}>{p.stock} in stock</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{money(p.pricePence)}</p>
            <button type="button" className="mt-2 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-paper" onClick={() => onSell(p)}>
              Till
            </button>
          </div>
        </article>
      ))}
      {rows.length === 0 ? <p className="text-muted">Nothing matches.</p> : null}
    </section>
  );
}

function Till({
  products,
  basket,
  setBasket,
  onPaid,
  onVoid,
  onError,
}: {
  products: Product[];
  basket: Line[];
  setBasket: (next: Line[] | ((lines: Line[]) => Line[])) => void;
  onPaid: (method: "cash" | "card") => Promise<void>;
  onVoid: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const total = basket.reduce((n, l) => n + l.pricePence * l.qty, 0);

  const pay = (method: "cash" | "card") => {
    setBusy(true);
    setNote("");
    onPaid(method)
      .then(() => setNote(method === "card" ? "Card taken." : "Cash taken."))
      .catch((e: Error) => onError(e.message))
      .finally(() => setBusy(false));
  };

  const addCode = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const product = products.find((p) => p.barcode === code);
    if (!product) {
      onError(`${t.nothing} ${code}.`);
      return;
    }
    onError("");
    setBasket((lines) => {
      const i = lines.findIndex((l) => l.barcode === product.barcode);
      if (i >= 0) {
        const next = [...lines];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...lines, { barcode: product.barcode, name: product.name, pricePence: product.pricePence, qty: 1 }];
    });
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-3">
        <h2 className="text-3xl">{t.till}</h2>
        <BarcodeCam onCode={addCode} onError={onError} label={t.scanBarcode} />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addCode(typed);
            setTyped("");
          }}
        >
          <input
            inputMode="numeric"
            className="w-full rounded-xl border border-line bg-card px-4 py-4 text-lg"
            placeholder={t.typeBarcode}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button type="submit" className="rounded-full bg-ink px-5 py-4 text-lg font-semibold text-paper">
            {t.add}
          </button>
        </form>
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl">{t.basket}</h2>
        {basket.length === 0 ? <p className="text-muted">{t.emptyBasket}</p> : null}
        {basket.map((l) => (
          <div key={l.barcode} className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-4">
            <div>
              <p className="text-xl font-semibold">{l.name}</p>
              <p className="text-muted">
                {l.qty} × {money(l.pricePence)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xl font-semibold">{money(l.pricePence * l.qty)}</p>
              <button
                type="button"
                className="rounded-full border border-line px-4 py-3 font-semibold"
                onClick={() => setBasket(basket.filter((x) => x.barcode !== l.barcode))}
              >
                {t.remove}
              </button>
            </div>
          </div>
        ))}
        <p className="display text-5xl">
          {t.total} {money(total)}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!basket.length || busy}
            className="rounded-full bg-accent px-4 py-5 text-xl font-semibold text-paper disabled:opacity-50"
            onClick={() => pay("cash")}
          >
            {busy ? t.paying : t.cash}
          </button>
          <button
            type="button"
            disabled={!basket.length || busy}
            className="rounded-full bg-ink px-4 py-5 text-xl font-semibold text-paper disabled:opacity-50"
            onClick={() => pay("card")}
          >
            {busy ? t.paying : t.card}
          </button>
        </div>
        <button
          type="button"
          disabled={!basket.length || busy}
          className="w-full rounded-full border border-line px-4 py-3 font-semibold disabled:opacity-50"
          onClick={() => {
            setBasket([]);
            onError("");
            setNote("");
          }}
        >
          {t.cancelSale}
        </button>
        <button
          type="button"
          disabled={busy}
          className="w-full rounded-full border border-danger px-4 py-3 font-semibold text-danger disabled:opacity-50"
          onClick={() => {
            setBusy(true);
            onVoid()
              .then(() => setNote(t.voided))
              .catch((e: Error) => onError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          {t.voidLast}
        </button>
        {note ? <p className="font-semibold text-moss">{note}</p> : null}
        <p className="text-sm text-muted">{t.payNote}</p>
      </div>
    </section>
  );
}

function SettingsPane({ role }: { role: "admin" | "staff" }) {
  const { lang, setLang, t } = useI18n();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      if (role === "staff") await leaveShop();
      await signOut();
    } catch {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg space-y-4">
      <h2 className="text-3xl">{t.settings}</h2>
      <Link to="/get" className="block rounded-xl border border-line bg-card px-4 py-4 font-semibold">
        Get the app on this phone
      </Link>
      <label className="block text-sm font-medium">
        {t.language}
        <select
          className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-4 text-lg"
          value={lang}
          onChange={(e) => setLang(e.target.value as typeof lang)}
        >
          {LANGS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="w-full rounded-full border border-danger px-4 py-4 text-lg font-semibold text-danger" onClick={() => setAsk(true)}>
        {t.signOut}
      </button>
      {ask ? (
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-lg">{role === "staff" ? t.staffWarn : t.adminWarn}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-full bg-ink px-4 py-3 font-semibold text-paper" disabled={busy} onClick={() => void confirm()}>
              {busy ? t.signingOut : t.signOut}
            </button>
            <button type="button" className="rounded-full border border-line px-4 py-3 font-semibold" onClick={() => setAsk(false)}>
              {t.stay}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Desk({
  shop,
  products,
  alerts,
  onChange,
  onError,
}: {
  shop: Shop;
  products: Product[];
  alerts: AlertRow[];
  onChange: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    barcode: "",
    price: "1.00",
    stock: "0",
    category: "Grocery",
  });
  const [sales, setSales] = useState<Array<{ id: number; totalPence: number; createdAt: string; method: string; voided: boolean }>>([]);
  const [month, setMonth] = useState({ cash: 0, card: 0 });
  const out = products.filter((p) => p.stock <= 0).length;
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length;

  useEffect(() => {
    listSales()
      .then((report) => {
        setSales(report.rows);
        setMonth({ cash: report.monthCash, card: report.monthCard });
      })
      .catch((e: Error) => onError(e.message));
  }, [onError, products]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Lines" value={String(products.length)} />
        <Stat label="Low" value={String(low)} />
        <Stat label="Out" value={String(out)} />
      </div>
      <article className="rounded-xl border border-line bg-card p-4">
        <p className="text-sm text-muted">Taken this month</p>
        <p className="display text-4xl">{money(month.cash + month.card)}</p>
        <p className="mt-1 text-sm text-muted">
          Cash {money(month.cash)} · Card {money(month.card)}
        </p>
      </article>
      <article className="rounded-xl border border-line bg-card p-4">
        <p className="text-sm text-muted">Staff join code</p>
        <p className="display text-3xl tracking-widest">{shop.joinCode}</p>
      </article>
      {alerts.map((a) => (
        <article key={a.id} className="rounded-xl border border-line bg-card p-4">
          <p className="font-semibold text-danger">{a.name} is out of stock</p>
          <p className="text-sm text-muted">{a.barcode}</p>
          <button
            type="button"
            className="mt-2 rounded-full border border-line px-3 py-2 text-sm font-semibold"
            onClick={() =>
              dismissAlert({ data: { id: a.id } })
                .then(onChange)
                .catch((e: Error) => onError(e.message))
            }
          >
            Dismiss
          </button>
        </article>
      ))}
      <form
        className="space-y-2 rounded-xl border border-line bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const pounds = Number(form.price);
          saveProduct({
            data: {
              name: form.name,
              barcode: form.barcode.trim(),
              pricePence: Math.round(pounds * 100),
              stock: Number(form.stock) || 0,
              lowStockAt: 3,
              category: form.category,
            },
          })
            .then(onChange)
            .catch((err: Error) => onError(err.message));
        }}
      >
        <h2 className="text-xl">Add a product</h2>
        <BarcodeCam
          once
          onError={onError}
          onCode={(barcode) => {
            const existing = products.find((p) => p.barcode === barcode);
            setForm((current) => ({
              ...current,
              barcode,
              name: existing?.name ?? current.name,
              price: existing ? (existing.pricePence / 100).toFixed(2) : current.price,
              stock: existing ? String(existing.stock) : current.stock,
              category: existing?.category ?? current.category,
            }));
          }}
        />
        <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Barcode" value={form.barcode} onChange={(barcode) => setForm({ ...form, barcode })} />
        <Field label="Price (£)" value={form.price} onChange={(price) => setForm({ ...form, price })} />
        <Field label="Stock" value={form.stock} onChange={(stock) => setForm({ ...form, stock })} />
        <label className="block text-sm font-medium">
          Category
          <select
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-3"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {["Grocery", "Drinks", "Snacks", "Household", "Other"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="w-full rounded-full bg-ink px-4 py-3 font-semibold text-paper">
          Save product
        </button>
      </form>
      <div>
        <h2 className="text-xl">Recent sales</h2>
        {sales.length === 0 ? <p className="mt-1 text-muted">No sales yet.</p> : null}
        {sales.map((s) => (
          <p key={s.id} className="mt-2 flex justify-between text-sm">
            <span className="text-muted">{s.createdAt.slice(0, 16).replace("T", " ")}</span>
            <span className="font-semibold">
              {s.voided ? "Cancelled" : `${s.method === "card" ? "Card" : "Cash"} ${money(s.totalPence)}`}
            </span>
          </p>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  );
}
