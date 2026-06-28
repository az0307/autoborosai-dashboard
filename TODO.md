# TODO — Nexus Agent Dashboard (autoborosai-dashboard)

Review date: 2026-06-27. Tracks outstanding work for this repo. Part of the Aurora/Ouroboros
consolidated review (`Aurora-AI-Agency/REPOSITORY-REVIEW.md`).

## Status

🟢 Healthy. Next.js 15 + TypeScript glass-morphism dashboard for monitoring multi-agent systems.
Good `CLAUDE.md`, `DEPLOYMENT.md`, Vitest + Vercel config in place.

## P0 — security hygiene
- [ ] **Purge committed `.env.production` from history.** The file is sanitized (no live secrets) and
      self-documents the fix, but the purge has not been run:
      `git filter-repo --path .env.production --invert-paths`
- [ ] Add `.env.production` to `.gitignore` so it can't be re-committed; keep only `.env.local.example`.

## P1 — correctness
- [ ] Verify a clean build: `npm install && npm run build && npm run type-check && npm run lint`.
- [ ] Confirm the production backend contract (AutoBoros FastAPI): set real
      `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` as Vercel secrets, not in-repo.
- [ ] Confirm `/api/analytics/health` and the WebSocket `/ws` endpoints match the live backend.

## P2 — quality
- [ ] Add unit tests for the Zustand `agent-store` and the `ApiClient` retry/batch logic (Vitest is configured).
- [ ] Add a smoke test that the dashboard renders with a mocked API.
- [ ] Add minimal CI (build + type-check + lint) on PR.

## Notes
- Path aliases (`@/components`, `@/lib`, …) are configured — keep imports using them.
- Real-time updates flow: WebSocket event → Zustand store → UI. Keep new features on that pattern.
