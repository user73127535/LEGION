# LEGION — Project Summary

**Prepared for:** External context handoff (Claude Chat)
**Last updated:** 2026-04-19

---

## What is LEGION?

LEGION is a web application that surfaces League of Legends statistics specifically
for *groups* of players who play together. Unlike op.gg or Porofessor — which track
individuals — LEGION focuses exclusively on group dynamics: win rates, champion
synergies, and behavioral patterns that only emerge when two or more players from
the same group are in the same game.

The entire UI uses a Cold War classified-dossier aesthetic: monospaced typewriter
fonts, aged-paper background, clinical copy tone, no rounded corners, no color
except near-black and tan. The vocabulary is intentionally thematic — see the
Terminology section below.

**Target users:** Friend groups (2–5 players) who play League of Legends regularly
and want insight into how they perform *together*, not just individually.

---

## Terminology

These terms are used everywhere — in the UI, copy, and codebase. Use them when
discussing this project.

| Plain term | LEGION term |
|---|---|
| Friend group | **CELL** |
| Group member / user | **OPERATOR** |
| Register / sign up | **ENLIST** |
| Log in | **AUTHENTICATE** |
| Dashboard | **BRIEFING** |
| Statistics page | **FIELD REPORT** |
| Match history | **OPERATION LOG** |
| Profile page | **DOSSIER** |
| Settings | **DIRECTIVES** |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Routing | React Router 7 |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email + password) |
| League data | Riot Games API (official) |
| Deployment (planned) | Vercel (frontend) + Supabase (backend/db) |

All DB and auth calls go through the Supabase JS SDK. Raw SQL is avoided. All async
code uses async/await, never .then() chains.

---

## Data Model

