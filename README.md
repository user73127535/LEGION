# LEGION

**Group intelligence for League of Legends.**

LEGION tracks how your friend group performs *together* — not as individuals. Every stat, chart, and metric is filtered to **joint deployments**: matches where two or more members of your group were on the same team. Solo games are out of scope. LEGION only cares about the games you play together.

The entire app is themed as a Cold War classified intelligence dossier — aged paper, typewriter fonts, classification stamps, redacted text blocks. Friend groups are **cells**, players are **operators**, the dashboard is a **briefing**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7 |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email + password) |
| External API | Riot Games API v5 |
| Deployment | Vercel (static frontend + serverless API) |

## Features

- **Cell management** — Create a named group, invite friends via `LGN-XXXX-XXXX` codes, manage members
- **Riot API integration** — Rate-limited (token bucket), cached, resume-able match sync
- **Briefing dashboard** — Eight stat sections:
  - Cell member summary with joint win rate and delta badges
  - Game mode breakdown with 5-tier color scale
  - N x N duo win rate matrix
  - 7-day x 24-hour activity heatmap
  - Champion pool classification (ONE-TRICK, SPECIALIST, CHAOTIC, etc.)
  - Tilt Index behavioral threat assessment
  - Link Analysis SVG network graph with bond classification
  - Analyst observation cards with randomized redactions
- **Operation Log** — Filterable joint match history grouped by day
- **Handler role** — Group admin can remove members, dissolve cells, regenerate invite codes
- **Auth system** — Registration with Riot ID validation, JWT-protected routes, session recovery

## Project Structure

```
LEGION/
├── client/                 React frontend (Vite)
│   └── src/
│       ├── pages/          6 page components (Briefing is ~1,350 lines)
│       ├── components/     Reusable UI (Header, AuthOverlay, ConfirmModal, etc.)
│       ├── hooks/          Auth context + session management
│       └── lib/            Supabase client, API wrapper, mock data
│
├── server/                 Express backend
│   ├── routes/             REST endpoints (cells, operators)
│   └── services/           Riot API client (rate limiter + cache), stats engine
│
├── mockups/                Static HTML/CSS reference designs
├── supabase_schema.sql     Database schema (4 tables, 9 RLS policies, GIN index)
├── CLAUDE.md               Project spec and development guide
└── vercel.json             Deployment configuration
```

## Local Development

```bash
# Backend
cd server
npm install
cp ../.env.example .env     # fill in your Supabase + Riot API keys
node index.js               # runs on http://localhost:3001

# Frontend (separate terminal)
cd client
npm install
cp .env.example .env        # fill in your Supabase public key
npm run dev                 # runs on http://localhost:5173, proxies /api to :3001
```

You'll need:
- A [Supabase](https://supabase.com) project with the schema from `supabase_schema.sql` applied
- A [Riot Games API key](https://developer.riotgames.com) (dev keys expire every 24 hours)

## Design System

The visual language is defined in `mockups/dossier.css` and implemented in `client/src/index.css`:

- **Palette:** Aged-paper backgrounds, near-black text, semantic data colors (green/red/amber/blue for stats only)
- **Typography:** Space Grotesk (headers), Courier Prime (stats — typewriter feel), IBM Plex Mono (data tables)
- **Redactions:** Three styles of decorative black bars for empty states and classified flavor
- **Animations:** Declassification reveal on page load, scanner sweep loading states

## Key Terminology

| Normal | LEGION |
|---|---|
| Friend group | Cell |
| Player | Operator |
| Group admin | Handler |
| Dashboard | Briefing |
| Match history | Operation Log |
| Register | Enlist |
| Login | Authenticate |
| Match with 2+ members on same team | Joint Deployment |

## Built With

This project was built collaboratively using [Claude Code](https://claude.ai/code) (Anthropic's AI development tool) over 58 commits. The full project spec that guided development is in [`CLAUDE.md`](CLAUDE.md).
