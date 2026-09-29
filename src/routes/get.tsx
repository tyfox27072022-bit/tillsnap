import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/get")({ component: GetApp });

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Kind = "ios" | "android" | "desktop";

function GetApp() {
  const [kind, setKind] = useState<Kind>("desktop");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setKind("ios");
    else if (/Android/.test(ua)) setKind("android");
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setDone(true);
    setPrompt(null);
  };

  return (
    <div className="pb-20">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" className="display flex items-center gap-2 text-2xl">
            <span className="mark" aria-hidden />
            TillSnap
          </Link>
          <Link to="/login" className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink">
            Sign in
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 pt-8">

      <p className="text-sm font-semibold tracking-wide text-accent uppercase">On your phone</p>
      <h1 className="display mt-2 text-5xl leading-none">Get the app.</h1>
      <p className="mt-3 max-w-lg text-lg text-muted">
        TillSnap lives on the home screen. Same shop, same prices, no App Store. The £5 a month is the shop, not the download.
      </p>

      {installed || done ? (
        <p className="mt-6 rounded-xl border border-line bg-card px-4 py-4 font-semibold text-moss">
          TillSnap is on this device. Open it from the home screen.
        </p>
      ) : null}

      {prompt ? (
        <button
          type="button"
          className="mt-6 rounded-full bg-accent px-5 py-3 text-lg font-semibold text-paper"
          onClick={() => void install()}
        >
          Install TillSnap
        </button>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <PhoneCard
          title="iPhone"
          active={kind === "ios"}
          steps={[
            "Open this page in Safari. Chrome on iPhone cannot add it.",
            "Tap Share, then Add to Home Screen.",
            "Tap Add. The till icon stays on the home screen.",
          ]}
        />
        <PhoneCard
          title="Android"
          active={kind === "android"}
          steps={[
            "Open this page in Chrome.",
            "Tap Install TillSnap if the button is showing.",
            "If not, open the Chrome menu and tap Install app, or Add to Home screen.",
          ]}
        />
      </div>

      <section className="mt-8 rounded-xl border border-line bg-card p-5">
        <h2 className="text-2xl">On a tablet at the counter</h2>
        <p className="mt-2 text-muted">
          Use the same page. A tablet in the browser is the till. Add it to the home screen so staff open TillSnap, not a tab.
        </p>
        {kind === "desktop" ? (
          <p className="mt-3 text-sm">
            You are on a computer. Send this page to the shop phone, or scan it from the phone camera.
          </p>
        ) : null}
      </section>
      </div>
    </div>
  );
}

function PhoneCard({ title, steps, active }: { title: string; steps: string[]; active: boolean }) {
  return (
    <article className={`rounded-xl border bg-card p-5 ${active ? "border-accent" : "border-line"}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">{title}</h2>
        {active ? <span className="text-xs font-semibold tracking-wide text-accent uppercase">This phone</span> : null}
      </div>
      <ol className="mt-3 space-y-2 text-sm">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="display text-lg leading-none text-accent">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
