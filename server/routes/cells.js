const express = require('express')
const router = express.Router()
const { supabase } = require('../db/supabase')
const { getMatchIdsPaginated, getMatch } = require('../services/riot')
const { computeCellStats } = require('../services/stats')

// ── Auth middleware ──────────────────────────────────────────────

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'AUTHENTICATION REQUIRED' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'CLEARANCE DENIED' })
  req.user = user
  next()
}

// ── Helper: generate LGN-XXXX-XXXX invite code ─────────────────

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'LGN-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  code += '-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ── Helper: get cell member PUUIDs ───────────────────────────────

async function getCellPuuids(sb, cellId) {
  const { data: memberRows } = await sb
    .from('cell_members')
    .select('user_id')
    .eq('cell_id', cellId)

  const userIds = (memberRows ?? []).map((r) => r.user_id)
  if (userIds.length === 0) return []

  const { data: opRows } = await sb
    .from('operators')
    .select('user_id, puuid, riot_game_name, riot_tag_line')
    .in('user_id', userIds)

  const members = (opRows ?? [])
    .map((r) => ({ id: r.user_id, puuid: r.puuid, riot_game_name: r.riot_game_name, riot_tag_line: r.riot_tag_line }))
    .filter((m) => m.puuid)

  return members
}

// ── Fetch window ─────────────────────────────────────────────────
// Pull matches from the last 12 months so pre-season games (ARAM,
// off-season modes, etc.) are included alongside current-season data.

function fetchWindowStartEpoch() {
  const now = new Date()
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  return Math.floor(oneYearAgo.getTime() / 1000)
}

// ── Helper: fetch matches from DB that overlap with any of these PUUIDs ──
// Filters to current season only using the match's gameStartTimestamp.

async function getStoredMatches(sb, puuids) {
  const { data, error } = await sb
    .from('matches')
    .select('match_id, match_data')
    .overlaps('participants_puuids', puuids)
    .order('fetched_at', { ascending: false })

  if (error) {
    console.error('[LEGION] Match query error:', error.message)
    return []
  }
  return data ?? []
}

// ═════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════

// GET /api/cells — list cells for authenticated user
router.get('/', requireAuth, async (req, res) => {
  const sb = supabase
  const { data, error } = await sb
    .from('cell_members')
    .select('cell_id, cells(id, name, invite_code, created_at, created_by)')
    .eq('user_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })

  const cells = await Promise.all(
    (data ?? []).map(async (row) => {
      const cell = row.cells
      const { count } = await sb
        .from('cell_members')
        .select('*', { count: 'exact', head: true })
        .eq('cell_id', cell.id)
      return { ...cell, member_count: count ?? 0 }
    })
  )

  res.json(cells)
})

// POST /api/cells — create a new cell
router.post('/', requireAuth, async (req, res) => {
  const sb = supabase
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'CELL DESIGNATION REQUIRED' })

  const invite_code = generateInviteCode()

  const { data: cell, error: cellError } = await sb
    .from('cells')
    .insert({ name, created_by: req.user.id, invite_code })
    .select()
    .single()

  if (cellError) return res.status(500).json({ error: cellError.message })

  // Auto-add creator as member
  await sb
    .from('cell_members')
    .insert({ cell_id: cell.id, user_id: req.user.id })

  res.json({ ...cell, member_count: 1 })
})

// GET /api/cells/:id — get cell with members
router.get('/:id', requireAuth, async (req, res) => {
  const sb = supabase
  const { data: cell, error } = await sb
    .from('cells')
    .select('id, name, created_at')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'CELL NOT FOUND' })

  const { data: memberRows } = await sb
    .from('cell_members')
    .select('user_id')
    .eq('cell_id', req.params.id)

  const userIds = (memberRows ?? []).map((r) => r.user_id)

  const { data: opRows } = userIds.length > 0
    ? await sb.from('operators').select('user_id, riot_game_name, riot_tag_line, puuid, is_verified').in('user_id', userIds)
    : { data: [] }

  const members = (memberRows ?? []).map((row) => {
    const op = (opRows ?? []).find((o) => o.user_id === row.user_id)
    return { id: row.user_id, ...op }
  })

  res.json({ ...cell, members, member_count: members.length })
})

