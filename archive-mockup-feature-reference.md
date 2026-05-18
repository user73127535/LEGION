# LEGION — Mockup Feature Reference

**Purpose:** Companion to `legion-architecture-handoff.md`. Where the
architecture doc covers routing, schema, and auth flow, this doc covers
**what each visible feature in the mockups does** from a user-facing
perspective — so an engineer rebuilding the site in React + Supabase
+ Riot API knows what behavior they're wiring up.

**Mockup files this doc describes** (in `mockups/`):

| File | Page name | Auth required |
|---|---|---|
| `landing.html` | Landing | No |
| `about.html` | About | No |
| `authenticate.html` | Authenticate (sign-in + new operator) | No |
| `intake.html` | Open New File (cell designation) | Yes |
| `briefing.html` | Briefing | Yes (cell-scoped) |
| `match-history.html` | Operation Log | Yes (cell-scoped) |
| `dossier.css` | Shared design system | — |

---

## Site-wide chrome

### Dark site-header

Sticky to viewport top on all pages. Left-to-right contents:

1. **LEGION wordmark** — links to `landing.html`.
2. **Active CELL switcher** (`.cell-switcher`):
   - **Logged in:** Shows active cell name + chevron (e.g. `Zoo 2 ▾`).
     Click opens dropdown listing other cells the operator belongs to,
     followed by `Open New File` and `Manage All Files` actions.
   - **Logged out:** Renders in `.disabled` state — redacted bar in
     place of cell name, no dropdown, `pointer-events: none`. Title
     attribute: "Authenticate to access case files."
3. **Nav links:** `Briefing`, `Operation Log`, `About` (always present,
   active state indicates current page). On logged-out pages, the
   Briefing and Operation Log links would in production route the user
   to authenticate first.
4. **Right slot — auth state-dependent:**
   - **Logged out:** Single CTA `Authenticate` linking to
     `authenticate.html`. No other options.
   - **Logged in:** Live sync ticker (`LIVE · SYNC HH:MM:SS`),
     user-badge (e.g. `jimmmaaayyy #NA1`), and `Disengage` button.

### Site-wide grid background

Applied via `body.bg-grid-page` (defined in `dossier.css`). Faint slate
grid as a `background-attachment: fixed` body background. Subtle dossier
texture; does not interfere with sticky descendants. Applied to every
page.

### Sticky page-header bar (Briefing + Operation Log only)

Both authenticated cell-scoped pages share an identical page-header
component, sticky directly below the dark site-header. Structure:

- Eyebrow: `• [PAGE NAME] — ACTIVE`
- H1: active cell name (e.g. `Zoo 2`) — uses the shared `.title-hero`
  type scale so both pages match exactly
- Page-meta line: `N operators // region NA // established DATE // case
  LGN-▮▮▮ // last synced Xs ago`

The Briefing additionally renders an inline `+ Flag Operator` button at
the end of the meta line (handler-only action). The Operation Log has
no such button.

The `--header-h` CSS variable is set on every page load via JS reading
`document.querySelector('header.site-header').offsetHeight` — keeps the
sticky page-header parked correctly under the dark header at any width.

### Footer

Every page footer:
`DOCUMENT REF: LGN-2026-X-▮▮▮ // ORIGINATING OFFICE: LEGION/SUB // CASE:
ZOO 2 // OVERSIGHT: ▮▮▮▮ // DISTRIBUTION LIMITED // DECLASSIFY ON: TERM`

Document ref code and oversight identifier are redacted (just black
bars). In production, ref code = real document ID; oversight = redacted
literal ("ZOO" is the parent agency, never displayed in plaintext).

---

## Page-by-page features

### `landing.html` — Landing

Public marketing page. Sections top-to-bottom:

1. **Hero**
   - LEGION wordmark, tagline (`Surveillance on cells that queue
     together.`), sub-tagline describing what LEGION does in three
     sentences, two CTAs:
     - Primary: `Open a New File` → routes to `authenticate.html`
     - Secondary text link: `Already on file? Authenticate →` →
       `authenticate.html`