### `operators` table
Stores one row per registered user, linked to their League of Legends account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `auth.users`, unique, cascade delete |
| `puuid` | text | Riot's permanent unique player ID (never changes even if name changes) |
| `riot_game_name` | text | e.g. "Doublelift" |
| `riot_tag_line` | text | e.g. "NA1" (the part after #) |
| `is_verified` | boolean | True once Riot API confirms the account exists |
| `created_at` | timestamptz | |

### `cells` table
A named friend group. One cell has many members.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | The group's chosen name |
| `created_by` | UUID | FK → `auth.users` |
| `created_at` | timestamptz | |

### `cell_members` table
Junction table connecting operators to cells (many-to-many).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `cell_id` | UUID | FK → `cells`, cascade delete |
| `user_id` | UUID | FK → `auth.users`, cascade delete |
| `joined_at` | timestamptz | |

Unique constraint on `(cell_id, user_id)` — a user can't join the same cell twice.

### `matches` table
Cache for Riot API match data. Stored after first fetch so the API is never called
twice for the same match.

| Column | Type | Notes |
|---|---|---|
| `match_id` | text | Primary key (e.g. "NA1_1234567890") |
| `match_data` | jsonb | Full raw Riot API match payload |
| `participants_puuids` | text[] | Array of PUUIDs in the match (for fast lookup) |
| `fetched_at` | timestamptz | |

A GIN index on `participants_puuids` enables fast queries like "find all matches
where these PUUIDs participated."

### Row-Level Security (RLS)
- Operators: users can only read/write their own row
- Cells: users can only see cells they are members of
- Cell members: visible only to members of that cell
- Matches: readable by any authenticated user (public game data)
- Server uses the Supabase service role key to bypass RLS for writes

---

## Auth & Registration Flow

Registration and login are handled entirely by Supabase Auth (email + password).
There is no OAuth or social login.

### Enlistment (registration)
1. User fills out: email, password, Riot Game Name, Riot Tag Line
2. Client calls `supabase.auth.signUp()` with Riot ID stored in user metadata
3. Supabase sends a confirmation email
4. User is shown: "IDENTITY LOGGED. Confirmation directive transmitted to your
   communication channel. Verify to activate field clearance."
5. After email confirmation, the user can log in

### Authentication (login)
1. User enters email + password
2. Client calls `supabase.auth.signInWithPassword()`
3. On success, redirected to `/briefing` (the dashboard)

### Riot ID Linking
A separate server endpoint (`POST /api/operators/link`) handles linking a Riot
account to an authenticated user:
1. Receives `riotGameName` and `riotTagLine`
2. Calls Riot API to confirm the account exists and fetch the PUUID
3. Upserts the `operators` row with `is_verified: true`

### Auth middleware (server)
Every protected API route uses `requireAuth()` which:
1. Reads the `Authorization: Bearer <token>` header
2. Calls `supabase.auth.getUser(token)` to verify the JWT
3. Attaches `req.user` to the request
4. Returns 401 if missing or invalid

---

## Frontend Pages & Routes

| Route | Page | Auth required? |
|---|---|---|
| `/` | Landing page | No |
| `/enlist` | Registration (Enlist) | No |
| `/authenticate` | Login | No |
| `/briefing` | Dashboard — list of user's CELLs | Yes |
| `/cells/:cellId` | Field Report — detailed stats for one CELL | Yes |
| `/cells/:cellId/operations` | Operation Log — joint match history | Yes |

Protected routes redirect to `/authenticate` if no session is found.

---

## Backend API Endpoints

All routes are prefixed `/api`. All except `/api/health` require a valid JWT.

### Cells
| Method | Path | What it does |
|---|---|---|
| GET | `/api/cells` | List all CELLs the current user belongs to (with member counts) |
| POST | `/api/cells` | Create a new CELL (creator is auto-added as first member) |
| GET | `/api/cells/:id` | Get CELL details including all members' Riot IDs and PUUIDs |
| POST | `/api/cells/:id/join` | Add current user to an existing CELL |
| GET | `/api/cells/:id/stats` | Compute and return group-level League stats (see below) |
| GET | `/api/cells/:id/operations` | Fetch joint match history (games where 2+ members played together) |

### Operators
| Method | Path | What it does |
|---|---|---|
| POST | `/api/operators/link` | Link/update a Riot account for the current user |
| GET | `/api/operators/:puuid` | Get an operator's dossier by PUUID |

### Health
| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Returns `{ status: 'OPERATIONAL', classification: 'UNCLASSIFIED' }` |

---

## Riot API Integration

The server calls three Riot API endpoints:

1. **Account lookup by Riot ID**
   `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`
   Returns the PUUID and confirms the account exists.

2. **Recent match IDs by PUUID**
   `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?count=20`
   Returns a list of recent match IDs for a player.

3. **Full match data**
   `GET /lol/match/v5/matches/{matchId}`
   Returns the complete match payload (all participants, results, champions, etc.)

**Rate limits:** 20 req/sec, 100 req/2min on a dev API key. The server uses an
in-memory cache with a 5-minute TTL and handles 429 responses by reading the
`Retry-After` header. Match data is also persisted in the `matches` table so it
is never re-fetched.

**Key technical note:** Riot IDs (GameName + TagLine) can change. PUUIDs never do.
The database stores PUUIDs as the permanent identifier.

---

## Stats Engine

The `computeCellStats(matches, cellPuuids)` function takes an array of full match
objects and the PUUIDs of CELL members, then returns:

- **`total_games`** — Total matches in the dataset
- **`games_together`** — Matches where 2+ CELL members were on the same team
- **`games_apart`** — Matches where only 1 CELL member played
- **`win_rate_together`** — Win rate in joint matches (null if no data)
- **`win_rate_apart`** — Win rate in solo matches (null if no data)
- **`champion_synergies`** — Top 10 champion combos by frequency, each with:
  - Which operators played
  - Which champions they used
  - Games played, wins, win rate
  - Delta vs. overall win rate together
- **`game_mode_breakdown`** — Per game mode (ARAM, RANKED_SOLO_5x5, etc.):
  games played and win rate

---

## V1 Feature Scope

Only these features are in scope for V1:

1. **Enlistment** — User registration with Riot ID linkage
2. **CELL creation** — Create a named group, invite others by username
3. **Briefing (Dashboard)** — Overview of CELL's recent activity
4. **Field Report** — Core stats: win rate together vs. apart, top champion
   synergies, best/worst matchups as a group, win rate by game mode
5. **Operation Log** — Shared match history filtered to games where 2+ CELL
   members played together

**Not in V1:** Cross-CELL leaderboards, social feed, direct messaging,
public CELL profiles.

---

## Current Status

- Full V1 scaffold is complete: React+Vite+Tailwind frontend, Express backend,
  all pages, Riot API service, stats engine, Supabase schema
- Supabase project exists at `https://kulnpqrnyjxzdegzcivf.supabase.co`
- Waiting on: `.env` files to be populated, Supabase schema to be applied,
  and a valid Riot API key to be added before the app can run end-to-end

---

## Design System (brief)

- **Background:** `#f5f0e8` (warm aged paper)
- **Surface / cards:** `#ede8df`
- **Borders:** `#c8c3b8` (tan, 1px, sharp — no rounded corners)
- **Text:** `#1a1a1a` (near black)
- **Muted text:** `#777777`
- **Fonts:** Courier Prime / Special Elite (headers), IBM Plex Mono (body)
- **No red anywhere.** Accent is black.
- **Copy tone:** Cold War intelligence analyst — dry, clinical, no exclamation
  points, uppercase labels, passive voice is fine.
