# LEGION — Project Intelligence Brief
**CLASSIFICATION: INTERNAL USE ONLY**
**DOCUMENT TYPE: DEVELOPMENT DIRECTIVE**
**LAST UPDATED: 2026-05-13**

---

## MISSION OVERVIEW

LEGION is a web application that surfaces League of Legends statistics specifically
for groups of players (called CELLs) who play together. Unlike op.gg or Porofessor
that track individuals, LEGION focuses exclusively on group dynamics — win rates,
champion synergies, and behavioral patterns that only emerge when 2+ players from
a CELL are in the same game.

The aesthetic and copy tone is Cold War classified dossier / CIA intelligence
briefing — minimalist, clinical, authoritative. Every UI element should feel
like it belongs in a redacted intelligence report. Less is more. Negative space
is intentional. Typography carries the weight.

Target users: Friend groups (2-5 players) who play League of Legends regularly
and want insight into how they perform *together*, not just individually.

---

## TERMINOLOGY (USE THESE EVERYWHERE — UI, COPY, VARIABLE NAMES)

| Concept | LEGION Term | Notes |
|---|---|---|
| Friend group | CELL | Up to 10 operators |
| Member of a group | OPERATOR | Linked to a Riot account via PUUID |
| Cell creator / admin | HANDLER | Can manage members, invite codes, dissolve cell |
| Register / sign up | ENLIST | — |
| Create or join a cell | OPEN NEW FILE | The intake process |
| Dashboard / stats page | BRIEFING | All stats live here — there is no separate "Field Report" page |
| Match history | OPERATION LOG | Filtered to joint deployments only |
| Profile page | DOSSIER | Per-operator |
| Login | AUTHENTICATE | — |
| Logout | DISENGAGE | — |
| Settings | DIRECTIVES | — |
| Match with 2+ cell members on the same team | JOINT DEPLOYMENT | Core concept — this is what LEGION tracks |
| Post-loss cohesion metric | TILT INDEX | Composite score, formula TBD |
| Analyst-written stat observations | FIELD ASSESSMENT | Templated, severity-coded cards |
| Parent agency (lore) | ZOO | See Lore section below |

---

## LORE: ZOO

ZOO is LEGION's fictional parent agency. It exists purely for thematic flavor
and is never explained in the UI.

**Rules:**
- ZOO is mentioned exactly **twice** across the entire site:
  1. About page hero lead paragraph (`LEGION operates under ZOO directive ████`)
  2. About page glossary entry (definition itself is redacted)
- Always partially or fully redacted when referenced
- Never defined, never explained — it's a deliberate mystery
- Do not add new ZOO references without explicit approval
- Users are *petitioners* voluntarily submitting their cell for surveillance,
  not LEGION or ZOO employees

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Routing | React Router 7 |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (email + password) |
| League Data | Riot Games API (official) |
| Deployment (planned) | Vercel (frontend) + Supabase (backend/db) |

**Dev conventions:**
- Always use Supabase client library for DB and auth calls
- Never write raw SQL unless explicitly asked
- Always use async/await, never .then() chains
- All API route handlers use `requireAuth()` middleware (JWT verification)

---

## DESIGN SYSTEM

### Palette (source of truth: `mockups/dossier.css`)

#### Base palette (aged paper / dossier)
```
--bg:            #f5f1e8      /* warm aged-paper background */
--bg-alt:        #efeae0      /* alternate background */
--surface:       #eae4d6      /* panel surfaces */
--surface-2:     #e3dcc9      /* secondary surfaces */
--surface-dark:  #161616      /* dark surfaces (header) */
--card:          #fbf8f0      /* card backgrounds */
--border:        #d4ccb8      /* tan borders */
--border-light:  #e5dfd0      /* lighter borders */
--text:          #1a1a1a      /* near-black text */
--text-inverse:  #f7f3e9      /* text on dark backgrounds */
--muted:         #6b6558      /* secondary text */
--muted-light:   #9a9388      /* tertiary text */
--ink:           #1a1a1a      /* black accent */
```

