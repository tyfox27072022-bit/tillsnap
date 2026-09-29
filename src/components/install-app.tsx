import { useEffect } from "react";

/** Registers the service worker so phones can install TillSnap. Dev skips it so hot reload stays clean. */
export function InstallApp() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
