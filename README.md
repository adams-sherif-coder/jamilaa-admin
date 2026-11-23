# Jamila admin — frontend demo

Standalone React/Vite frontend. No backend, database, API key, or environment variables needed.

Run with Node 22.12+ and pnpm 10+: 

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

Deploy this folder as the Vercel project root, Vite preset, build command `npm run build`, output `dist`. Included vercel.json handles deep links.

Data: src/demo/catalog.json and src/demo/data.js. Photos: public/images. Demo changes persist only in this browser/origin. No real authentication or payment processing. Admin/POS open automatically as a demo owner.

See ../README.md for full instructions and supported demo actions.
