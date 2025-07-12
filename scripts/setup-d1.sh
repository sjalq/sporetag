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
echo "✅ Database creation complete!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. 🗂️  Configure database bindings:"
echo "   For Pages: Dashboard → Pages → Project → Settings → Functions"
echo "   For Workers: Update wrangler.toml with the database IDs shown above"
echo ""
echo "2. 🔄 Run migrations:"
echo "   npx wrangler d1 execute sporetag-db --file=./migrations/0001_initial_schema.sql"
echo "   npx wrangler d1 execute sporetag-db-prod --file=./migrations/0001_initial_schema.sql"
echo "   npx wrangler d1 execute sporetag-db-preview --file=./migrations/0001_initial_schema.sql"
echo ""
echo "3. 🧪 Test connectivity:"
echo "   ./test-db-connection.js"
echo ""
echo "📖 See DATABASE.md for detailed setup instructions"