/**
 * Mock data for local dev preview. Simulates a fully populated "Zoo 2" cell
 * with five operators so pages can be viewed without authentication.
 *
 * Active in dev mode only (import.meta.env.DEV) when no real session exists.
 */

const MOCK_CELL_ID = 'mock-zoo-2'

export const MOCK_USER = {
  id: 'mock-user-1',
  email: 'operator@example.com',
  user_metadata: {
    riot_game_name: 'jimmmaaayyy',
    riot_tag_line: 'crow',
  },
}

export const MOCK_CELLS = [
  {
    id: MOCK_CELL_ID,
    name: 'Zoo 2',
    created_by: 'mock-user-1',
    member_count: 5,
    created_at: '2026-01-15T04:30:00Z',
    is_handler: true,
  },
]

export const MOCK_ACTIVE_CELL = MOCK_CELLS[0]

// ── Operator PUUIDs ──
const PU = {
  jim: 'pu-mock-jimmmaaayyy',
  cat: 'pu-mock-ihazacatz',
  cos: 'pu-mock-coslett',
  pin: 'pu-mock-pinpon',
  lyu: 'pu-mock-lyu',
}

function opChamps(list) {
  return list.map(([name, games, wins]) => ({
    name, games, wins, win_rate: games > 0 ? wins / games : 0,
  }))
}

function theaterEntry(games, wins, champs) {
  return {
    games, wins,
    win_rate: games > 0 ? wins / games : 0,
    top_champions: opChamps(champs),
    unique_champions: champs.length + Math.floor(Math.random() * 3),
  }
}