#### Semantic colors (used for data visualization, NOT as brand colors)
```
--green:         #15803d      /* positive / advantage / wins */
--green-mid:     #22c55e      /* medium green */
--green-bg:      #dcfce7      /* green tint (win cards) */
--green-dark:    #14532d      /* dark green */
--red:           #b91c1c      /* negative / concerning / losses */
--red-mid:       #ef4444      /* medium red */
--red-bg:        #fee2e2      /* red tint (loss cards) */
--red-dark:      #7f1d1d      /* dark red */
--amber:         #b45309      /* anomaly / monitor (tilt index) */
--amber-mid:     #f59e0b      /* medium amber */
--amber-bg:      #fef3c7      /* amber tint */
--blue:          #1d4ed8      /* neutral observation / info */
--blue-mid:      #3b82f6      /* medium blue */
--blue-bg:       #dbeafe      /* blue tint */
```

#### Neutral slate (no semantic meaning — heatmaps, monochrome scales)
```
--slate-1:       #d9d4c8
--slate-2:       #a8a194
--slate-3:       #6d665a
--slate-4:       #3f3a31
--slate-5:       #1a1a1a
```

> **Note:** Red, green, amber, and blue are semantic data colors only.
> The brand accent is black (`--ink`). Do not use semantic colors for
> non-data UI elements like buttons, links, or navigation.

### Typography (source of truth: `mockups/dossier.css`)
```
--font-display:  'Space Grotesk'     /* headers, nav, titles — modern sans-serif */
--font-stat:     'Courier Prime'     /* stat numbers, body text — typewriter dossier feel */
--font-mono:     'IBM Plex Mono'     /* data tables, descriptions — monospaced, clinical */
```

- **Display / Headers / Nav:** `Space Grotesk` — clean, modern, readable at size
- **Body text / Stat numbers:** `Courier Prime` — typewriter dossier feel
- **Data / Descriptions:** `IBM Plex Mono` — monospaced, clinical
- **Classification labels:** ALL CAPS, tracked wide, small size
- **DO NOT USE:** Inter, Roboto, or any generic sans-serif defaults

### UI Rules
- Minimalist first — every element must earn its place
- Border radius: `6px` (`--radius: 6px` in CSS)
- Thin borders (1px) using `--border` color
- Generous whitespace / negative space between sections
- Use uppercase sparingly but intentionally for labels and classifications
- Redacted bars (black inline rectangles) for decorative empty states — no "REDACTED" label inside (gov-doc convention)
- Elevation via subtle box shadows, not heavy borders
- Grid background pattern (`bg-grid-page`) on all pages — faint slate grid, fixed attachment

### Redaction Conventions
- `.redacted-inline` — black inline rectangle for in-text redactions
- `.redacted` — display:inline-block black box for tables
- `.redacted-bar` — block-level black bar for empty states
- On dark backgrounds (`.classification-bar`), redacted blocks use cream `#f7f3e9` fill
- Redactions appear in: footer refs, oversight IDs, classification eyebrows,
  ZOO citations, glossary ZOO entry, two of six analyst observations

### Copy Tone
Write all UI copy as if authored by a Cold War intelligence analyst.

**Voice rules:**
- Dry, clinical, authoritative — Frank IC analyst voice
- No exclamation points. Ever.
- Passive voice is acceptable and even preferred in places
- Numbers >= 10 use figures, numbers < 10 spell out (CIA style guide)
- Solo activity is "out of scope" — not a limitation, a feature
- Estimative language for assessments: `HIGH CONFIDENCE`, `MODERATE CONFIDENCE`,
  `LOW CONFIDENCE`, `ALMOST CERTAINLY`, `PROBABLY`, `LIKELY`, `UNLIKELY`

**Example translations:**
| Instead of | Write |
|---|---|
| "Welcome back!" | IDENTITY CONFIRMED. |
| "No data yet" | INSUFFICIENT FIELD DATA. OPERATIONS PENDING. |
| "Your group" | CELL DESIGNATION: [name] |
| "Stats loading..." | RETRIEVING CLASSIFIED FIELD REPORTS... |
| "Error: player not found" | INTAKE FAILED. RIOT ID NOT FOUND. |
| "Logged in successfully" | IDENTITY CONFIRMED. ROUTING TO CASE FILE. |
| "Group is full" | CASE FILE AT MAXIMUM CAPACITY. 10 OPERATORS ON FILE. |
| "Invalid invite code" | INVITE CODE INVALID OR EXPIRED. |