2. **Stats strip** — Four cell-style stat blocks:
   - `Matches Filed: 2.4M`
   - `Cells Under Surveillance: ▮▮▮▮ [CLASSIFIED]`
   - `Operators on File: ▮▮▮▮ [CLASSIFIED]`
   - `Solo Reports Filed: 0`
   In production: pull the first and last from real data; the redacted
   two stay redacted as flavor.

3. **File Contents (Features)** — Two REPORT cards mapping directly to
   the two stats-bearing pages:
   - `REPORT-01 · BRIEFING · ▮▮▮` — "Cell intelligence summary"
   - `REPORT-02 · OPERATION LOG` — "Joint deployments, indexed"

4. **Footer** — Standard footer markings.

### `about.html` — About

Public information page. Sections:

1. **Hero** — Two-column: doc-stamp on left (DOCUMENT, STATUS,
   INITIATIVE: LEGION), hero-body on right with eyebrow + H1 (`About
   LEGION`) + lead paragraphs. The lead opens with `LEGION operates
   under ZOO directive ▮▮▮▮` — the only explicit ZOO mention in body
   copy on the entire site.

2. **Intake Procedure** — Four-step list explaining how to open a new
   file. Pure informational; no CTAs inside the list.

3. **Glossary of Field Terms** — Nine entries:
   `CELL, OPERATOR, OPEN NEW FILE, AUTHENTICATE, BRIEFING, OPERATION
   LOG, JOINT DEPLOYMENT, TILT INDEX, ZOO` (+ one redacted bonus row).
   The ZOO entry's definition is itself redacted — the lore drop.

4. **CTA section** — `INTAKE OPEN` eyebrow + `Open a new file on your
   cell.` H3 + supporting copy + two buttons:
   - `Open New File` (primary, → `authenticate.html`)
   - `Return to Home` (secondary, → `landing.html`)

5. **Footer** — Standard.

### `authenticate.html` — Authenticate

Public auth page. Single centered form-card with a tab toggle:

- **Sign In tab (default):** Email + password fields, `Authenticate`
  submit button, forgot-password link below.
- **New Operator tab:** Email + password + Riot Game Name + Tag fields,
  `Open Operator File` submit button. Submitting routes (in production)
  to `intake.html` for cell designation.

Tab toggle is implemented in vanilla JS — clicking a tab activates that
tab's form and hides the other. No popup/modal — it's a dedicated page
for shareable URLs and recovery flows.

### `intake.html` — Open New File

Authenticated-only page. Cell designation flow only (account
credentials and Riot ID linkage happen on authenticate.html during
sign-up). Single form-card:

- Form classification banner: `CONFIDENTIAL // CELL INTAKE // HANDLE
  WITH CARE`
- H1: `Open a New File`
- Subtitle explaining what happens at intake
- Two radio options:
  - **Open a New Case:** Reveals a Cell Name field below
  - **Join an Existing Case:** Reveals an Invite Code field below
    (placeholder: `LGN-XXXX-XXXX`, auto-uppercase on input)
- Submit button: `Open New File`

Radio selection toggles which secondary field appears (the other hides).

### `briefing.html` — Briefing

Authenticated, cell-scoped. Main dashboard for a CELL. Top-to-bottom
sections:

1. **Sticky page-header** (see chrome section above): Eyebrow `• CELL
   BRIEFING — ACTIVE`, H1 cell name, page-meta with `+ Flag Operator`
   inline CTA.

