# SvaraLens marketing site (standalone)

React + TypeScript + Vite + Tailwind v4 + Three.js / React Three Fiber.

    npm install
    npm run dev                 # site on :5173 (proxies /api to :8787)
    node server/index.mjs       # access-request endpoint on :8787
    npm run build && node server/index.mjs   # serve the built site + endpoint together

Requests are validated server-side, rate-limited (5 / 15 min / IP), honeypot- and timing-checked, and appended to
`server/data/access-requests.jsonl` (override with ACCESS_STORE). Move this to your real backend/mailer before launch.

## Wiring into the real app (env vars, all optional)
VITE_APP_URL (Workbench entry, default /app/), VITE_AUTH_URL (sign-in; unset opens Request Access),
VITE_DOCS_URL (Documentation links hidden when unset), VITE_CAPSULE_URL, VITE_ACCESS_ENDPOINT,
VITE_PRIVACY_URL, VITE_TERMS_URL (legal links hidden when unset).

## Before publishing
- Replace https://example.com in index.html, robots.txt and sitemap.xml with the real origin.
- Drop a real screenshot at public/images/workbench-preview.webp (until then a labelled schematic shows).
- Review the FAQ copy in FAQSection.tsx against what the deployed product really does.
- public/app/index.html is only a placeholder entry page.
