# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexus Agent Dashboard is a Next.js-based enterprise web application for monitoring and managing multi-agent systems. It provides real-time visualization of agent performance, task orchestration, governance compliance, and system analytics through a glass-morphism UI design.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode with enhanced compiler options)
- **Styling**: Tailwind CSS with custom glass-morphism design system
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query v5)
- **Real-time**: Socket.io client for WebSocket connections
- **Animations**: Framer Motion
- **Charts**: Recharts
- **UI Components**: Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (default port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Lint code
npm run lint

# Format code with Prettier
npm run format

# Bundle analysis
npm run analyze
```

## Architecture Overview

### Directory Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── agents/       # Agent management pages
│   ├── analytics/    # Analytics and metrics pages
│   ├── dashboard/    # Main dashboard page
│   ├── governance/   # Governance and compliance pages
│   ├── api/          # API route handlers
│   └── layout.tsx    # Root layout with providers
├── components/       # React components
│   ├── agents/       # Agent-specific components
│   ├── dashboard/    # Dashboard components
│   └── ui/           # Reusable UI components (glass-panel, spinners)
├── hooks/            # Custom React hooks
│   └── use-websocket.tsx  # WebSocket connection management
├── stores/           # Zustand state stores
│   └── agent-store.ts     # Agent state management
├── types/            # TypeScript type definitions
│   └── index.ts      # Comprehensive type system
├── lib/              # Utility libraries
│   ├── api.ts        # API client with retry and batch support
│   ├── constants.ts  # API endpoints and WebSocket events
│   └── utils.ts      # Shared utility functions
└── utils/            # Additional utilities
```

### Path Aliases

TypeScript path aliases are configured for cleaner imports:

```typescript
@/*          → ./src/*
@/components → ./src/components/*
@/app        → ./src/app/*
@/lib        → ./src/lib/*
@/hooks      → ./src/hooks/*
@/stores     → ./src/stores/*
@/types      → ./src/types/*
@/utils      → ./src/utils/*
```

Always use these aliases instead of relative paths.

## Backend Integration

### API Configuration

The dashboard connects to a FastAPI backend:

- **Default API URL**: `http://localhost:8000`
- **Default WebSocket URL**: `ws://localhost:8000`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Override API base URL
  - `NEXT_PUBLIC_WS_URL`: Override WebSocket URL
  - `NEXT_PUBLIC_ENVIRONMENT`: Set environment (development/production)

### API Client Usage

The `ApiClient` class (`src/lib/api.ts`) provides:
- Automatic error handling
- Request timeout (30s default)
- Retry logic with exponential backoff
- Batch request support
- File upload support
- Authentication token management

```typescript
import { api } from '@/lib/api'

// Named API methods
const agents = await api.getAgents()
const agent = await api.getAgent(id)
await api.updateAgentStatus(id, 'active')

// Custom requests with retry
import { apiClient } from '@/lib/api'
const result = await apiClient.withRetry('/custom/endpoint', { method: 'POST' })
```

### WebSocket Integration

Real-time updates are handled through Socket.io:

```typescript
import { useWebSocket } from '@/hooks/use-websocket'

const { connected, lastMessage, emit } = useWebSocket({
  url: WS_URL,
  autoConnect: true,
  reconnect: true,
})
```

WebSocket events are defined in `src/lib/constants.ts` under `WEBSOCKET_EVENTS`.

## Type System

The application uses a comprehensive type system defined in `src/types/index.ts`:

- **Core Types**: `Agent`, `Task`, `Policy`, `OrchestrationPattern`
- **Enums**: `AgentType`, `AgentStatus`, `TaskType`, `TaskStatus`, etc.
- **Performance**: `AgentPerformance`, `PerformanceMetrics`, `AnalyticsMetrics`
- **Governance**: `Policy`, `AuditEntry`, `Conflict`, `ConflictResolution`
- **WebSocket**: `WebSocketMessage`, `AgentStatusUpdate`, `TaskUpdate`
- **API**: `ApiResponse<T>`, `PaginationInfo`

Always use these types instead of creating ad-hoc interfaces.

## State Management

### Zustand Stores

Global state is managed with Zustand stores in `src/stores/`:

```typescript
import { useAgentStore } from '@/stores/agent-store'

// In components
const { agents, selectAgent, updateAgent } = useAgentStore()

// Update agent
updateAgent(id, { status: 'active' })

// Set filters
setFilters({ search: 'bot', status: ['active'] })
```

Store architecture:
- Immutable updates
- Normalized state structure
- Selective subscriptions for performance

## Styling System

### Tailwind Configuration

Custom design tokens in `tailwind.config.js`:

**Colors**:
- Primary: `#137fec` (electric blue)
- Status colors: `status-active`, `status-idle`, `status-busy`, `status-offline`
- Glass morphism: `glass-surface`, `glass-border`, `glass-highlight`
- Background: `background-dark` (#101922)

**Typography**:
- Display: Space Grotesk
- Body: Inter
- Mono: JetBrains Mono

**Custom animations**:
- `animate-spin-slow`: 60s rotation
- `animate-pulse-glow`: Glowing effect
- `animate-float`: Floating motion
- `animate-orbit`: Orbital animation

### Glass-Morphism Components

Use `<GlassPanel>` component for consistent glass-morphism styling:

```tsx
import { GlassPanel } from '@/components/ui/glass-panel'

<GlassPanel variant="primary" className="p-6">
  {/* Content */}
</GlassPanel>
```

## Testing Considerations

When writing tests:
- Mock API calls using `src/lib/api.ts` client methods
- Mock WebSocket connections from `src/hooks/use-websocket.tsx`
- Use MSW (Mock Service Worker) for API mocking if needed
- Test Zustand stores in isolation using store methods

## Common Development Patterns

### Adding a New Agent Feature

1. Define types in `src/types/index.ts`
2. Add API endpoint to `src/lib/constants.ts`
3. Add API method to `src/lib/api.ts`
4. Update Zustand store if needed
5. Create component in `src/components/agents/`
6. Add route in `src/app/agents/`

### Real-time Updates

1. Define WebSocket event in `WEBSOCKET_EVENTS`
2. Use `useWebSocket` hook to subscribe
3. Update Zustand store on message receipt
4. UI automatically updates via store subscription

### Adding a New Dashboard View

1. Create page in `src/app/[feature]/page.tsx`
2. Create components in `src/components/[feature]/`
3. Use `<GlassPanel>` for consistent styling
4. Fetch data with TanStack Query
5. Subscribe to real-time updates with `useWebSocket`

## Performance Optimization

- **Package imports**: Optimized for `lucide-react`, `lodash`, `date-fns`, `recharts`, `framer-motion`
- **Image optimization**: WebP/AVIF formats, responsive sizes
- **CSS optimization**: Experimental CSS optimization enabled
- **Type safety**: Strict TypeScript with `noUncheckedIndexedAccess`

## Code Style Guidelines

- Use functional components with hooks
- Prefer named exports for components
- Use TypeScript strict mode features
- Follow path alias conventions
- Use semantic HTML and ARIA attributes
- Implement error boundaries for fault tolerance
- Use Zod for runtime validation
- Prefer composition over inheritance

## Integration Points

### Backend Contract

The dashboard expects the backend to provide:

1. **REST API** at `/api/*` endpoints
2. **WebSocket** at `/ws` for real-time updates
3. **Health check** at `/api/analytics/health`
4. **API documentation** at `/docs` (FastAPI auto-docs)

### WebSocket Message Format

```typescript
interface WebSocketMessage {
  type: string           // Event type from WEBSOCKET_EVENTS
  data: any             // Event payload
  timestamp: string     // ISO timestamp
  id?: string          // Optional message ID
  roomId?: string      // Optional room for scoped updates
}
```

## Known Architectural Decisions

1. **App Router over Pages Router**: Leveraging Next.js 15 App Router for better performance and developer experience
2. **Zustand over Redux**: Simpler API, better TypeScript support, smaller bundle
3. **Socket.io over native WebSocket**: Automatic reconnection, room support, fallback mechanisms
4. **Glass-morphism design**: Matches enterprise aesthetic, improves visual hierarchy
5. **Comprehensive type system**: Single source of truth for domain models prevents type drift
6. **API client abstraction**: Centralized error handling, retry logic, and request configuration