2. **Cell Members** card with summary strip:
   - **Joint WR** (e.g. `58.3%`) with delta badge vs counterfactual
   - **WR Without You** (counterfactual baseline; redacted for other
     operators in the table since they don't see your private signal)
   - **Deployments** (joint match count, last 30 days)
   - **Recent Form** — 10 W/L boxes, latest highlighted with outline
   Followed by a table of all operators in the cell:
   `Operator | Status | Games (30D) | Win Rate | Cell WR Without —`
   Operators sorted alphabetically. The viewing operator's row is
   highlighted (`.cm-you`) with a `YOU` badge inline with their name.

3. **Game Mode Breakdown** card:
   - Horizontal bars per mode the cell has played (any non-zero match
     count). Modes ordered: staples first (Ranked, Ranked Flex, Normal,
     ARAM, ARAM Mayhem, Arena), then `FEATURED / ROTATING` divider,
     then rotating modes (ARURF, Nexus Blitz, One for All, Ultimate
     Spellbook). Rotating modes have italic name styling.
   - Each row: mode name + filled bar + WR % + games count.
   - Bar color + WR text color follow a 5-tier gradient pivoting at
     50%: `bar-great` (≥62%) deep green, `bar-high` (>50%, <62%)
     medium green, `bar-neutral` (=50.0%) gray, `bar-mid` (<50%, ≥40%)
     medium red, `bar-low` (<40%) deep red.
   - The WR text uses the same color as its bar.

4. **Two-column row:**
   - **Duo Win Rates** matrix (left): 7×7 grid of pair WRs. Operator
     codes (CAT/JIM/LYU/PIN/SDS/AFK/TAC) on both axes. Cell tiles use
     light-bg + dark-text scheme: red-bg for `<48%`, amber-bg for
     `48-54%`, green-bg for `54-62%`, bright green-bg `#bbf7d0` for
     `≥62%`. Diagonals are `—`, low-sample cells empty. Hover tooltip
     shows full info.
   - **Activity Heatmap** (right): 7-day × 24-hour grid of cell activity.
     Slate scale `h-0` (no activity) through `h-5` (densest). Same
     palette as Game Mode Breakdown was previously experimenting with
     before settling on semantic colors for the modes.

5. **Champion Pools** card — One row per operator (active operators
   only, alphabetical). Each row:
   - Operator name + class badge (`SPECIALIST`, `ONE-TRICK`, `NARROW`,
     `ROLE-LOCKED`, `CHAOTIC`, `INCONCLUSIVE`).
   - Horizontal segmented bar showing champion-pick distribution. Uses
     monochrome scale `s-1` (densest) through `s-5` (palest), plus
     `s-empty` for low-sample placeholder.
   - Note paragraph: terse bureaucratic profile observation.

6. **Behavioral Intelligence section** (eyebrow + h2 + lede), then
   two-column row:
   - **Tilt Index** (left): "WHAT WE'RE MEASURING" callout, THREAT
     LEVEL classification (e.g. `ELEVATED 7.2/10`), 10-segment scale,
     KEY JUDGMENTS list of 5 numbered findings, confidence stamp.
   - **Link Analysis** (right): SVG pentagonal network graph of active
     operators (CAT, JIM, LYU, PIN, SDS at vertices; AFK, TAC as
     inactive orbit nodes). Edge color = pair WR (green/red/grey); edge
     weight = joint match count. Legend below.

7. **Analyst Observations** (Field Assessments) — 6 cards in 2-column
   grid. Each card has:
   - Severity left-stripe (`severity-green/red/amber/blue/black`)
   - Code line: `OBS-NN · TITLE` + classification tag
   - Subject line (e.g. `jimmmaaayyy + iHazACatz`)
   - Note paragraph (1-3 sentences of analyst-voice prose)
   - Two of the six (OBS-02 + OBS-05) are heavily redacted: only blunt
     visible fragments interleaved with black bars.
   - Analyst signature footer below all 6: `ANALYST OF RECORD: ▮▮▮ ·
     VERIFIED BY: ▮▮▮ · FILED: DATE ▮▮▮`

### `match-history.html` — Operation Log

Authenticated, cell-scoped. The Operation Log. Top-to-bottom:

1. **Sticky page-header** matching the Briefing's exactly (same
   eyebrow / H1 / page-meta structure).

2. **Summary strip** — Four stat cards:
   - `Joint Win Rate` (green text, count-up animation)
   - `Total Wins` (last 30 days)
   - `Total Losses` (red text)
   - `Avg. Duration`

