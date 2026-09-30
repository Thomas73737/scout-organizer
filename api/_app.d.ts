// Type surface for the bundle produced by scripts/build-vercel-api.mjs.
//
// That file is generated during the Vercel build and is gitignored, so it is
// not present for `tsc` to inspect. Its default export is the Express
// application from artifacts/api-server/src/vercel.ts, which is itself callable
// as an Express request listener.
//
// The wildcard form is used because TypeScript only matches relative
// `declare module` names when the containing file sits in the same directory,
// and the generated file may be absent entirely on a clean checkout.
declare module "*_app.mjs" {
  import type { RequestListener } from "node:http";

  const app: RequestListener;
  export default app;
}