// POST /api/cells/join-by-code — look up cell by invite code and join
// Service role client bypasses RLS, so we query tables directly.
router.post('/join-by-code', requireAuth, async (req, res) => {
  const { invite_code } = req.body
  if (!invite_code) return res.status(400).json({ error: 'INVITE CODE REQUIRED' })

  const sb = supabase

  // Look up cell by invite code
  const { data: cell, error: cellError } = await sb
    .from('cells')
    .select('id, name')
    .eq('invite_code', invite_code.trim())
    .single()

  if (cellError || !cell) {
    return res.status(404).json({ error: 'INVITE CODE INVALID OR EXPIRED' })
  }

  // Check if already a member
  const { data: existing } = await sb
    .from('cell_members')
    .select('id')
    .eq('cell_id', cell.id)
    .eq('user_id', req.user.id)
    .single()

  if (existing) {
    return res.status(400).json({ error: 'OPERATOR ALREADY ENLISTED IN CELL' })
  }

  // Check capacity (10 operators max)
  const { count } = await sb
    .from('cell_members')
    .select('*', { count: 'exact', head: true })
    .eq('cell_id', cell.id)

  if (count >= 10) {
    return res.status(400).json({ error: 'CELL AT MAXIMUM CAPACITY' })
  }

  // Add member
  const { error: insertError } = await sb
    .from('cell_members')
    .insert({ cell_id: cell.id, user_id: req.user.id })

  if (insertError) {
    return res.status(500).json({ error: insertError.message })
  }

  res.json({ cell_id: cell.id, cell_name: cell.name, status: 'OPERATOR ADDED TO CELL' })
})

// POST /api/cells/:id/join — join an existing cell (by ID)
router.post('/:id/join', requireAuth, async (req, res) => {
  const sb = supabase
  const { data: existing } = await sb
    .from('cell_members')
    .select('id')
    .eq('cell_id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (existing) {
    return res.status(400).json({ error: 'OPERATOR ALREADY ENLISTED IN CELL' })
  }

  const { error } = await sb
    .from('cell_members')
    .insert({ cell_id: req.params.id, user_id: req.user.id })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ status: 'OPERATOR ADDED TO CELL' })
})

// DELETE /api/cells/:id — dissolve a cell (handler only)
router.delete('/:id', requireAuth, async (req, res) => {
  const sb = supabase
  const { data: cell, error: lookupError } = await sb
    .from('cells')
    .select('id, created_by')
    .eq('id', req.params.id)
    .single()

  if (lookupError || !cell) {
    return res.status(404).json({ error: 'CELL NOT FOUND' })
  }

  if (cell.created_by !== req.user.id) {
    return res.status(403).json({ error: 'ONLY THE HANDLER MAY DISSOLVE A CELL' })
  }

  await sb.from('cell_members').delete().eq('cell_id', cell.id)
  const { error } = await sb.from('cells').delete().eq('id', cell.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ status: 'CELL DISSOLVED' })
})

// ═════════════════════════════════════════════════════════════════
// POST /api/cells/:id/ingest — pull match data from Riot API
//
// This is the "sync" button. It:
//   1. Gets every cell member's PUUID
//   2. Fetches their recent match IDs from Riot
//   3. Skips matches already in the database
//   4. Fetches and stores new match details (one at a time,
//      respecting the rate limiter in riot.js)
//   5. Returns a summary of what was fetched
// ═════════════════════════════════════════════════════════════════

router.post('/:id/ingest', requireAuth, async (req, res) => {
  const sb = supabase
  const members = await getCellPuuids(sb, req.params.id)
  const puuids = members.map((m) => m.puuid)

  if (puuids.length === 0) {
    return res.json({
      status: 'NO_LINKED_OPERATORS',
      message: 'No operators with linked Riot IDs found in this cell.',
      fetched: 0,
      skipped: 0,
    })
  }

  const startTime = fetchWindowStartEpoch()
  const allMatchIds = new Set()
  for (const puuid of puuids) {
    try {
      const ids = await getMatchIdsPaginated(puuid, { maxMatches: 500, startTime })
      ids.forEach((id) => allMatchIds.add(id))
    } catch (err) {
      console.warn(`[LEGION] Failed to get match IDs for ${puuid}: ${err.message}`)
    }
  }

  if (allMatchIds.size === 0) {
    return res.json({ status: 'NO_MATCHES_FOUND', fetched: 0, skipped: 0 })
  }

  const { data: existingRows } = await sb
    .from('matches')
    .select('match_id')
    .in('match_id', Array.from(allMatchIds))

  const existingIds = new Set((existingRows ?? []).map((r) => r.match_id))
  const newMatchIds = Array.from(allMatchIds).filter((id) => !existingIds.has(id))

  // Fetch details in batches that fit within Vercel's timeout.
  // Each match detail = 1 Riot API call. Cap per sync to stay safe.
  const BATCH_LIMIT = 40
  const batch = newMatchIds.slice(0, BATCH_LIMIT)
  const remaining = newMatchIds.length - batch.length

  let fetched = 0
  for (const matchId of batch) {
    try {
      const matchData = await getMatch(matchId)
      const participantPuuids = matchData.metadata?.participants ?? []

      await sb.from('matches').upsert(
        {
          match_id: matchId,
          match_data: matchData,
          participants_puuids: participantPuuids,
        },
        { onConflict: 'match_id' }
      )

      fetched++
    } catch (err) {
      console.warn(`[LEGION] Failed to fetch match ${matchId}: ${err.message}`)
    }
  }

  res.json({
    status: remaining > 0 ? 'INGEST_PARTIAL' : 'INGEST_COMPLETE',
    total_discovered: allMatchIds.size,
    skipped: existingIds.size,
    fetched,
    remaining,
    message: remaining > 0
      ? `${remaining} matches pending. Sync again to continue filing.`
      : undefined,
  })
})