3. **Filter bar** with `Reset filters` button at the top right:
   - **Theater** row (single-select): All, plus every game mode in the
     site (`Ranked`, `Ranked Flex`, `Normal`, `ARAM`, `ARAM Mayhem`,
     `Arena`, `ARURF`, `Nexus Blitz`).
   - **Outcome** row (single-select): All / Wins / Losses.
   - **Operators** row (multi-toggle): every cell operator chip. All
     active by default.
   The Reset button enables only when filters are dirty (not at
   defaults) and resets all three rows on click.

4. **Match list** — Day-grouped match cards. Each day starts with a
   `[Date] — N deployments` header. Each match card:
   - Result tag (`WIN` / `LOSS`) — color-coded
   - Mode pill (outlined-only, monochrome, all-caps)
   - Duration + time
   - Per-operator table: `Operator | Champion | KDA | Damage` with
     fixed column widths so columns align across all cards
   - The viewing operator's row in each table is marked with a `YOU`
     suffix (small mono text) rather than a colored chip
   - Whole card is tinted: light green for wins, light red for losses

5. **Filter logic** (`<script>` at bottom of file):
   - Theater + Outcome are single-select (click activates this chip,
     deactivates row siblings)
   - Operators is multi-toggle (each click flips active state of that
     operator)
   - After every change, hide match rows where:
     - Theater is set and doesn't match `data-mode` on the row
     - Outcome is set and doesn't match `data-mode` (win/loss)
     - Any of the row's operators are NOT in the active set
   - Day headers hide if no matches under them remain visible
   - Per-day counts (`N deployments`) update dynamically
   - List footer count `SHOWING N OF 142` updates
   - Reset button disables when filters return to defaults

---

## State variants

### Logged-in vs logged-out

Currently the mockups model both states statically (no real auth). In
production:
- Landing, About, Authenticate render the same regardless of auth state
- Briefing and Operation Log require auth; redirect to `/authenticate`
  if not signed in
- Intake (`intake.html`) requires auth; redirect to `/authenticate?
  return_to=/intake` if not signed in
- Header chrome (CELL switcher, right-side CTAs) flips based on auth
  state — see "Dark site-header" section above

### Zero-cell empty state (Briefing + Operation Log)

When an authenticated operator belongs to zero CELLs, both Briefing and
Operation Log should render redacted versions:

- Dark header renders normally
- CELL switcher trigger shows redacted bar (▮▮▮▮▮ ▾); dropdown shows
  "NO ACTIVE CASE FILES" plus an "Open a new file →" action
- Page-header bar replaced with redacted equivalent (eyebrow stays,
  H1 redacted, page-meta entirely redacted)
- Body content area shows a centered empty-state card pointing to
  `/intake` and `/cells/join`

This is documented as HTML comments at the top of `briefing.html` and
`match-history.html`.

### Logged in with multiple CELLs

The CELL switcher dropdown lists all the operator's cells, with the
active one at the top under "Active Case File" with a checkmark, and
the others under "Other Files." Clicking a non-active cell row switches
context (in production: updates `operators.last_viewed_cell_id` and
routes to `/cells/:newCellId`).

### Login routing

After successful authentication:
- Operator with cells → route to `/cells/:lastViewedCellId` (Briefing)
- Operator with zero cells → route to empty-state Briefing or directly
  to `/intake` (per architecture handoff §6)

---

## Cross-cutting design system notes

### Vocabulary

| Term | Meaning |
|---|---|
| CELL | A registered group of up to 10 cooperating operators |
| OPERATOR | A single player linked to a cell via Riot ID |
| OPEN NEW FILE | Submit a cell to LEGION for surveillance |
| AUTHENTICATE | Sign in to an existing operator account |
| BRIEFING | Per-CELL analytical dashboard page |
| OPERATION LOG | Per-CELL match history (joint deployments only) |
| JOINT DEPLOYMENT | A match in which 2+ cell operators are on the same team |
| TILT INDEX | Composite metric tracking post-loss cohesion decay |
| ZOO | Parent agency. Mentioned exactly twice site-wide (about-hero lead + glossary), always with at least partial redaction. |

### Tone / voice rules

