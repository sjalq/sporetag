#!/bin/bash

# D1 Database Setup Script
# Run this script after Cloudflare authentication is configured

echo "Setting up Cloudflare D1 databases..."

# Create development database
echo "Creating development database..."
npx wrangler d1 create sporetag-db

# Create production database
echo "Creating production database..."
npx wrangler d1 create sporetag-db-prod

# Create preview database
echo "Creating preview database..."
npx wrangler d1 create sporetag-db-preview

echo ""
echo "⚠️  IMPORTANT: Update wrangler.toml with the actual database IDs returned above"
echo ""
echo "To run migrations:"
echo "npx wrangler d1 execute sporetag-db --file=./migrations/0001_initial_schema.sql"
echo "npx wrangler d1 execute sporetag-db-prod --file=./migrations/0001_initial_schema.sql"
echo "npx wrangler d1 execute sporetag-db-preview --file=./migrations/0001_initial_schema.sql"
echo ""
echo "To test database connectivity:"
echo "npx wrangler d1 execute sporetag-db --command='SELECT name FROM sqlite_master WHERE type=\"table\"'"