// ═════════════════════════════════════════════════════════════════
// GET /api/cells/:id/stats — compute group statistics from DB
//
// Reads cached match data only — no Riot API calls.
// Run /ingest first to populate the cache.
// ═════════════════════════════════════════════════════════════════

router.get('/:id/stats', requireAuth, async (req, res) => {
  const sb = supabase
  const members = await getCellPuuids(sb, req.params.id)
  const puuids = members.map((m) => m.puuid)

  if (puuids.length === 0) {
    return res.json({
      total_games: 0,
      games_together: 0,
      games_apart: 0,
      win_rate_together: null,
      win_rate_apart: null,
      champion_synergies: [],
      game_mode_breakdown: [],
    })
  }

  const matchRows = await getStoredMatches(sb, puuids)
  const matches = matchRows.map((r) => r.match_data)
  const stats = computeCellStats(matches, puuids)
  stats.season_year = new Date().getUTCFullYear()

  const userIds = members.map((m) => m.id)
  const { data: otherMemberships } = await sb
    .from('cell_members')
    .select('cell_id, user_id, cells(id, name)')
    .in('user_id', userIds)
    .neq('cell_id', req.params.id)

  const adjacencyMap = new Map()
  for (const row of (otherMemberships ?? [])) {
    const cid = row.cell_id
    if (!adjacencyMap.has(cid)) {
      adjacencyMap.set(cid, { cell_id: cid, cell_name: row.cells?.name ?? 'UNKNOWN', shared_user_ids: [] })
    }
    adjacencyMap.get(cid).shared_user_ids.push(row.user_id)
  }

  const adjacent_cells = Array.from(adjacencyMap.values())
    .filter((a) => a.shared_user_ids.length >= 3)
    .map((a) => ({
      cell_id: a.cell_id,
      cell_name: a.cell_name,
      shared_count: a.shared_user_ids.length,
      shared_operators: members.filter((m) => a.shared_user_ids.includes(m.id)).map((m) => m.riot_game_name ?? 'UNKNOWN'),
    }))

  res.json({ ...stats, adjacent_cells })
})

// ═════════════════════════════════════════════════════════════════
// GET /api/cells/:id/operations — joint operation log
//
// Returns matches where 2+ cell members played together,
// formatted for the Operation Log page.
// ═════════════════════════════════════════════════════════════════

router.get('/:id/operations', requireAuth, async (req, res) => {
  const sb = supabase
  const members = await getCellPuuids(sb, req.params.id)
  const puuids = members.map((m) => m.puuid)

  if (puuids.length === 0) return res.json([])

  const matchRows = await getStoredMatches(sb, puuids)

  const operations = []
  for (const row of matchRows) {
    const match = row.match_data
    const participants = match.info?.participants ?? []
    const cellParticipants = participants.filter((p) => puuids.includes(p.puuid))

    // Only include games where 2+ cell members played together
    if (cellParticipants.length < 2) continue

    operations.push({
      match_id: row.match_id,
      game_mode: match.info?.gameMode,
      queue_id: match.info?.queueId,
      game_duration: match.info?.gameDuration,
      game_end_timestamp: match.info?.gameEndTimestamp,
      cell_members: cellParticipants.map((p) => {
        const m = members.find((m) => m.puuid === p.puuid)
        return m?.riot_game_name ?? p.riotIdGameName ?? 'UNKNOWN'
      }),
      cell_members_won: cellParticipants.every((p) => p.win),
      participants: cellParticipants.map((p) => ({
        name: members.find((m) => m.puuid === p.puuid)?.riot_game_name ?? p.riotIdGameName,
        champion: p.championName,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        damage: p.totalDamageDealtToChampions,
        win: p.win,
      })),
    })
  }

  // Sort by game end time, newest first
  operations.sort((a, b) => (b.game_end_timestamp ?? 0) - (a.game_end_timestamp ?? 0))

  res.json(operations)
})

module.exports = router
