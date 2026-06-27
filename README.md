# GLiveStreamers

A live streaming platform — monorepo.

## Structure

| Path                  | Description                         |
|-----------------------|-------------------------------------|
| `apps/api`            | Backend API service                 |
| `apps/web`            | Frontend web application            |
| `packages/sdk`        | Client SDK for streamers            |
| `packages/shared`     | Shared types, utilities, constants  |
| `packages/ui`         | Reusable UI component library       |
| `packages/livekit`    | LiveKit integration helpers         |
| `database/`           | Database schema, migrations, seeds  |
| `docs/`               | Documentation                       |
| `scripts/`            | Build and dev scripts               |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Prerequisites

- Node.js >= 18
- pnpm >= 8
