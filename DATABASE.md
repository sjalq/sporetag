# Database Setup - Cloudflare D1

This project uses Cloudflare D1 (SQLite-based) for data storage.

## Schema

The database contains a single `spores` table for storing location-based messages:

```sql
CREATE TABLE spores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    message TEXT NOT NULL CHECK(length(message) <= 280),
    cookie_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);
```

**Indexes:**
- `idx_spores_location` on `(lat, lng)` for efficient geographic queries
- `idx_spores_cookie` on `cookie_id` for user-specific queries

## Setup

1. **Authenticate with Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Create databases:**
   ```bash
   ./scripts/setup-d1.sh
   ```

3. **Update `wrangler.toml`** with the actual database IDs returned from step 2

4. **Run migrations:**
   ```bash
   npx wrangler d1 execute sporetag-db --file=./migrations/0001_initial_schema.sql
   npx wrangler d1 execute sporetag-db-prod --file=./migrations/0001_initial_schema.sql
   npx wrangler d1 execute sporetag-db-preview --file=./migrations/0001_initial_schema.sql
   ```

## Testing

Test database connectivity:
```bash
npx wrangler d1 execute sporetag-db --command='SELECT name FROM sqlite_master WHERE type="table"'
```

## Environment Configuration

- **Development:** `sporetag-db`
- **Preview:** `sporetag-db-preview`  
- **Production:** `sporetag-db-prod`

All databases are bound to the `DB` variable in your Cloudflare Workers/Pages environment.