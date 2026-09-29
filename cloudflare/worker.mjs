import app from "../dist/server/index.js";
export { TillSnapStore } from "./store.mjs";

export default {
  fetch(request, env, ctx) {
    globalThis.__TILLSNAP_ENV = env;
    const handler = app?.fetch ? app : app?.default;
    if (!handler?.fetch) return new Response("TillSnap worker is missing its fetch handler", { status: 500 });
    return handler.fetch(request, env, ctx);
  },
};
