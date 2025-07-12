# Local Development Guide for Sporetag

This guide explains how to run Sporetag locally for development and demo purposes.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Wrangler CLI (installed as dev dependency)

## Quick Start - Mock API Server (Recommended for Demos)

The simplest way to run Sporetag locally is using the mock API server:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server with mock API
npm run dev:mock
```

This will:
- Start a mock API server on http://localhost:8788
- Start the Vite dev server on http://localhost:5173
- Initialize with demo spore data
- Support all API functionality without needing Cloudflare setup

## Full Cloudflare Development Environment

For development that closely matches production:

### 1. Initialize Local D1 Database

```bash
# Create and initialize local database
npm run db:init
```

### 2. Run with Wrangler

```bash
# Run full development environment
npm run dev:full
```

This uses:
- Wrangler for local Cloudflare Pages Functions
- Local D1 SQLite database
- Vite dev server with proxy

## Available Scripts

- `npm run dev` - Run only Vite dev server (frontend only)
- `npm run dev:mock` - Run with mock API server (recommended for demos)
- `npm run dev:full` - Run with Wrangler (full Cloudflare simulation)
- `npm run mock-api` - Run only the mock API server
- `npm run db:init` - Initialize local D1 database
- `npm run build` - Build for production
- `npm run deploy` - Deploy to Cloudflare Pages

## Mock API Features

The mock API server (`scripts/mock-api-server.js`) provides:

- Pre-populated demo spores around Cape Town
- Full CRUD operations for spores
- Rate limiting (5 spores per hour per user)
- Bounding box queries for map viewport
- Pagination support
- CORS enabled for local development

## Troubleshooting

### Port Conflicts

If port 8788 is already in use:
1. Stop any running Cloudflare Workers/Pages processes
2. Or modify the port in `vite.config.ts` and `scripts/mock-api-server.js`

### Database Issues

If using full Wrangler setup and database errors occur:
1. Delete `.wrangler/state` directory
2. Run `npm run db:init` again

### Dependency Issues

Due to React 19 compatibility, use:
```bash
npm install --legacy-peer-deps
```

## Environment Variables

For local development with mock server, no environment variables are needed.

For Wrangler development, see `.dev.vars` file for configuration options.

## API Endpoints

Both mock and production servers support:

- `GET /api/spores` - List spores with optional filters
  - Query params: `minLat`, `maxLat`, `minLng`, `maxLng`, `cursor`, `limit`
- `POST /api/spores` - Create a new spore
  - Body: `{ lat, lng, message, cookie_id }`

## Demo Data Locations

The mock server includes spores at these Cape Town locations:
- Kirstenbosch Botanical Gardens
- Company's Garden
- Camps Bay
- Signal Hill
- Newlands Forest

Feel free to add more in `scripts/mock-api-server.js`!