---

## DATA MODEL

### `operators` table
One row per registered user, linked to their League account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK -> `auth.users`, unique, cascade delete |
| `puuid` | text | Riot's permanent player ID (never changes even if name changes) |
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
| `created_by` | UUID | FK -> `auth.users` (this user is the HANDLER) |
| `created_at` | timestamptz | |

### `cell_members` table
Many-to-many membership.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `cell_id` | UUID | FK -> `cells`, cascade delete |
| `user_id` | UUID | FK -> `auth.users`, cascade delete |
| `joined_at` | timestamptz | |

Unique constraint on `(cell_id, user_id)`.

### `matches` table
Cache for Riot API match data — stored after first fetch, never re-fetched.

| Column | Type | Notes |
|---|---|---|
| `match_id` | text | Primary key (e.g. "NA1_1234567890") |
| `match_data` | jsonb | Full raw Riot API match payload |
| `participants_puuids` | text[] | Array of PUUIDs for fast overlap queries |
| `fetched_at` | timestamptz | |

GIN index on `participants_puuids` for fast array-overlap queries.

### Row-Level Security (RLS)
- **operators:** users can only read/write their own row
- **cells:** users can only see cells they are members of
- **cell_members:** visible only to members of that cell
- **matches:** readable by any authenticated user (public game data)
- Server uses Supabase service role key to bypass RLS for writes

---

## AUTH & REGISTRATION FLOW

### Enlistment (registration)
1. User fills out: email, password, Riot Game Name, Riot Tag Line
2. Client calls `supabase.auth.signUp()` with Riot ID in user metadata
3. Supabase sends confirmation email
4. User sees: "IDENTITY LOGGED. Confirmation directive transmitted to your
   communication channel. Verify to activate field clearance."
5. After email confirmation, user can authenticate

### Authentication (login)
1. User enters email + password on `/authenticate`
2. Client calls `supabase.auth.signInWithPassword()`
3. On success: redirect based on cell membership (see Login Routing below)

### Riot ID Linking
`POST /api/operators/link` handles linking a Riot account:
1. Receives `riotGameName` and `riotTagLine`
2. Calls Riot API to confirm account exists and fetch PUUID
3. Upserts `operators` row with `is_verified: true`

### Login Routing
After successful authentication:
- **Operator with cells** -> route to `/briefing` (last-viewed cell)
- **Operator with zero cells** -> route to empty-state Briefing or `/intake`

### Auth Middleware (server)
Every protected route uses `requireAuth()`:
1. Reads `Authorization: Bearer <token>` header
2. Calls `supabase.auth.getUser(token)` to verify JWT
3. Attaches `req.user` to the request
4. Returns 401 if missing or invalid

---

## FRONTEND PAGES & ROUTES

| Route | Page Component | Auth Required | Description |
|---|---|---|---|
| `/` | `Landing.jsx` | No | Public marketing page: hero, stats strip, feature cards |
| `/about` | `About.jsx` | No | Public info: intake procedure, glossary, ZOO lore |
| `/authenticate` | `Authenticate.jsx` | No | Sign-in / New Operator tabs |
| `/intake` | `Intake.jsx` | Yes | Cell creation (new case) or join (invite code) |
| `/briefing` | `Briefing.jsx` | Yes | Cell dashboard — ALL stats live here |
| `/oplog` | `OperationLog.jsx` | Yes | Joint match history with filters |
| `*` | — | — | Redirects to `/` |

> **Note:** There is no separate `/field-report` route. "Field Report" is a
> terminology concept — the Briefing page IS the stats page.

---

## SITE-WIDE CHROME

### Dark Site Header
Sticky to viewport top on all pages. Left-to-right:

1. **LEGION wordmark** — links to `/`
2. **Cell switcher** (`.cell-switcher`):
   - Logged in: active cell name + chevron. Dropdown lists other cells,
     "Open New File" and "Manage All Files" actions
   - Logged out: disabled state — redacted bar, no dropdown, `pointer-events: none`