- Frank IC analyst voice throughout
- Numbers ≥10 use figures, numbers <10 spell out (CIA style guide)
- Active voice preferred, passive acceptable where natural
- Estimative language reserved for assessments: `HIGH CONFIDENCE`,
  `MODERATE CONFIDENCE`, `LOW CONFIDENCE`, `ALMOST CERTAINLY`,
  `PROBABLY`, `LIKELY`, `UNLIKELY`
- No exclamation points
- Solo activity is "out of scope" — not a limitation, a feature
- Users are petitioners voluntarily submitting their cell for
  surveillance, not LEGION employees
- ZOO is the parent agency; never explained, only obliquely referenced
  with redactions

### Palette anchors

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f5f1e8` | Page background (warm cream) |
| `--card` | `#fbf8f0` | Card / surface bg |
| `--text` | `#1a1a1a` | Primary text |
| `--muted` | `#6b6558` | Secondary text / neutral state |
| `--border` | `#d4ccb8` | Card borders, dividers |
| `--green` | `#15803d` | Positive WR / win indicators |
| `--red` | `#b91c1c` | Negative WR / loss indicators |
| `--amber` | `#b45309` | Used sparingly — tilt index only |
| `--blue` | `#1d4ed8` | Neutral observation indicators |
| `--slate-1..5` | gradient | Activity heatmap, monochrome scales |

### Redaction conventions

- `.redacted-inline` — black inline rectangle for in-text redactions.
  No "REDACTED" label inside (gov-doc convention)
- `.redacted` — display:inline-block black box, used in tables
- `.redacted-bar` — block-level black bar, used in decorative empty
  states
- On dark `.classification-bar` backgrounds, the redacted blocks get
  a cream `#f7f3e9` fill so they stay visible (via
  `.classification-bar:not(.muted) .redacted-inline`)
- Redactions appear in: footer document refs (`LGN-2026-X-▮▮▮`),
  oversight identifiers, classification eyebrows (`AUTHORITY ▮▮▮▮`),
  in-body ZOO directive citations, glossary ZOO definition, two of six
  Analyst Observations (OBS-02 dissolved-pairing, OBS-05 classified
  account history)

---

## Working with Claude in a new chat (backend phase)

Some practical tips based on this session's experience. None of these
are unique to Claude — they're general "how to brief a smart engineer
who doesn't have your context yet" tips that happen to work especially
well with an LLM:

### 1. Lead every backend session with a short context block

Don't make Claude reverse-engineer the project from a vague prompt.
Open with something like:

> I'm building LEGION, a League-of-Legends squad stats tracker with
> a CIA-dossier aesthetic. Stack: Vite + React + Tailwind on the
> frontend, Supabase (Postgres + Auth) and Riot API on the backend.
> Visual mockups are at `mockups/` (HTML+CSS, source of truth for
> design). Architecture decisions are in `legion-architecture-handoff.md`.
> Feature-level behavior is in `LEGION-mockup-feature-reference.md`.
> Today I want to wire up: <specific feature>.

This gives Claude five things in a few sentences: domain, stack,
where the visual truth lives, where the architectural truth lives,
where the behavior truth lives, and the scope for this turn.

### 2. Reference files by path, not by description

`@mockups/briefing.html` is better than "the briefing page mockup."
Claude reads the file directly, so the source of truth and the
implementation agree.

### 3. Keep the source-of-truth docs current

`legion-architecture-handoff.md` and this file should be updated as
decisions evolve. If a new chat reads a stale spec, it'll write stale
code. Lower your "should I update the doc?" threshold during build —
small drift accumulates.

### 4. Build vertically, not horizontally