export const MOCK_STATS = {
  total_games: 142,
  games_together: 87,
  games_apart: 55,
  win_rate_together: 0.529,
  win_rate_apart: 0.472,
  season_year: 2026,

  // ── Operator stats ──
  operator_stats: [
    {
      puuid: PU.jim, user_id: 'mock-user-1', name: 'jimmmaaayyy',
      games: 62, wins: 34, win_rate: 0.548,
      wr_without: 0.480,
      top_champions: opChamps([
        ['Jhin', 16, 10], ['Jinx', 11, 6], ['Miss Fortune', 8, 4],
        ['Aphelios', 7, 4], ['Caitlyn', 5, 3],
      ]),
      unique_champions: 13,
      theaters: {
        "SUMMONER'S RIFT": theaterEntry(48, 27, [
          ['Jhin', 14, 9], ['Jinx', 10, 5], ['Miss Fortune', 8, 4],
          ['Aphelios', 7, 4], ['Caitlyn', 5, 3],
        ]),
        'HOWLING ABYSS': theaterEntry(11, 5, [
          ['Lux', 3, 1], ['Jhin', 2, 1], ['Ziggs', 2, 1],
          ['Nidalee', 2, 1], ['Zyra', 2, 1],
        ]),
        'RINGS OF WRATH': theaterEntry(3, 2, [
          ['Jhin', 2, 1], ['Jinx', 1, 1],
        ]),
      },
      last_played: Date.now() - 86400000,
    },
    {
      puuid: PU.pin, user_id: 'mock-user-4', name: 'Pin Pon',
      games: 50, wins: 27, win_rate: 0.540,
      wr_without: 0.541,
      top_champions: opChamps([
        ['Garen', 18, 11], ['Darius', 12, 6], ['Mordekaiser', 8, 4],
        ['Sett', 4, 2], ['Illaoi', 3, 2],
      ]),
      unique_champions: 9,
      theaters: {
        "SUMMONER'S RIFT": theaterEntry(45, 25, [
          ['Garen', 17, 10], ['Darius', 12, 6], ['Mordekaiser', 8, 4],
          ['Sett', 4, 2], ['Illaoi', 3, 2],
        ]),
        'HOWLING ABYSS': theaterEntry(5, 2, [
          ['Garen', 2, 1], ['Darius', 2, 1], ['Mordekaiser', 1, 0],
        ]),
        'RINGS OF WRATH': theaterEntry(0, 0, []),
      },
      last_played: Date.now() - 259200000,
    },
    {
      puuid: PU.cos, user_id: 'mock-user-3', name: 'Coslett',
      games: 58, wins: 31, win_rate: 0.534,
      wr_without: 0.517,
      top_champions: opChamps([
        ['Zed', 6, 4], ['Yasuo', 5, 2], ['Lee Sin', 5, 3],
        ['Thresh', 4, 2], ['Ezreal', 4, 3],
      ]),
      unique_champions: 24,
      theaters: {
        "SUMMONER'S RIFT": theaterEntry(35, 19, [
          ['Zed', 6, 4], ['Yasuo', 5, 2], ['Lee Sin', 5, 3],
          ['Thresh', 4, 2], ['Ezreal', 4, 3],
        ]),
        'HOWLING ABYSS': theaterEntry(18, 9, [
          ['Veigar', 3, 2], ['Brand', 3, 1], ['Xerath', 2, 1],
          ['LeBlanc', 2, 1], ['Nidalee', 2, 1],
        ]),
        'RINGS OF WRATH': theaterEntry(5, 3, [
          ['Yasuo', 2, 1], ['Samira', 1, 1], ['Katarina', 1, 1], ['Akali', 1, 0],
        ]),
      },
      last_played: Date.now() - 43200000,
    },
    {
      puuid: PU.lyu, user_id: 'mock-user-5', name: 'lyu',
      games: 45, wins: 24, win_rate: 0.533,
      wr_without: 0.548,
      top_champions: opChamps([
        ['Vayne', 10, 6], ['Samira', 9, 5], ['Kai\'Sa', 5, 3],
        ['Ziggs', 4, 2], ['Lux', 3, 2],
      ]),
      unique_champions: 16,
      theaters: {
        "SUMMONER'S RIFT": theaterEntry(20, 11, [
          ['Vayne', 6, 4], ['Kai\'Sa', 5, 3], ['Samira', 4, 2],
          ['Lucian', 3, 1], ['Draven', 2, 1],
        ]),
        'HOWLING ABYSS': theaterEntry(12, 6, [
          ['Ziggs', 4, 2], ['Lux', 3, 2], ['Xerath', 3, 1], ['Vel\'Koz', 2, 1],
        ]),
        'RINGS OF WRATH': theaterEntry(13, 7, [
          ['Samira', 5, 3], ['Vayne', 4, 2], ['Katarina', 3, 2], ['Yasuo', 1, 0],
        ]),
      },
      last_played: Date.now() - 518400000,
    },
    {
      puuid: PU.cat, user_id: 'mock-user-2', name: 'iHazACatz',
      games: 55, wins: 28, win_rate: 0.509,
      wr_without: 0.563,
      top_champions: opChamps([
        ['Yuumi', 28, 13], ['Lulu', 9, 5], ['Janna', 6, 4],
        ['Sona', 5, 3], ['Nami', 4, 2],
      ]),
      unique_champions: 8,
      theaters: {
        "SUMMONER'S RIFT": theaterEntry(22, 11, [
          ['Yuumi', 16, 8], ['Lulu', 3, 2], ['Janna', 2, 1], ['Nami', 1, 0],
        ]),
        'HOWLING ABYSS': theaterEntry(30, 15, [
          ['Yuumi', 12, 5], ['Lulu', 6, 3], ['Sona', 5, 3],
          ['Janna', 4, 3], ['Nami', 3, 1],
        ]),
        'RINGS OF WRATH': theaterEntry(3, 2, [
          ['Yuumi', 2, 1], ['Lulu', 1, 1],
        ]),
      },
      last_played: Date.now() - 172800000,
    },
  ],

  // ── Champion synergies ──
  champion_synergies: [
    { operators: ['jimmmaaayyy', 'iHazACatz'], champions: ['Jhin', 'Yuumi'], games: 8, wins: 6, win_rate: 0.75, delta: 0.221 },
    { operators: ['jimmmaaayyy', 'Pin Pon'], champions: ['Jinx', 'Garen'], games: 5, wins: 3, win_rate: 0.60, delta: 0.071 },
    { operators: ['Coslett', 'lyu'], champions: ['Zed', 'Vayne'], games: 4, wins: 3, win_rate: 0.75, delta: 0.221 },
    { operators: ['Pin Pon', 'iHazACatz'], champions: ['Darius', 'Yuumi'], games: 4, wins: 1, win_rate: 0.25, delta: -0.279 },
    { operators: ['jimmmaaayyy', 'Coslett'], champions: ['Miss Fortune', 'Thresh'], games: 3, wins: 2, win_rate: 0.667, delta: 0.138 },
  ],

  // ── Game mode breakdown ──
  game_mode_breakdown: [
    { mode: 'Ranked', games: 34, win_rate: 0.559 },
    { mode: 'Normal', games: 22, win_rate: 0.500 },
    { mode: 'ARAM', games: 19, win_rate: 0.526 },
    { mode: 'Ranked Flex', games: 8, win_rate: 0.625 },
    { mode: 'Arena', games: 4, win_rate: 0.500 },
  ],

  // ── Duo stats ──
  duo_stats: [
    { puuids: [PU.jim, PU.cat], names: ['jimmmaaayyy', 'iHazACatz'], games: 38, wins: 22, win_rate: 0.579 },
    { puuids: [PU.jim, PU.cos], names: ['jimmmaaayyy', 'Coslett'], games: 35, wins: 19, win_rate: 0.543 },
    { puuids: [PU.jim, PU.pin], names: ['jimmmaaayyy', 'Pin Pon'], games: 30, wins: 17, win_rate: 0.567 },
    { puuids: [PU.jim, PU.lyu], names: ['jimmmaaayyy', 'lyu'], games: 25, wins: 14, win_rate: 0.560 },
    { puuids: [PU.cat, PU.cos], names: ['iHazACatz', 'Coslett'], games: 28, wins: 13, win_rate: 0.464 },
    { puuids: [PU.cat, PU.pin], names: ['iHazACatz', 'Pin Pon'], games: 22, wins: 10, win_rate: 0.455 },
    { puuids: [PU.cat, PU.lyu], names: ['iHazACatz', 'lyu'], games: 20, wins: 11, win_rate: 0.550 },
    { puuids: [PU.cos, PU.pin], names: ['Coslett', 'Pin Pon'], games: 26, wins: 15, win_rate: 0.577 },
    { puuids: [PU.cos, PU.lyu], names: ['Coslett', 'lyu'], games: 22, wins: 13, win_rate: 0.591 },
    { puuids: [PU.pin, PU.lyu], names: ['Pin Pon', 'lyu'], games: 18, wins: 8, win_rate: 0.444 },
  ],

  // ── Heatmap (UTC, 7 days x 24 hours) ──
  heatmap: [
    // Sun
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,2],
    // Mon
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,1],
    // Tue
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,1],
    // Wed
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,4,2],
    // Thu
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0],
    // Fri
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,4,5,3],
    // Sat
    [2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,5,6,4],
  ],

  // ── Recent form (newest first) ──
  recent_form: [
    { win: true, timestamp: Date.now() - 86400000, mode: 'Ranked' },
    { win: false, timestamp: Date.now() - 90000000, mode: 'Ranked' },
    { win: true, timestamp: Date.now() - 172800000, mode: 'ARAM' },
    { win: true, timestamp: Date.now() - 180000000, mode: 'Normal' },
    { win: false, timestamp: Date.now() - 259200000, mode: 'Ranked' },
    { win: false, timestamp: Date.now() - 262800000, mode: 'Ranked' },
    { win: true, timestamp: Date.now() - 345600000, mode: 'ARAM' },
    { win: true, timestamp: Date.now() - 432000000, mode: 'Normal' },
    { win: false, timestamp: Date.now() - 518400000, mode: 'Ranked' },
    { win: true, timestamp: Date.now() - 604800000, mode: 'Ranked Flex' },
  ],

  // ── Tilt Index ──
  tilt_index: {
    score: 4.8,
    label: 'GUARDED',
    judgments: [
      { label: 'Post-loss queue rate', text: '72% — cell re-queues after losses at an elevated rate' },
      { label: 'Maximum consecutive losses', text: '4 — recorded in a single session' },
      { label: 'WR after first loss', text: '38% — performance degrades after initial defeat' },
      { label: 'Session length after loss', text: 'Average 2.3 additional games played after a loss' },
      { label: 'Recovery pattern', text: 'Cell recovers baseline WR within 24 hours of tilt event' },
    ],
  },

  // ── Analyst observations ──
  assessments: [
    {
      code: 'OBS-01', severity: 'green', title: 'SYNERGY IDENTIFIED',
      subject: 'jimmmaaayyy / iHazACatz',
      note: 'jimmmaaayyy + iHazACatz record a 57.9% WR across 38 joint deployments — 5 points above cell baseline. Jhin/Yuumi composition accounts for 8 of these with 75% WR. Pair synergy is assessed as ALMOST CERTAINLY a stabilizing factor.',
    },
    {
      code: 'OBS-02', severity: 'amber', title: 'ONE-TRICK EXPOSURE',
      subject: 'iHazACatz / Yuumi',
      note: 'iHazACatz fields Yuumi in 51% of recorded joint deployments. Champion pool depth is assessed as LOW. Ban-phase exposure is assessed as ALMOST CERTAINLY a recurring vulnerability.',
    },
    {
      code: 'OBS-03', severity: 'blue', title: 'THEATER DIVERGENCE',
      subject: 'lyu — cross-map pool split',
      note: "Champion selection by lyu diverges sharply between theaters. SUMMONER'S RIFT: Vayne; HOWLING ABYSS: Ziggs; RINGS OF WRATH: Samira. Overlap coefficient: 8%. Analyst assesses this as a DELIBERATE adaptation to map geometry rather than incidental variance.",
    },
    {
      code: 'OBS-04', severity: 'black', title: null, subject: null, note: null, redacted: true, redactedVariant: 0,
    },
    {
      code: 'OBS-05', severity: 'amber', title: 'THEATER SPECIALIST',
      subject: "Pin Pon — SUMMONER'S RIFT",
      note: "90% of Pin Pon's joint deployments occur on SUMMONER'S RIFT. 45 of 50 recorded operations confined to a single theater. Cross-map versatility is assessed as UNTESTED.",
    },
    {
      code: 'OBS-06', severity: 'red', title: 'COMPATIBILITY CONCERN',
      subject: 'Pin Pon + iHazACatz',
      note: 'Pair WR of 46% falls 7 points below cell baseline. Champion overlap inconsistent. Reintroduction to joint operations has not produced improvement. Pattern is assessed as LIKELY structural.',
    },
  ],
}