3. **Nav links:** Briefing, Operation Log, About (active state for current page).
   When logged out, Briefing and OpLog route to authenticate first
4. **Right slot:**
   - Logged out: `Authenticate` CTA
   - Logged in: live sync ticker, user badge (e.g. `jimmmaaayyy #NA1`), `Disengage` button

### Sticky Page Header (Briefing + Operation Log only)
Sticky below the dark header. Shared structure:
- Eyebrow: `[PAGE NAME] — ACTIVE`
- H1: active cell name
- Meta line: `N operators // region NA // established DATE // case LGN-███ // last synced Xs ago`
- Briefing adds inline `+ Flag Operator` button

### Footer
Every page: `DOCUMENT REF: LGN-2026-X-███ // ORIGINATING OFFICE: LEGION/SUB //
CASE: [CELL NAME] // OVERSIGHT: ████ // DISTRIBUTION LIMITED // DECLASSIFY ON: TERM`

---

## PAGE FEATURES (DETAILED)

### Landing (`/`)
1. **Hero** — wordmark, tagline, sub-tagline, two CTAs:
   - Primary: `Open a New File` -> `/authenticate`
   - Secondary: `Already on file? Authenticate ->` -> `/authenticate`
2. **Stats strip** — four stat blocks:
   - `Matches Filed: 2.4M` (real data in production)
   - `Cells Under Surveillance: ████ [CLASSIFIED]` (always redacted — flavor)
   - `Operators on File: ████ [CLASSIFIED]` (always redacted — flavor)
   - `Solo Reports Filed: 0` (real data — always zero, reinforces group focus)
3. **Feature cards** — two REPORT cards:
   - `REPORT-01 - BRIEFING` — cell intelligence summary
   - `REPORT-02 - OPERATION LOG` — joint deployments, indexed
4. Footer

