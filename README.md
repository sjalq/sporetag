# Spore-Tag MVP

A React + TypeScript + Vite application for spore-tagging on an interactive map, deployed to Cloudflare Pages.

## Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

4. **Configure GitHub Secrets** (for auto-deployment):
   - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Manual Deployment
```bash
# Build and deploy to Cloudflare Pages
npm run deploy
```

### Automatic Deployment
- Push to `main` or `master` branch triggers auto-deployment via GitHub Actions
- Requires GitHub secrets to be configured (see Setup section)

## Security

### Pre-commit Hooks
This project includes automated security checks that run before each commit:

- **Secret Scanning:** Automatically detects hardcoded credentials, API keys, passwords, and database connection strings
- **Code Linting:** Runs ESLint to ensure code quality and consistency
- **Automatic Blocking:** Commits containing sensitive data are automatically blocked

#### What's Checked:
- Database connection strings (PostgreSQL, MySQL, MongoDB)
- API keys and access tokens
- AWS credentials
- Password fields
- Private keys and certificates

#### Setup:
Pre-commit hooks are automatically installed when you run `npm install`. The hooks are configured via:
- `husky` for git hook management
- `lint-staged` for running checks on staged files
- Custom secret scanning script at `scripts/check-secrets.sh`

## Tech Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Mapping:** Leaflet.js with React-Leaflet
- **Deployment:** Cloudflare Pages
- **Database:** Cloudflare D1 (when implemented)
- **API:** Cloudflare Workers (when implemented)
- **Security:** Husky + Lint-staged for pre-commit hooks