// ── Mock Operation Log (matches server output format) ──
const CHAMP_POOL = {
  jim: ['Jhin', 'Jinx', 'Miss Fortune', 'Aphelios', 'Caitlyn'],
  cat: ['Yuumi', 'Lulu', 'Janna', 'Sona', 'Nami'],
  cos: ['Zed', 'Yasuo', 'Lee Sin', 'Thresh', 'Ezreal'],
  pin: ['Garen', 'Darius', 'Mordekaiser', 'Sett', 'Illaoi'],
  lyu: ['Vayne', 'Samira', 'Kai\'Sa', 'Ziggs', 'Lux'],
}
const OP_NAMES = ['jimmmaaayyy', 'iHazACatz', 'Coslett', 'Pin Pon', 'lyu']
const QUEUE_MAP = { Ranked: 420, Normal: 400, ARAM: 450, 'Ranked Flex': 440, Arena: 1700 }
const MODE_MAP = { Ranked: 'CLASSIC', Normal: 'CLASSIC', ARAM: 'ARAM', 'Ranked Flex': 'CLASSIC', Arena: 'CHERRY' }
const MODES = ['Ranked', 'Ranked', 'Normal', 'ARAM', 'Ranked', 'Normal', 'Ranked Flex', 'ARAM']
const POOL_KEYS = ['jim', 'cat', 'cos', 'pin', 'lyu']

