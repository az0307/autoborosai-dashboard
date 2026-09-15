# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexus Agent Dashboard is a Next.js 15 (App Router) enterprise web app for monitoring and managing multi-agent systems — real-time visualization of agent performance, task orchestration, governance compliance, and system analytics through a glass-morphism UI. TypeScript (strict), Tailwind, Zustand, TanStack Query, Socket.io client, Framer Motion, Recharts, Radix, React Hook Form + Zod. Standard Next.js scripts (`dev`/`build`/`start`/`lint`), plus `type-check`, `format`, and `analyze` — see `package.json`.

Read `src/` for the layout, `src/types/index.ts` for the domain type system, `src/stores/` for Zustand stores, `tailwind.config.js` for the design tokens, and `src/lib/api.ts` / `src/hooks/use-websocket.tsx` for the API + WebSocket clients.

## Conventions (not derivable from the code)

- **Always use the configured TypeScript path aliases** (`@/components`, `@/lib`, `@/hooks`, `@/stores`, `@/types`, …) instead of relative paths.
- Use the comprehensive type system in `src/types/index.ts` as the single source of truth — don't create ad-hoc interfaces that duplicate domain models.
- Use the `<GlassPanel>` component for glass-morphism styling rather than re-implementing it.
- Prefer functional components with hooks and named exports; use Zod for runtime validation; implement error boundaries for fault tolerance.

## Backend contract

This is a front end only; it expects a separate **FastAPI** backend (default `http://localhost:8000`, WS `ws://localhost:8000`, overridable via `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` / `NEXT_PUBLIC_ENVIRONMENT`). The backend must provide:

1. **REST API** at `/api/*`
2. **WebSocket** at `/ws` for real-time updates
3. **Health check** at `/api/analytics/health`
4. **API docs** at `/docs` (FastAPI auto-docs)

WebSocket messages follow:

```typescript
interface WebSocketMessage {
  type: string        // event type from WEBSOCKET_EVENTS (src/lib/constants.ts)
  data: any           // event payload
  timestamp: string   // ISO timestamp
  id?: string         // optional message ID
  roomId?: string     // optional room for scoped updates
}
```

The `ApiClient` (`src/lib/api.ts`) provides error handling, a 30s request timeout, retry with exponential backoff, batch requests, file upload, and auth-token management — reuse it rather than calling `fetch` directly.

## Known architectural decisions (rationale)

1. **App Router over Pages Router** — Next.js 15 performance/DX.
2. **Zustand over Redux** — simpler API, better TS support, smaller bundle.
3. **Socket.io over native WebSocket** — automatic reconnection, room support, fallback mechanisms.
4. **Glass-morphism design** — enterprise aesthetic, visual hierarchy.
5. **Comprehensive type system** — single source of truth prevents type drift.
6. **API client abstraction** — centralized error handling, retry, and request config.
