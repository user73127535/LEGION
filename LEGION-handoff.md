# LEGION — Project Handoff Document

## Purpose of This Document

This is a comprehensive technical breakdown of LEGION, a full-stack web application built collaboratively using Claude Code (Anthropic's AI-powered CLI development tool). It's intended to give complete context on what was built, how it was built, and the technical depth involved. The entire application — frontend, backend, database, design system, deployment configuration — was developed through iterative conversation with Claude Code over 57 commits spanning May-June 2026.

---

## What LEGION Is

LEGION is a League of Legends group statistics tracker. Unlike existing tools (op.gg, Porofessor, u.gg) that focus on individual player stats, LEGION exclusively tracks how groups of friends perform *together*. The core concept is "joint deployments" — matches where two or more members of your friend group were on the same team. Every stat, chart, and metric in the app is filtered through that lens.

The entire app is themed as a Cold War classified intelligence dossier. Players are "operators," friend groups are "cells," the dashboard is a "briefing," match history is an "operation log." The UI uses an aged-paper palette, typewriter fonts, classification stamps, and redacted text blocks. This isn't a skin — it's the entire information architecture and copy voice.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.2.4 |
| Build tool | Vite | 8.x |
| CSS framework | Tailwind CSS | 4.2 |
| Routing | React Router | 7.14 |
| Backend framework | Express | 5.2 |
| Database | PostgreSQL via Supabase | — |
| Authentication | Supabase Auth (email/password) | — |
| External API | Riot Games API (official) | v5 |
| Deployment | Vercel (serverless functions) | — |
| Language | JavaScript (ES2022+, no TypeScript) | — |

---

## Codebase Scale

**Total: 8,158 lines of handwritten source code across 23 files, plus 57 git commits.**

### Frontend (client/src/) — 5,160 lines

| File | Lines | What it does |
|---|---|---|
| `pages/Briefing.jsx` | 1,365 | Main dashboard — 8 distinct statistical sections |
| `pages/OperationLog.jsx` | 522 | Filterable joint match history |
| `pages/About.jsx` | 196 | Public info page with glossary and lore |
| `pages/Authenticate.jsx` | 195 | Sign-in / sign-up tabbed form |
| `pages/Intake.jsx` | 147 | Cell creation or join-by-invite-code flow |
| `pages/Landing.jsx` | 93 | Public marketing page |
| `components/Header.jsx` | 276 | Sticky nav with cell switcher dropdown and handler management |
| `components/AuthOverlay.jsx` | 180 | In-page auth modal for unauthenticated visitors |
| `components/ConfirmModal.jsx` | 54 | Double-confirmation modal for destructive actions |
| `components/ProtectedRoute.jsx` | 20 | Auth guard wrapper component |
| `components/Footer.jsx` | 14 | Classified document footer |
| `hooks/useAuth.jsx` | 187 | Auth context provider — session, cells, Riot ID linking |
| `lib/api.js` | 76 | Authenticated fetch wrapper (JWT Bearer tokens) |
| `lib/mockData.js` | 358 | Complete fake dataset for offline development |
| `lib/supabase.js` | 6 | Supabase client initialization |
| `index.css` | 2,466 | Full design system — tokens, custom properties, utilities |

### Backend (server/) — 1,832 lines

| File | Lines | What it does |
|---|---|---|
| `services/stats.js` | 868 | Group-level statistics engine (8+ algorithms) |
| `routes/cells.js` | 608 | 9 REST endpoints for cell management and match ingest |
| `services/riot.js` | 165 | Rate-limited Riot API client with caching |
| `routes/operators.js` | 122 | Riot ID validation, linking, and lookup |
| `index.js` | 57 | Express server entry, CORS, route mounting |
| `db/supabase.js` | 12 | Supabase client (service role key) |

### Database — 171 lines

| File | Lines | What it does |
|---|---|---|
| `supabase_schema.sql` | 171 | 4 tables, 9 RLS policies, GIN index, helper function |

---

## Features Built (End-to-End)

### 1. Authentication System

Full email/password auth flow using Supabase Auth:

- **Sign-up ("Enlistment"):** Email + password + Riot Game Name + Tag Line. Before account creation, the Riot ID is validated against the live Riot API to confirm the account exists and retrieve its permanent unique identifier (PUUID). On signup, the Riot account is automatically linked to the user's database record.
- **Sign-in ("Authentication"):** Email + password. On login, auto-links Riot ID if not already linked (idempotent upsert). Routes to the dashboard if the user has cells, or to the intake page if they don't.
- **Session management:** JWT stored via Supabase session. All authenticated API calls attach a Bearer token. Session re-validates on browser tab visibility change (handles wake-from-sleep scenarios). Logout clears session state and local storage.
- **Protected routes:** `ProtectedRoute` component wraps all authenticated pages. `AuthOverlay` provides an in-page modal alternative so unauthenticated users can see redacted page structure before signing in.

### 2. Cell (Group) Management

- **Create a cell:** User names their group. System generates an invite code in `LGN-XXXX-XXXX` format (cryptographically random). Creator is automatically designated as the "handler" (admin).
- **Join by invite code:** Other users enter the code on the intake page. System validates the code, checks capacity (max 10 members), and adds them.
- **Cell switcher:** Dropdown in the site header lists all of a user's cells. Switching cells reloads dashboard data. Shows handler badge next to the cell creator. Persists active cell selection in localStorage.
- **Handler controls:** Only the handler can remove operators (with a confirmation modal) or dissolve the cell entirely (requires typing the cell name to confirm). These controls appear directly in the header dropdown.
- **Empty states:** Users with no cells see redacted UI — the cell switcher shows a black bar instead of a name, dashboard content is replaced with a prompt to create or join a cell.

### 3. Riot API Integration

Real integration with Riot Games' official API, not mock data:

- **Account lookup:** Resolves a Riot ID (GameName#TagLine) to a PUUID (permanent unique ID that survives name changes). Uses the Account v1 API.
- **Match history fetch:** Pulls up to 40 recent matches per cell member using the Match v5 API. Filters to current ranked season (starts January 10 each year).
- **Rate limiting:** Custom token-bucket implementation respecting Riot's official limits (20 requests/second, 100 requests/2 minutes). Requests queue in a FIFO buffer and drain as tokens refill. Auto-retries on 429 responses using the `Retry-After` header.
- **Caching:** Two layers. In-memory cache with 5-minute TTL prevents redundant API calls during a session. Database-level cache stores full match payloads permanently — once a match is fetched from Riot, it's never fetched again.
- **Resume-able sync:** The ingest endpoint can be called repeatedly. It skips matches already in the database and only fetches new ones.
- **PUUID-based architecture:** All internal lookups use PUUIDs, not display names. This means the entire system is immune to players changing their Riot IDs.

### 4. Statistics Engine (868 lines)

The `computeCellStats()` function takes raw match data and cell member PUUIDs and produces a full statistical breakdown. Key algorithms:

- **Joint deployment detection:** A match counts as "joint" only if 2+ cell members were on the *same team*. Opposing-team members don't count. Uses `getSameTeamCellGroup()` to find the largest same-team group per match.
- **Win rate computation:** Joint win rate (when playing together), solo win rate (when only one member is in the match), and "WR without you" (how the cell performs when a specific member is absent). Delta badges show whether your presence helps or hurts.
- **Per-operator breakdown:** Games played, win rate, champion pool, most-played champions, last active timestamp, recent form (last 10 results as W/L sequence).
- **Duo matrix:** N x N grid of every possible pair's win rate and game count. PUUID-keyed so it survives name changes. Color-coded tiles (red < 48%, amber 48-54%, green 54-62%, bright green >= 62%).
- **Game mode breakdown:** Win rate per queue type (Ranked Solo, Ranked Flex, Normal, ARAM, Arena, rotating modes). 5-tier color scale based on performance thresholds.
- **Activity heatmap:** 7-day x 24-hour grid showing when cell members are most active. Returns UTC data; frontend applies timezone offset.
- **Champion pool classification:** Analyzes each operator's pick distribution and assigns a class: ONE-TRICK (one champion dominates), SPECIALIST (2-3 champions), NARROW (limited pool), ROLE-LOCKED (single role), CHAOTIC (plays everything), INCONCLUSIVE (insufficient data).
- **Champion synergies:** Top 10 champion combinations by frequency, with win rate and delta vs. overall.
- **Bond classification:** Categorizes each duo relationship as UNLINKED, EMERGING, CORE, STABLE, VOLATILE, or STRAINED based on game count and win rate trends.
- **Tilt Index:** Composite metric (0-10 scale) tracking post-loss performance decay — how much worse the cell plays after a loss.

### 5. Briefing Dashboard (1,365 lines)

The main dashboard renders 8 distinct sections, each with its own data visualization:

1. **Cell Members Summary:** Joint win rate with delta badge, WR without you, deployment count (30 days), recent form (10 W/L boxes). Full operator roster table sorted by win rate.

2. **Game Mode Breakdown:** Horizontal bar chart per mode. 5-tier color scale — deep green (>= 62%), medium green (> 50%), gray (= 50%), medium red (>= 40%), deep red (< 40%). Win rate text color matches the bar.

3. **Duo Win Rates Matrix:** N x N grid showing every pair's joint win rate. Color-coded tiles. Diagonal cells grayed out. PUUID-based lookups.

4. **Activity Heatmap:** 7-day x 24-hour grid. 5 intensity levels (h-0 through h-5) using a slate color scale. UTC-to-local timezone conversion. Monday-first week layout.

5. **Champion Pools:** Per-operator row showing top 5 champions as a segmented bar. Pick percentage determines shade intensity (s-1 through s-5). Classification badge. Theater-organized breakdown (Summoner's Rift vs. ARAM vs. Arena). Tooltips on bar segments.

6. **Tilt Index:** 10-segment threat level bar. Red above 7, amber at or below 7. Behavioral assessment text. Confidence stamp.

7. **Link Analysis:** SVG network graph. Active operators (5+ games in 7 days) positioned on a circle. Inactive operators on an outer ring. Edges between all pairs, colored by win rate (5-tier scale), thickness scaled by game count. Bond classification labels. Crosshair node markers.

8. **Analyst Observations (Field Assessments):** 6 cards in a 2-column grid. Each has a severity stripe (green/red/amber/blue/black), observation code (OBS-01 through OBS-06), title, subject line, and analyst-voice prose. 2 of the 6 are randomly redacted with black bars on each page load (1-3 redacted observations per refresh, varying dynamically).

All sections use `useMemo()` for expensive computations and conditional rendering for loading/empty states.

### 6. Operation Log (522 lines)

Full match history page with live filtering:

- **Filters:** Theater (game mode — single-select), Outcome (Win/Loss — single-select), Operators (multi-toggle chips — which cell members must be in the match).
- **Scope control:** "Full Dossier" shows all joint matches; toggling specific operators filters to matches containing exactly those players.
- **Grouping:** Matches grouped by date with day headers showing deployment count. Headers hide when no matches pass the current filter.
- **Match cards:** Color-tinted (green for wins, red for losses). Show result tag, game mode pill, duration, timestamp. Per-operator table with champion, KDA, damage dealt, and gold earned.
- **Summary strip:** Joint win rate, total wins (green), total losses (red), average duration — all update dynamically with filters.
- **Footer:** "SHOWING N OF [total]" count updates in real-time.

### 7. Design System (2,466 lines CSS)

A complete custom design system, not just Tailwind defaults:

- **Color palette:** 30+ CSS custom properties. Aged-paper base (warm tans and creams), semantic data colors (green/red/amber/blue for stats only), neutral slate scale for heatmaps.
- **Typography:** Three font families — Space Grotesk (headers/nav), Courier Prime (stat numbers/body — typewriter feel), IBM Plex Mono (data tables — clinical monospace).
- **Redaction system:** Three redaction styles — `.redacted-inline` (inline black rectangles), `.redacted-bar` (block-level black bars), `.redacted` (table cell black boxes). On dark backgrounds, redaction blocks use cream fill instead of black.
- **Win-rate color scale:** Utility classes (`.wr-great`, `.wr-high`, `.wr-mid`, `.wr-low`, `.wr-crit`) that apply consistent green-to-red coloring across all stat displays.
- **Grid background:** Subtle 48px repeating grid pattern applied to all pages via `bg-grid-page`.
- **Loading animations:** Scanner sweep + flicker effect for loading states (not standard shimmer — custom animation matching the surveillance theme).
- **Reveal animations:** Declassification animations on page load — content "reveals" as if being declassified.
- **Badge system:** Severity-coded badges for classifications, statuses, and tags.

### 8. Database Design

4 PostgreSQL tables with 9 Row-Level Security policies:

- **operators:** 1-to-1 with auth.users. Stores PUUID, Riot ID, verification status. RLS: users can only access their own row.
- **cells:** Group metadata. Stores name, invite code, handler (creator). RLS: only members can read; any authenticated user can create.
- **cell_members:** Many-to-many join table with unique constraint preventing duplicates. RLS: members can see other members of their cells.
- **matches:** Cache of Riot API payloads. GIN index on `participants_puuids` array column for fast overlap queries (finding which cached matches contain cell members). RLS: any authenticated user can read (game data is public).
- **Helper function:** `is_member_of_cell()` — SECURITY DEFINER function that avoids RLS recursion when checking membership.

### 9. Deployment Configuration

Vercel-ready with serverless function support:

- `vercel.json` configures build commands, SPA rewrites, and API function routing.
- `api/[...path].js` catch-all imports the Express app as a serverless function.
- Client builds to static files; server runs as serverless functions.
- Environment variables split between client (VITE_ prefix, public) and server (private, service role key).

---

## How Claude Code Was Used

This entire application was built through iterative conversation with Claude Code. The workflow:

1. **Architecture and planning:** Discussed the concept, data model, API design, and page structure. Produced a comprehensive CLAUDE.md (project intelligence brief) that serves as the single source of truth — 600+ lines covering terminology, tech stack, design system, data model, auth flow, page specs, API endpoints, and development rules.

2. **Static mockups first:** Built complete HTML/CSS reference designs for every page before writing any React. These mockups (in `mockups/`) established the visual language and served as pixel-reference during implementation.

3. **Vertical slices:** Built one feature end-to-end (database table -> API endpoint -> frontend component) before moving to the next. Not horizontal scaffolding.

4. **Iterative refinement:** 57 commits show the progression from initial scaffold through feature completion, bug fixes, security audits, and UX polish. Commits include things like:
   - Fixing RLS infinite recursion issues
   - Debugging JWT forwarding to Supabase
   - Switching from `fetch()` to Node `https` module because fetch was failing on Vercel's serverless runtime
   - Implementing PUUID-based lookups after realizing name-based lookups would break when players change their Riot IDs
   - Adding double-confirmation modals for destructive operations after recognizing the need for safety rails
   - Security audits that removed dead code and tightened access controls

5. **Real debugging:** The git history shows real problem-solving — not just generating code, but diagnosing production issues (502 errors on Vercel, RLS policy conflicts, rate limiter edge cases) and fixing root causes.

---

## Technical Decisions Worth Highlighting

- **PUUID over display names:** Riot allows players to change their name. Building the entire data layer on PUUIDs (permanent IDs) means the app never breaks when someone renames. This was a deliberate architectural decision that affected the database schema, stats engine, and frontend rendering.

- **On-read computation vs. pre-aggregation:** Stats are computed fresh from raw match data on every dashboard load, not pre-aggregated into summary tables. This means zero maintenance of materialized views and instant correctness when new matches are synced. Tradeoff: slightly more compute per request, but with <100 matches per cell it's negligible.

- **Token-bucket rate limiter:** Riot's API has strict rate limits. Rather than using a simple delay-between-requests approach, the app implements a proper dual-bucket token system (20/sec + 100/2min) with a FIFO queue. This maximizes throughput while staying within limits.

- **Same-team filtering:** The "joint deployment" concept required careful implementation. If two cell members are in the same match but on *opposite* teams, that doesn't count. The stats engine specifically groups by team ID and only counts same-team co-occurrences.

- **Service role key isolation:** The server uses Supabase's service role key (bypasses RLS) for all writes, while the client uses the anon key (subject to RLS). This separation means the server can write to any table but the client can only read what RLS allows.

- **Mock data system:** A complete fake dataset (358 lines) with 5 operators, 87 joint games, and full briefing stats allows offline development without Riot API access. The auth hook detects dev mode and falls back to mocks.

---

## Development Timeline

57 commits total from May 18 to June 5, 2026.

| Period | What happened |
|---|---|
| May 18 | Initial commit — full-stack scaffold (React + Express + Supabase schema) |
| May 18-20 | Deployment debugging — Vercel config, RLS fixes, JWT forwarding, service role key setup |
| May 20-25 | Core features — match ingest, stats engine, Operation Log, declassification animations |
| May 25-31 | Dashboard buildout — all 8 Briefing sections, Link Analysis SVG graph, champion pools |
| Jun 1-5 | Polish and hardening — security audit, PUUID migration, handler management UI, UX refinements |

### Commit Highlights (selected from 57)

```
f020aab  Vary redacted analyst observations between 1-3 per refresh
25fd77b  Use PUUID-based lookup for duo matrix (name-change-proof)
7ca383a  Show handler designation to all cell members in dropdown
86fbd67  Dynamic win-rate coloring on Operation Log summary strip
fa432ac  Sort operators by win rate (highest first) across all listings
91119bf  Add handler management: operator removal + double-confirmation UI
560129e  Validate Riot ID before signup and surface linking errors
debf6c2  Add complete-graph edges and bond classification to Link Analysis
038f2d1  Redesign Link Analysis: crosshair markers, 5-tier color scale
9d01903  Fix medium audit findings: security, stability, dead code cleanup
7ca8953  Fix critical audit findings: security, correctness, accessibility
53ebe34  Fix same-team bug in joint match filtering and align WR Without You
e88e5c4  Add declassification reveal animations across all pages
546facc  Use Node https module for Riot API lookup (fetch fails on Vercel)
789706a  Fix user JWT not being forwarded to Supabase (root cause of all RLS failures)
d59ef32  Fix RLS infinite recursion and add user-scoped Supabase clients
219c7f5  Initial commit: LEGION v1 — full-stack League of Legends group stats app
```

---

## API Endpoints

All routes under `/api`. All except `/api/health` require a valid JWT in the `Authorization: Bearer` header.

| Method | Path | What It Does |
|---|---|---|
| GET | `/api/health` | Returns operational status (public) |
| GET | `/api/cells` | List user's cells with member counts |
| POST | `/api/cells` | Create new cell (creator auto-added as handler) |
| GET | `/api/cells/:id` | Cell details + member roster with Riot IDs and PUUIDs |
| POST | `/api/cells/join-by-code` | Join a cell via invite code |
| DELETE | `/api/cells/:id/members/:userId` | Handler removes an operator |
| DELETE | `/api/cells/:id` | Handler dissolves entire cell |
| POST | `/api/cells/:id/ingest` | Pull match data from Riot API, cache in DB |
| GET | `/api/cells/:id/stats` | Compute and return group-level stats |
| GET | `/api/cells/:id/operations` | Joint match history for Operation Log |
| POST | `/api/operators/link` | Link Riot account to current user |
| POST | `/api/operators/validate-riot-id` | Validate a Riot ID exists (pre-signup, public) |
| GET | `/api/operators/:puuid` | Get operator details by PUUID |

---

## Frontend Routes

| Route | Page | Auth? | Description |
|---|---|---|---|
| `/` | Landing | No | Public marketing page with hero, stats strip, feature cards |
| `/about` | About | No | Intake procedure, glossary, ZOO lore |
| `/authenticate` | Authenticate | No | Sign-in / New Operator tabs |
| `/intake` | Intake | Yes | Create or join a cell |
| `/briefing` | Briefing | Yes | Full cell dashboard with all 8 stat sections |
| `/oplog` | OperationLog | Yes | Joint match history with filters |

---

## What This Demonstrates

- **Full-stack development:** Frontend (React 19, state management, data visualization), backend (Express 5 REST API, third-party API integration, rate limiting), database (PostgreSQL schema design, RLS policies, GIN indexing), and deployment (Vercel serverless).
- **API integration with production constraints:** Working within Riot's rate limits, handling 429s, caching responses, building resume-able sync flows.
- **Complex data visualization:** Heatmaps, SVG network graphs, color-coded matrices, segmented bar charts — all built from scratch without charting libraries.
- **Design system creation:** 30+ CSS custom properties, 3-font typography scale, semantic color system, redaction component system, custom loading/reveal animations — a cohesive visual language applied across 6 pages.
- **Security practices:** Row-Level Security policies on every table, JWT verification middleware, service role key isolation, input validation, destructive action confirmation modals, security audit commits.
- **Product thinking:** The "joint deployment" concept required rethinking how match data is filtered and displayed. Every feature serves the group-stats thesis — solo data is explicitly excluded, not just deprioritized.
- **Collaborative AI development:** The entire project was built through conversation with Claude Code, demonstrating effective human-AI collaboration on a complex, multi-system application — from architecture planning through production debugging.