function seededRand(seed) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }
}

function generateMockOperations() {
  const ops = []
  const rand = seededRand(42)
  const now = Date.now()

  for (let i = 0; i < 87; i++) {
    const ts = now - (i * 4.2 * 3600000) - rand() * 7200000
    const win = rand() > 0.47
    const mode = MODES[Math.floor(rand() * MODES.length)]
    const numPlayers = rand() > 0.4 ? (rand() > 0.5 ? 3 : 2) : (rand() > 0.6 ? 5 : 4)
    const indices = [0, 1, 2, 3, 4].sort(() => rand() - 0.5).slice(0, numPlayers)
    if (!indices.includes(0) && rand() > 0.3) indices[0] = 0

    const participants = indices.map(idx => {
      const champs = CHAMP_POOL[POOL_KEYS[idx]]
      return {
        name: OP_NAMES[idx],
        champion: champs[Math.floor(rand() * champs.length)],
        kills: Math.floor(rand() * 15),
        deaths: Math.floor(rand() * 10),
        assists: Math.floor(rand() * 20),
        damage: Math.floor(12000 + rand() * 25000),
        gold: Math.floor(8000 + rand() * 10000),
        win,
      }
    })

    ops.push({
      match_id: `NA1_${5000000000 + i}`,
      game_mode: MODE_MAP[mode] || 'CLASSIC',
      queue_id: QUEUE_MAP[mode] || 420,
      game_duration: Math.floor(1200 + rand() * 1200),
      game_end_timestamp: ts,
      cell_members: participants.map(p => p.name),
      cell_members_won: win,
      participants,
    })
  }

  return ops
}

export const MOCK_OPERATIONS = generateMockOperations()

export function isMockCell(cellId) {
  return cellId === MOCK_CELL_ID
}
