# Nexus Agent Dashboard (autoborosai-dashboard)

Next.js 15 (App Router, TypeScript) dashboard for monitoring multi-agent systems: agent status, task
orchestration, governance and analytics, with a WebSocket feed. See [CLAUDE.md](./CLAUDE.md) for the
full architecture and [DEPLOYMENT.md](./DEPLOYMENT.md) for deploy notes.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in local values; never commit .env.local
npm run dev                        # http://localhost:3000
```

| Script | Does |
|--------|------|
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | `next lint` |
| `npm run type-check` | `tsc --noEmit` |
| `npm run format` | Prettier over `src/` |
| `npm run analyze` | Bundle analysis build |

A `vitest.config.ts` exists but there is no `test` script yet.

## Deploy

- **Vercel** (`vercel.json`, region `syd1`, domain `autoborosai.com.au`) — Aurora's own project, not a client site.
- **GitHub Pages is unfinished:** `.github/workflows/deploy.yml` uploads `./out`, but `next.config.js` does not enable static export, so the current build does not produce that artifact. Choose a deployment target and validate its output before relying on this workflow.
- `.env.production` is a sanitized template — set real values as platform secrets, never in git.
