# Exit Interview Prototype

## What this is
Standalone AI-powered exit interview UI connecting to a Retell voice agent.

## Live deployment
- **URL:** https://exit-interview.onrender.com
- **Host:** Render (free tier, auto-deploys from main branch)
- **GitHub:** https://github.com/amitmohod/exit-interview

## Structure
- `index.html` — complete frontend, all screens, served by Express
- `server.js` — Express backend, calls Retell API
- `.env` — API keys (never commit this)

## To run locally
```
npm install && npm start
```
Open http://localhost:3001

## To deploy changes
Push to `main` — Render auto-deploys.

## Key context
- Retell agent uses Conversation Flow (not Retell LLM)
- Dynamic variable: `employee_name` passed via `retell_llm_dynamic_variables`
- Frontend is served from Express (not opened as a file)
- Do not modify .env or commit API keys