### About (`/about`)
1. **Hero** — doc-stamp + H1 `About LEGION` + lead paragraphs (includes ZOO mention #1)
2. **Intake Procedure** — four-step informational list
3. **Glossary of Field Terms** — nine entries including ZOO (redacted definition = ZOO mention #2)
4. **CTA section** — `Open New File` + `Return to Home` buttons
5. Footer

### Authenticate (`/authenticate`)
Single centered form card with tab toggle:
- **Sign In tab (default):** email + password, `Authenticate` button, forgot-password link
- **New Operator tab:** email + password + Riot Game Name + Tag, `Open Operator File` button
  - On success -> `/intake` for cell designation

### Intake (`/intake`)
Cell designation flow (account setup already happened on authenticate page).
- Classification banner: `CONFIDENTIAL // CELL INTAKE // HANDLE WITH CARE`
- H1: `Open a New File`
- Two radio options:
  - **Open a New Case:** reveals Cell Name field
  - **Join an Existing Case:** reveals Invite Code field (`LGN-XXXX-XXXX`, auto-uppercase)
- Submit: `Open New File`

### Briefing (`/briefing`)
Main dashboard — ALL stats live here. Sections top-to-bottom:

1. **Sticky page header** (see chrome section)
2. **Cell Members card:**
   - Summary strip: Joint WR (with delta badge), WR Without You, Deployments (30D), Recent Form (10 W/L boxes)
   - Operator table: `Operator | Status | Games (30D) | Win Rate | Cell WR Without —`
   - Viewing operator highlighted with `YOU` badge
3. **Game Mode Breakdown card:**
   - Horizontal bars per mode (Ranked, Ranked Flex, Normal, ARAM, ARAM Mayhem, Arena, then rotating modes)
   - 5-tier color scale: `>=62%` deep green, `>50%` medium green, `=50%` gray, `>=40%` medium red, `<40%` deep red
   - WR text color matches bar color
4. **Two-column row:**
   - **Duo Win Rates matrix** (left): NxN grid of pair WRs. Color-coded tiles:
     red-bg `<48%`, amber-bg `48-54%`, green-bg `54-62%`, bright green-bg `>=62%`
   - **Activity Heatmap** (right): 7-day x 24-hour grid. Slate scale `h-0` through `h-5`
5. **Champion Pools card:**
   - One row per active operator (alphabetical)
   - Class badge: `SPECIALIST`, `ONE-TRICK`, `NARROW`, `ROLE-LOCKED`, `CHAOTIC`, `INCONCLUSIVE`
   - Segmented bar showing pick distribution (monochrome scale `s-1` through `s-5`)
   - Terse bureaucratic profile observation note
6. **Behavioral Intelligence section:**
   - **Tilt Index** (left): threat level classification (e.g. `ELEVATED 7.2/10`),
     10-segment scale, 5 key judgments, confidence stamp. Formula TBD.
   - **Link Analysis** (right): SVG network graph of operators. Edge color = pair WR,
     edge weight = joint match count. Inactive operators shown as orbit nodes.
7. **Analyst Observations (Field Assessments):**
   - 6 cards in 2-column grid
   - Each: severity stripe (green/red/amber/blue/black), code (`OBS-NN`), title,
     subject line, analyst-voice note (1-3 sentences)
   - Two of six are heavily redacted (decorative)
   - Analyst signature footer below all cards

### Operation Log (`/oplog`)
Joint match history. Sections:

1. **Sticky page header** (matching Briefing)
2. **Summary strip** — Joint Win Rate, Total Wins, Total Losses, Avg. Duration
3. **Filter bar:**
   - **Theater** (single-select): All + every game mode
   - **Outcome** (single-select): All / Wins / Losses
   - **Operators** (multi-toggle): per-operator chips, all active by default
   - Reset button (enabled only when filters are dirty)
4. **Match list:**
   - Day-grouped: `[Date] — N deployments` headers
   - Each match: result tag (WIN/LOSS color-coded), mode pill, duration, time
   - Per-operator table: `Operator | Champion | KDA | Damage`
   - Viewing operator marked with `YOU` suffix
   - Card tinted: light green for wins, light red for losses
5. **Filter logic:**
   - Day headers hide when no matches visible under them
   - Per-day counts update dynamically
   - Footer: `SHOWING N OF [total]`

### Empty States (zero-cell user)
When authenticated but belonging to zero cells:
- Cell switcher shows redacted bar, dropdown shows "NO ACTIVE CASE FILES" + "Open a new file ->"
- Page header replaced with redacted equivalent
- Body shows centered empty-state card pointing to `/intake`

---

## BACKEND API ENDPOINTS

All routes prefixed `/api`. All except `/api/health` require a valid JWT.

### Cells
| Method | Path | Description |
|---|---|---|
| GET | `/api/cells` | List user's cells with member counts |
| POST | `/api/cells` | Create new cell (creator auto-added as handler) |
| GET | `/api/cells/:id` | Cell details + members with Riot IDs and PUUIDs |
| POST | `/api/cells/:id/join` | Add current user to cell (via invite code) |
| POST | `/api/cells/:id/ingest` | Pull match data from Riot API, cache in DB |
| GET | `/api/cells/:id/stats` | Compute and return group-level stats |
| GET | `/api/cells/:id/operations` | Joint match history (2+ members in same game) |

### Operators
| Method | Path | Description |
|---|---|---|
| POST | `/api/operators/link` | Link/update Riot account for current user |
| GET | `/api/operators/:puuid` | Get operator dossier by PUUID |

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Returns `{ status: 'OPERATIONAL', classification: 'UNCLASSIFIED' }` |

---

## RIOT API INTEGRATION

### Endpoints Used
1. **Account lookup:** `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`
2. **Match IDs:** `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?count=20`
3. **Match data:** `GET /lol/match/v5/matches/{matchId}`

### Rate Limiting
- Dev key limits: 20 req/sec, 100 req/2min
- Server implements token-bucket rate limiter
- In-memory cache with 5-minute TTL
- Auto-retry on 429 with `Retry-After` header
- Match data persisted to `matches` table — never re-fetched

### Key Technical Note
Riot IDs (GameName + TagLine) can change. PUUIDs never do. The database stores
PUUIDs as the permanent identifier. All lookups use PUUID after initial resolution.

---

## STATS ENGINE

`computeCellStats(matches, cellPuuids)` returns:

- **`total_games`** — total matches in dataset
- **`games_together`** — matches where 2+ cell members on same team
- **`games_apart`** — matches where only 1 cell member played
- **`win_rate_together`** — win rate in joint matches (null if no data)
- **`win_rate_apart`** — win rate in solo matches (null if no data)
- **`champion_synergies`** — top 10 champion combos by frequency, each with:
  operators, champions, games, wins, win rate, delta vs. overall
- **`game_mode_breakdown`** — per mode: games played and win rate

---

## V1 FEATURE SCOPE

Build only these features in V1. Do not add scope.

1. **Enlistment** — User registration with Riot ID linkage
2. **Cell creation + invite codes** — Create a named cell, generate invite codes
   (`LGN-XXXX-XXXX`), others join via code on the Intake page
3. **Handler role** — Cell creator has handler privileges (manage members,
   regenerate invite codes, dissolve cell)
4. **Briefing** — Full dashboard with ALL sections:
   - Cell Members (summary strip + operator table)
   - Game Mode Breakdown (horizontal bars, 5-tier color scale)
   - Duo Win Rates matrix (NxN pair grid)
   - Activity Heatmap (7-day x 24-hour)
   - Champion Pools (per-operator distribution bars + class badges)
   - Behavioral Intelligence (Tilt Index + Link Analysis graph)
   - Analyst Observations (6 field assessment cards)
5. **Operation Log** — Joint match history with theater/outcome/operator filters
6. **Cell switcher** — Header dropdown to switch between cells
7. **Empty states** — Redacted UI for zero-cell authenticated users

**NOT in V1 (future phases):**
- Cross-CELL competition / leaderboards
- Social feed / posts
- Direct messaging
- Public CELL profiles
- OAuth providers (Discord, Riot)

---

## OPEN QUESTIONS (to be resolved during build)

- **Invite code lifecycle:** Single-use vs reusable by default? Expiration period?
  Regeneration UI for handlers?
- **Empty-state visuals:** Described in HTML comments in mockup files but not
  visually mocked up. Need to design during build.
- **Handler UI surface:** Add/remove operator, promote to handler, dissolve cell.
  Likely lives on a Directives panel at `/cells/:id/directives` or similar.
- **Field Assessment templates:** Need 30-50 archetypes (cell-core synergy,
  incompatibility, temporal variance, etc.) with trigger conditions, slot specs,
  prose templates, and severity tags. To be authored during build.
- **Tilt Index formula:** Composite metric tracking post-loss cohesion decay.
  Concept is defined; exact computation is TBD.

---

## FILE STRUCTURE (CURRENT STATE)

```
LEGION/
├── CLAUDE.md                              <- THIS FILE (single source of truth)
├── archive-project-summary.md             <- architecture reference (archived)
├── archive-mockup-feature-reference.md    <- UI behavior spec (archived)
├── supabase_schema.sql                    <- database schema
├── .env.example                           <- server env template
├── .gitignore
│
├── mockups/                               <- STATIC HTML/CSS REFERENCE DESIGNS
│   ├── dossier.css                        <- shared design system (COLOR + TYPE source of truth)
│   ├── landing.html
│   ├── about.html
│   ├── authenticate.html                  <- sign-in + new operator tabs
│   ├── intake.html                        <- cell creation/join form
│   ├── briefing.html                      <- cell dashboard (full layout)
│   ├── match-history.html                 <- operation log (full layout)
│   ├── package.json                       <- `npm run dev` -> http-server :3333
│   └── OLD/                               <- early prototype iterations (reference only)
│
├── client/                                <- REACT FRONTEND (Vite)
│   ├── .env                               <- Supabase keys
│   ├── .env.example
│   ├── package.json                       <- React 19, Vite, Tailwind 4, React Router 7
│   ├── vite.config.js                     <- React plugin, Tailwind plugin, /api proxy
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg                      <- icon sprite
│   └── src/
│       ├── main.jsx                       <- app entry point
│       ├── App.jsx                        <- route definitions
│       ├── index.css                      <- Tailwind + LEGION design tokens
│       ├── lib/
│       │   ├── supabase.js                <- Supabase client init
│       │   └── api.js                     <- authenticated API wrapper
│       ├── hooks/
│       │   └── useAuth.jsx                <- auth context + sign-in/sign-up
│       ├── components/
│       │   ├── Header.jsx                 <- site nav + cell switcher
│       │   ├── Footer.jsx                 <- classified doc footer
│       │   ├── ProtectedRoute.jsx         <- auth guard (redirect to /authenticate)
│       │   ├── AuthOverlay.jsx            <- modal auth for locked pages
│       │   ├── StatCard.jsx
│       │   ├── SectionHeader.jsx
│       │   └── RedactedBlock.jsx          <- redaction UI component
│       ├── pages/
│       │   ├── Landing.jsx
│       │   ├── About.jsx
│       │   ├── Authenticate.jsx           <- sign-in / new operator tabs
│       │   ├── Intake.jsx                 <- cell creation or join
│       │   ├── Briefing.jsx               <- cell dashboard (scaffold)
│       │   └── OperationLog.jsx           <- joint match history (scaffold)
│       └── assets/
│           └── hero.png
│
└── server/                                <- EXPRESS BACKEND
    ├── .env                               <- Supabase + Riot API keys
    ├── package.json                       <- Express 5, Supabase, cors, dotenv, node-fetch
    ├── index.js                           <- server entry, CORS, route mounting
    ├── db/
    │   └── supabase.js                    <- Supabase client init (service role key)
    ├── routes/
    │   ├── cells.js                       <- GET/POST cells, ingest, stats, operations
    │   └── operators.js                   <- link Riot ID, get dossier
    └── services/
        ├── riot.js                        <- rate-limited Riot API calls + caching
        └── stats.js                       <- group-level stats computation
```

---

## GROUND RULES FOR DEVELOPMENT

1. **Ask before touching auth or DB schema** — confirm before modifying
   Supabase tables or auth configuration
2. **Never commit secrets** — API keys go in `.env` only, always in `.gitignore`
3. **Mobile-first** — all components must work on mobile before desktop polish
4. **One feature at a time** — complete and test each feature before starting the next
5. **Comment non-obvious logic** — especially Riot API or stat math
6. **Preserve the tone** — all user-facing strings must match the dossier copy style.
   When drafting new copy, ask: "Would a Cold War intelligence analyst write this?"
7. **Cache Riot API responses** — store match data in DB after first fetch,
   never re-fetch what you already have
8. **Mockups are the visual source of truth** — `mockups/` contains the reference
   designs. When in doubt about layout, spacing, or styling, consult the mockups.
   Run `npm run dev` in `mockups/` for http-server on port 3333.
9. **Build vertically, not horizontally** — complete one full slice end-to-end
   before starting the next. Don't scaffold broadly.
10. **Verify in browser** — every completed slice should work in `npm run dev`.
    If the browser doesn't show the expected behavior, it's not done.

---

## CURRENT STATUS

**Phase:** V1 scaffolded — frontend and backend structure in place, pages are scaffolds
**Supabase project:** `https://kulnpqrnyjxzdegzcivf.supabase.co`

**What exists:**
- Full frontend scaffold (all pages, components, routing, auth context)
- Full backend scaffold (all routes, services, DB schema file)
- Riot API integration (rate limiter, caching service)
- Stats engine (group-level calculations)
- Supabase schema SQL (tables, RLS policies)
- Static HTML/CSS mockups (complete visual reference for all pages)

**What's needed to go live:**
- `.env` files populated with real keys (Riot API key needed)
- Supabase schema applied to live database
- Frontend pages implemented to match mockups (currently scaffolds only)
- Invite code system (table + generation + validation)
- Handler management UI
- Field Assessment templates authored
- Tilt Index formula specified and implemented

---

## SESSION LOG

| Date | What was done |
|---|---|
| 2026-04-05 | Full V1 scaffold: React+Vite+Tailwind frontend, Express backend, all pages, Riot API service, stats engine, Supabase schema |
| 2026-05-13 | CLAUDE.md audit + consolidation: merged project-summary.md and mockup-feature-reference.md into single source of truth, fixed color palette, typography, terminology, routes, and feature scope to match actual mockups |