Pick one full slice (e.g. "sign-in flow end-to-end: form submission
→ Supabase auth → redirect → session-aware header") and finish it
before starting the next. Asking Claude to scaffold "the entire auth
system" produces broad-and-shallow code. Asking for one slice produces
focused, testable, finishable work.

### 5. Define what "done" means up front

Concrete acceptance criteria help Claude know when to stop:

> Done when: (1) submitting valid creds on `/authenticate` calls
> `supabase.auth.signInWithPassword`, (2) on success the session
> persists and the page redirects to the last-viewed cell's briefing,
> (3) on failure an inline error message appears in the form, (4)
> existing visual styling from `authenticate.html` is preserved.

### 6. Hand off real schemas, not vibes

For schema work, paste actual SQL from `legion-architecture-handoff.md`
§11 rather than asking Claude to invent one. Same with API contracts:
write out the expected request/response shape and let Claude implement
to spec.

### 7. Don't fight Claude on its quirks; redirect them

If Claude wants to add comments, write detailed commit messages, or
include an info banner explaining what just changed — those are usually
mild over-helpfulness, not bugs. Either accept them or say "please
omit X" once. Don't burn turns arguing.

### 8. Use the existing voice for new copy

The CIA-style copy rules in this doc apply to any new UI strings,
error messages, empty states, loading states, etc. Sample lines like:
- `INTAKE FAILED. RIOT ID NOT FOUND.` (404 from Riot)
- `IDENTITY CONFIRMED. ROUTING TO CASE FILE.` (post-auth success)
- `CASE FILE AT MAXIMUM CAPACITY. 10 OPERATORS ON FILE.` (cap hit)
- `INVITE CODE INVALID OR EXPIRED.` (intake failure)
- `RETRIEVING CLASSIFIED FIELD REPORTS...` (loading)

If new copy needs to be drafted, ask explicitly: "draft 5 candidate
error messages in the LEGION voice for the case where..."

### 9. Save trial-and-error for visual work, not architectural work

This session iterated a lot on bar colors, grid pattern intensity, etc.
That kind of fine-tuning is great in mockup land but expensive in
build land. For backend work, decide-then-build instead of build-
then-decide. The architecture handoff doc already commits to most
decisions; trust them.

### 10. Verify in browser at the slice boundary

Each completed vertical slice should land with a `npm run dev` working
behavior. If Claude says "done" but the browser doesn't show the
expected change, push back. (The mockups had the advantage of being
static HTML — backend work has more places to drift.)

---

## Open questions / things deferred to build phase

- **Invite code format & lifecycle** — `cell_invites` table is sketched
  in handoff doc §10. Need to decide: single-use vs reusable default,
  expiration default, regeneration UI.
- **Riot API rate-limit handling** — handoff doc §8 mentions caching;
  build phase needs concrete strategy (likely match cache table +
  background ingest worker).
- **Empty-state visuals** — described in HTML comments at the top of
  `briefing.html` and `match-history.html` and in this doc, but not
  visually mocked up.
- **Handler-only UI** — Add/remove operator, promote to handler,
  dissolve cell. Mentioned in handoff doc §8 but no UI surface yet.
  Likely lives in a Directives panel on `/cells/:id/directives` or
  similar.
- **Field Assessment generation** — Templating layer for analyst
  observations. Discussed in chat; templates yet to be authored.
  Probably 30–50 archetypes (cell-core, incompatibility, temporal-
  variance, dogmatism, theater-mismatch, etc.), each with trigger
  conditions + slot specs + prose template + severity tag.
- **Tilt Index computation** — exact formula yet to be specified.
- **Authentication providers** — currently only email/password
  envisioned. OAuth (Discord? Riot itself?) might come later.

---

## Quick reference — file map

```
LEGION/
├── CLAUDE.md                              ← project directives
├── LEGION-mockup-feature-reference.md     ← THIS FILE
├── legion-architecture-handoff.md         ← (in ~/Downloads currently;
│                                            move to project root)
├── mockups/
│   ├── landing.html
│   ├── about.html
│   ├── authenticate.html                  ← sign-in + new operator
│   ├── intake.html                        ← cell designation
│   ├── briefing.html                      ← per-cell dashboard
│   ├── match-history.html                 ← per-cell op log
│   ├── dossier.css                        ← shared design system
│   ├── package.json                       ← `npm run dev` → http-server :3333
│   └── OLD/                               ← early prototype iterations,
│                                            kept for reference only
└── client/ server/                        ← scaffolded by earlier session;
                                              the React + Express skeleton
                                              the build phase will fill in.
```
