# Repository Guidelines

This repository hosts Nortix Mail — a lightweight Node.js SMTP/HTTP backend with a Svelte (Vite) frontend for disposable email addresses. Use this guide to make focused, consistent contributions.

## Project Structure & Module Organization
- Backend (Node, ES modules): `main.js`, `httpSrv.js`, `smtpSrv.js`, `smtpClient.js`, `database.js`, `config.js`, `domain.js`, `helper.js`
- Frontend (Svelte + Vite): `front/html/src` → built assets in `front/html/dist` (served by Express)
- Data & config: `data/` (e.g., `config.json`, `data.db`, TLS `.crt`/`.key`); gitignored
- Containerization: `Dockerfile`, `docker-compose.yaml`

## Build, Test, and Development Commands
- Install deps: `npm install && (cd front && npm install)`
- Dev mode: `npm run dev` (nodemon backend + Vite watch build)
- Build frontend: `npm --prefix ./front run build`
- Run server: `node main.js` (HTTP: `:80`, SMTP: `:25`)
- Docker: `docker compose up -d`

## Coding Style & Naming Conventions
- Language: JavaScript (ES modules, `type: module`)
- Indentation: use tabs; keep lines readable (<120 chars)
- Quotes/semicolons: prefer single quotes; keep semicolons consistent
- Naming: files and identifiers in camelCase (e.g., `smtpClient.js`, `getDomainName`)
- Do not commit generated assets (`front/html/dist/`) or secrets in `data/`

## Testing Guidelines
- No formal test suite at present. Verify changes by:
  - Running `npm run dev` and exercising UI flows (receive, send, forward, clear inbox)
  - Checking API endpoints in `httpSrv.js` with a REST client
- If adding tests, discuss first; prefer lightweight Node tests for backend and Vite-friendly tests for UI.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits where possible (e.g., `feat(inbox): clear inbox functionality`, `fix(smtpClient): STARTTLS handling`).
- PRs must include:
  - Clear description of changes and rationale; link issues
  - API changes listed (routes/payloads) and any DB migration notes
  - UI changes: include before/after screenshots
  - Local verification steps (commands used)

## Security & Configuration Tips
- Configure `data/config.json` (e.g., `MailCountPerPage`, `MailRefreshInterval`, `SMTPOutbound`).
- Place TLS cert/key files in `data/` to enable detection; never commit them.
- Ensure ports 25 (SMTP) and 80 (HTTP) are reachable; in Docker, `./data` is mounted for persistence.

