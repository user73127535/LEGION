/**
 * Compute group-level statistics from stored match data.
 * All calculations focus on games where 2+ CELL members participated together.
 */

// Resolve a human-readable mode name from queueId + gameMode fallback
function resolveModeName(match) {
  const queueId = match.info?.queueId
  const gameMode = match.info?.gameMode

  const queueMap = {
    420: 'Ranked',
    440: 'Ranked Flex',
    400: 'Normal',
    430: 'Normal',
    450: 'ARAM',
    2400: 'ARAM Mayhem',
    900: 'URF',
    1020: 'One for All',
    1300: 'Nexus Blitz',
    1700: 'Arena',
    1900: 'URF',
  }

  if (queueId != null && queueMap[queueId]) return queueMap[queueId]

  const modeMap = {
    CLASSIC: 'Normal',
    ARAM: 'ARAM',
    CHERRY: 'Arena',
    NEXUSBLITZ: 'Nexus Blitz',
    URF: 'URF',
    ARURF: 'ARURF',
    ULTBOOK: 'Ultimate Spellbook',
    ONEFORALL: 'One for All',
  }

  return modeMap[gameMode?.toUpperCase?.()] || gameMode || 'UNKNOWN'
}

const THEATER_ORDER = ["SUMMONER'S RIFT", 'HOWLING ABYSS', 'RINGS OF WRATH']

function resolveTheater(modeName) {
  const map = {
    'ARAM': 'HOWLING ABYSS',
    'ARAM Mayhem': 'HOWLING ABYSS',
    'Arena': 'RINGS OF WRATH',
  }
  return map[modeName] || "SUMMONER'S RIFT"
}

/**
 * Find cell members who are on the SAME TEAM in a match.
 * Returns the group from the team with the most cell members (>= 2),
 * or null if no team has 2+ cell members on it.
 *
 * This is critical: two cell members on opposite teams is NOT a joint
 * deployment — they didn't queue together. LEGION only tracks games
 * where 2+ cell operators deploy on the same side.
 */
function getSameTeamCellGroup(participants, puuidSet) {
  const cellParticipants = participants.filter((p) => puuidSet.has(p.puuid))
  if (cellParticipants.length < 2) return null

  // Group cell members by teamId (Riot API: 100 = blue, 200 = red)
  const byTeam = {}
  for (const p of cellParticipants) {
    const tid = p.teamId
    if (!byTeam[tid]) byTeam[tid] = []
    byTeam[tid].push(p)
  }

  // Return the largest same-team group with 2+ members
  let best = null
  for (const members of Object.values(byTeam)) {
    if (members.length >= 2 && (!best || members.length > best.length)) {
      best = members
    }
  }
  return best
}

function computeCellStats(matches, cellPuuids, memberRoster = []) {
  const puuidSet = new Set(cellPuuids)

  // Joint match = 2+ cell members on the SAME team
  const jointMatches = matches.filter((m) => {
    const participants = m.info?.participants ?? []
    return getSameTeamCellGroup(participants, puuidSet) !== null
  })

  const soloMatches = matches.filter((m) => {
    const participants = m.info?.participants ?? []
    const cellCount = participants.filter((p) => puuidSet.has(p.puuid)).length
    return cellCount === 1
  })

  // Win rate together — only counts wins for the same-team group
  const jointWins = jointMatches.filter((m) => {
    const participants = m.info?.participants ?? []
    const cellTeam = getSameTeamCellGroup(participants, puuidSet)
    return cellTeam && cellTeam[0].win
  }).length

  // Win rate apart (majority vote — if >50% of solo appearances won)
  const soloWins = soloMatches.filter((m) => {
    const participants = m.info?.participants ?? []
    const cellMember = participants.find((p) => puuidSet.has(p.puuid))
    return cellMember?.win
  }).length

  // Champion synergy: group by puuid combo + champion combo (same team only)
  const synergyMap = new Map()
  for (const match of jointMatches) {
    const participants = match.info?.participants ?? []
    const cellParticipants = getSameTeamCellGroup(participants, puuidSet)
    if (!cellParticipants || cellParticipants.length < 2) continue

    const sortedKey = cellParticipants
      .map((p) => `${p.puuid}:${p.championName}`)
      .sort()
      .join('|')

    if (!synergyMap.has(sortedKey)) {
      synergyMap.set(sortedKey, {
        operators: cellParticipants.map((p) => p.riotIdGameName ?? p.summonerName ?? 'UNKNOWN').sort(),
        champions: cellParticipants.map((p) => p.championName).sort(),
        games: 0,
        wins: 0,
      })
    }
    const entry = synergyMap.get(sortedKey)
    entry.games++
    if (cellParticipants[0].win) entry.wins++
  }

  const champion_synergies = Array.from(synergyMap.values())
    .map((s) => ({
      ...s,
      win_rate: s.games > 0 ? s.wins / s.games : 0,
      delta: s.games > 0 ? (s.wins / s.games) - (jointWins / (jointMatches.length || 1)) : 0,
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 10)

  // Game mode breakdown — uses queueId for accurate classification
  const modeMap = new Map()
  for (const match of jointMatches) {
    const mode = resolveModeName(match)
    if (!modeMap.has(mode)) modeMap.set(mode, { games: 0, wins: 0 })
    const entry = modeMap.get(mode)
    entry.games++
    const cellTeam = getSameTeamCellGroup(match.info?.participants ?? [], puuidSet)
    if (cellTeam && cellTeam[0].win) entry.wins++
  }

  const game_mode_breakdown = Array.from(modeMap.entries())
    .map(([mode, { games, wins }]) => ({
      mode,
      games,
      win_rate: games > 0 ? wins / games : 0,
    }))
    .sort((a, b) => b.games - a.games)

  // ── Per-operator stats in joint matches (same-team only) ──
  const operatorMap = new Map()
  for (const match of jointMatches) {
    const participants = match.info?.participants ?? []
    const cellParticipants = getSameTeamCellGroup(participants, puuidSet)
    if (!cellParticipants) continue
    const teamWon = cellParticipants[0].win
    const matchTs = match.info?.gameEndTimestamp ?? 0
    const modeName = resolveModeName(match)
    const theater = resolveTheater(modeName)

    for (const p of cellParticipants) {
      if (!operatorMap.has(p.puuid)) {
        operatorMap.set(p.puuid, {
          puuid: p.puuid,
          name: p.riotIdGameName ?? p.summonerName ?? 'UNKNOWN',
          games: 0,
          wins: 0,
          champions: new Map(),
          theaterData: new Map(),
          lastPlayed: 0,
        })
      }
      const op = operatorMap.get(p.puuid)
      op.games++
      if (teamWon) op.wins++
      if (matchTs > op.lastPlayed) op.lastPlayed = matchTs
      // Track champion picks (overall)
      const champ = p.championName
      if (!op.champions.has(champ)) op.champions.set(champ, { games: 0, wins: 0 })
      const c = op.champions.get(champ)
      c.games++
      if (teamWon) c.wins++
      // Track champion picks (per theater)
      if (!op.theaterData.has(theater)) {
        op.theaterData.set(theater, { games: 0, wins: 0, champions: new Map() })
      }
      const td = op.theaterData.get(theater)
      td.games++
      if (teamWon) td.wins++
      if (!td.champions.has(champ)) td.champions.set(champ, { games: 0, wins: 0 })
      const tc = td.champions.get(champ)
      tc.games++
      if (teamWon) tc.wins++
    }
  }

  // WR without each operator — joint games where that operator was NOT present
  const operator_stats = Array.from(operatorMap.values()).map((op) => {
    const gamesWithout = jointMatches.filter((m) => {
      const participants = m.info?.participants ?? []
      return !participants.some((p) => p.puuid === op.puuid)
    })
    const winsWithout = gamesWithout.filter((m) => {
      const participants = m.info?.participants ?? []
      const cellTeam = getSameTeamCellGroup(participants, puuidSet)
      return cellTeam && cellTeam[0].win
    }).length

    // Top champions by games played
    const topChamps = Array.from(op.champions.entries())
      .map(([name, { games, wins }]) => ({ name, games, wins, win_rate: games > 0 ? wins / games : 0 }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5)

    // Per-theater champion breakdown
    const theaters = {}
    for (const t of THEATER_ORDER) {
      const td = op.theaterData.get(t)
      if (td) {
        const tChamps = Array.from(td.champions.entries())
          .map(([name, { games, wins }]) => ({ name, games, wins, win_rate: games > 0 ? wins / games : 0 }))
          .sort((a, b) => b.games - a.games)
          .slice(0, 5)
        theaters[t] = {
          games: td.games, wins: td.wins,
          win_rate: td.games > 0 ? td.wins / td.games : 0,
          top_champions: tChamps,
          unique_champions: td.champions.size,
        }
      } else {
        theaters[t] = { games: 0, wins: 0, win_rate: 0, top_champions: [], unique_champions: 0 }
      }
    }

    // Resolve user_id from roster by PUUID
    const rosterEntry = memberRoster.find((m) => m.puuid === op.puuid)
    return {
      puuid: op.puuid,
      user_id: rosterEntry?.id ?? null,
      name: op.name,
      games: op.games,
      wins: op.wins,
      win_rate: op.games > 0 ? op.wins / op.games : 0,
      wr_without: gamesWithout.length > 0 ? winsWithout / gamesWithout.length : null,
      top_champions: topChamps,
      unique_champions: op.champions.size,
      theaters,
      last_played: op.lastPlayed || null,
    }
  }).sort((a, b) => b.win_rate - a.win_rate || b.games - a.games)

  // Ensure every rostered cell member appears, even with 0 joint games or no PUUID
  const seenPuuids = new Set(operator_stats.map((o) => o.puuid))
  for (const member of memberRoster) {
    if (member.puuid && seenPuuids.has(member.puuid)) continue
    const emptyTheaters = {}
    for (const t of THEATER_ORDER) {
      emptyTheaters[t] = { games: 0, wins: 0, win_rate: 0, top_champions: [], unique_champions: 0 }
    }
    operator_stats.push({
      puuid: member.puuid ?? member.id,
      user_id: member.id,
      name: member.riot_game_name ?? 'UNKNOWN',
      games: 0,
      wins: 0,
      win_rate: 0,
      wr_without: jointMatches.length > 0 ? jointWins / jointMatches.length : null,
      top_champions: [],
      unique_champions: 0,
      theaters: emptyTheaters,
      last_played: null,
    })
  }

  // ── Duo pair win rates (NxN matrix) — same-team pairs only ──
  const duoMap = new Map()
  for (const match of jointMatches) {
    const participants = match.info?.participants ?? []
    const cellParticipants = getSameTeamCellGroup(participants, puuidSet)
    if (!cellParticipants) continue
    const teamWon = cellParticipants[0].win

    // For every pair in this match (all guaranteed same team)
    for (let i = 0; i < cellParticipants.length; i++) {
      for (let j = i + 1; j < cellParticipants.length; j++) {
        const key = [cellParticipants[i].puuid, cellParticipants[j].puuid].sort().join('|')
        if (!duoMap.has(key)) {
          duoMap.set(key, {
            puuids: [cellParticipants[i].puuid, cellParticipants[j].puuid].sort(),
            names: [
              cellParticipants[i].riotIdGameName ?? 'UNKNOWN',
              cellParticipants[j].riotIdGameName ?? 'UNKNOWN',
            ],
            games: 0,
            wins: 0,
          })
        }
        const duo = duoMap.get(key)
        duo.games++
        if (teamWon) duo.wins++
      }
    }
  }

  const duo_stats = Array.from(duoMap.values()).map((d) => ({
    ...d,
    win_rate: d.games > 0 ? d.wins / d.games : 0,
  })).sort((a, b) => b.games - a.games)

  // ── Activity heatmap (day-of-week x hour) in UTC ──
  // 7 rows (0=Sunday..6=Saturday) x 24 columns (hours)
  // Computed in UTC so the client can shift to the user's local timezone
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const match of jointMatches) {
    const ts = match.info?.gameEndTimestamp ?? match.info?.gameStartTimestamp
    if (!ts) continue
    const date = new Date(ts)
    heatmap[date.getUTCDay()][date.getUTCHours()]++
  }

  // ── Recent form (last 10 joint games, newest first) ──
  const sortedJoint = [...jointMatches].sort((a, b) => {
    const tsA = a.info?.gameEndTimestamp ?? 0
    const tsB = b.info?.gameEndTimestamp ?? 0
    return tsB - tsA
  })

  const recent_form = sortedJoint.slice(0, 10).map((m) => {
    const participants = m.info?.participants ?? []
    const cellTeam = getSameTeamCellGroup(participants, puuidSet)
    return {
      win: cellTeam ? cellTeam[0].win : false,
      timestamp: m.info?.gameEndTimestamp ?? null,
      mode: m.info?.gameMode ?? 'UNKNOWN',
    }
  })

  // ── Tilt Index ──
  // Measures post-loss cohesion: how well does the cell perform after a loss?
  // Uses chronological joint matches to track streaks and recovery.
  const chronological = [...jointMatches].sort((a, b) => {
    return (a.info?.gameEndTimestamp ?? 0) - (b.info?.gameEndTimestamp ?? 0)
  })

  let tilt_index = null
  if (chronological.length >= 5) {
    const results = chronological.map((m) => {
      const participants = m.info?.participants ?? []
      const cellTeam = getSameTeamCellGroup(participants, puuidSet)
      return cellTeam ? cellTeam[0].win : false
    })

    // Post-loss WR: win rate in games immediately after a loss
    let postLossGames = 0, postLossWins = 0
    for (let i = 1; i < results.length; i++) {
      if (!results[i - 1]) { // previous game was a loss
        postLossGames++
        if (results[i]) postLossWins++
      }
    }
    const postLossWR = postLossGames > 0 ? postLossWins / postLossGames : null

    // Max loss streak
    let maxStreak = 0, currentStreak = 0
    for (const won of results) {
      if (!won) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak) }
      else currentStreak = 0
    }

    // Late-session decay: compare WR in first half vs second half of sessions
    // A "session" = games within 2 hours of each other
    const sessions = []
    let session = [0]
    for (let i = 1; i < chronological.length; i++) {
      const gap = (chronological[i].info?.gameEndTimestamp ?? 0) - (chronological[i - 1].info?.gameEndTimestamp ?? 0)
      if (gap > 2 * 60 * 60 * 1000) { // 2 hour gap = new session
        sessions.push(session)
        session = [i]
      } else {
        session.push(i)
      }
    }
    sessions.push(session)

    let earlyWins = 0, earlyGames = 0, lateWins = 0, lateGames = 0
    for (const s of sessions) {
      if (s.length < 3) continue
      const mid = Math.floor(s.length / 2)
      for (let i = 0; i < mid; i++) { earlyGames++; if (results[s[i]]) earlyWins++ }
      for (let i = mid; i < s.length; i++) { lateGames++; if (results[s[i]]) lateWins++ }
    }
    const earlyWR = earlyGames > 0 ? earlyWins / earlyGames : null
    const lateWR = lateGames > 0 ? lateWins / lateGames : null
    const sessionDecay = (earlyWR != null && lateWR != null) ? earlyWR - lateWR : 0

    // Composite score (0-10 scale, higher = more tilt-prone)
    // Base 5, modified by indicators
    let score = 5.0
    if (postLossWR != null) {
      const overallWR = jointMatches.length > 0 ? jointWins / jointMatches.length : 0.5
      const wrDrop = overallWR - postLossWR
      score += wrDrop * 10 // +1 per 10% WR drop after losses
    }
    if (maxStreak >= 5) score += 1.5
    else if (maxStreak >= 3) score += 0.7
    score += sessionDecay * 8 // +1 per 12.5% late-session decay

    score = Math.max(0, Math.min(10, score))

    // Threat level classification
    let level = 'MINIMAL'
    if (score >= 8) level = 'CRITICAL'
    else if (score >= 6.5) level = 'ELEVATED'
    else if (score >= 4.5) level = 'GUARDED'
    else if (score >= 2.5) level = 'LOW'

    tilt_index = {
      score: Math.round(score * 10) / 10,
      level,
      max_loss_streak: maxStreak,
      post_loss_wr: postLossWR,
      session_decay: sessionDecay > 0 ? Math.round(sessionDecay * 1000) / 10 : 0,
      judgments: [
        postLossWR != null ? `Post-loss recovery rate: ${(postLossWR * 100).toFixed(0)}%` : null,
        `Maximum consecutive losses: ${maxStreak}`,
        sessionDecay > 0.05 ? `Late-session WR decline: ${(sessionDecay * 100).toFixed(0)}%` : 'No significant late-session decay detected',
        maxStreak >= 4 ? 'PATTERN: Extended loss streaks observed. Recommend session limits.' : null,
        postLossWR != null && postLossWR < 0.35 ? 'CONCERN: Severely impaired post-loss performance.' : null,
      ].filter(Boolean).slice(0, 5),
    }
  }

  // ── Field Assessments (analyst observations) ──
  // Generate 6 observation slots: 4 real (data-driven, funniest/most outlying),
  // 2 redacted (positions chosen randomly). Each observation type has 2-3 copy
  // variants selected at random for replayability.

  // Deterministic-ish random seeded by match count so it's stable per-refresh
  // but changes as new matches come in
  const seed = jointMatches.length * 7 + cellPuuids.length * 13
  function pick(arr) { return arr[(seed + arr.length) % arr.length] }
  function pickIdx(arr, offset) { return arr[(seed + offset) % arr.length] }

  const candidates = [] // { weight, obs }

  if (jointMatches.length >= 3) {
    const overallWR = jointWins / jointMatches.length

    // ─── TYPE: SYNERGY (best duo) ───
    if (duo_stats.length > 0) {
      const bestDuo = duo_stats.reduce((a, b) => a.win_rate > b.win_rate ? a : b)
      if (bestDuo.games >= 3) {
        const delta = bestDuo.win_rate - overallWR
        const note = pickIdx([
          `Joint WR: ${(bestDuo.win_rate * 100).toFixed(0)}% across ${bestDuo.games} deployments. ${(((bestDuo.win_rate - overallWR) * 100).toFixed(0))} points above cell baseline. Underlying mechanism undetermined. We assess with HIGH CONFIDENCE that separation of this pairing would degrade cell performance.`,
          `${bestDuo.games} joint deployments. WR: ${(bestDuo.win_rate * 100).toFixed(0)}%. Cell baseline: ${(overallWR * 100).toFixed(0)}%. Pairing represents the cell's most reliable operational asset. Continued co-deployment is assessed as ALMOST CERTAINLY beneficial.`,
          `${(bestDuo.win_rate * 100).toFixed(0)}% WR over ${bestDuo.games} operations — ${(((bestDuo.win_rate - overallWR) * 100).toFixed(0))} points above cell average. Pattern is consistent. Analyst assesses synergy as HIGH CONFIDENCE structural, not incidental.`,
        ], 0)
        candidates.push({ weight: Math.abs(delta) * 100 + bestDuo.games, obs: {
          severity: 'green', title: 'SYNERGY IDENTIFIED',
          subject: `${bestDuo.names[0]} + ${bestDuo.names[1]}`, note,
        }})
      }
    }

    // ─── TYPE: INCOMPATIBILITY (worst duo) ───
    const qualifiedDuos = duo_stats.filter((d) => d.games >= 3)
    if (qualifiedDuos.length > 0) {
      const worstDuo = qualifiedDuos.reduce((a, b) => a.win_rate < b.win_rate ? a : b)
      if (worstDuo.win_rate < overallWR - 0.05) {
        const delta = overallWR - worstDuo.win_rate
        const note = pickIdx([
          `Pair WR of ${(worstDuo.win_rate * 100).toFixed(0)}% falls ${(delta * 100).toFixed(0)} points below cell baseline. Champion overlap inconsistent. Reintroduction to joint operations has not produced improvement. Pattern is assessed as LIKELY structural.`,
          `${(worstDuo.win_rate * 100).toFixed(0)}% joint WR across ${worstDuo.games} deployments. Cell baseline: ${(overallWR * 100).toFixed(0)}%. Deficit is consistent across game modes. Analyst assesses compatibility concern as PROBABLE.`,
          `Joint deployment of ${worstDuo.names[0]} and ${worstDuo.names[1]} correlates with a ${(delta * 100).toFixed(0)}-point WR decline. Sample size is sufficient for moderate confidence. Co-deployment is assessed as PROBABLY inadvisable without strategic justification.`,
        ], 1)
        candidates.push({ weight: delta * 120 + worstDuo.games, obs: {
          severity: 'red', title: 'COMPATIBILITY CONCERN',
          subject: `${worstDuo.names[0]} + ${worstDuo.names[1]}`, note,
        }})
      }
    }

    // ─── TYPE: THEATER PREFERENCE (best mode) ───
    if (game_mode_breakdown.length > 0) {
      const bestMode = game_mode_breakdown.reduce((a, b) => a.win_rate > b.win_rate ? a : b)
      if (bestMode.games >= 3 && bestMode.win_rate > overallWR + 0.05) {
        const note = pickIdx([
          `Cell WR in ${bestMode.mode}: ${(bestMode.win_rate * 100).toFixed(0)}% across ${bestMode.games} deployments — ${(((bestMode.win_rate - overallWR) * 100).toFixed(0))} points above cell baseline. Theater match is assessed as PROBABLY favorable. Increased allocation is warranted.`,
          `${(bestMode.win_rate * 100).toFixed(0)}% WR in ${bestMode.mode} (${bestMode.games} operations). Performance advantage over cell baseline is consistent. Analyst assesses this theater as the cell's operational optimum with HIGH CONFIDENCE.`,
          `${bestMode.games} ${bestMode.mode} deployments. WR: ${(bestMode.win_rate * 100).toFixed(0)}%. Outperforms cell average by ${(((bestMode.win_rate - overallWR) * 100).toFixed(0))} points. Theater selection is assessed as a material variable in cell performance.`,
        ], 2)
        candidates.push({ weight: (bestMode.win_rate - overallWR) * 80 + bestMode.games * 0.5, obs: {
          severity: 'blue', title: 'THEATER PREFERENCE',
          subject: `${bestMode.mode} operations`, note,
        }})
      }
    }

    // ─── TYPE: THEATER VULNERABILITY (worst mode) ───
    const qualifiedModes = game_mode_breakdown.filter((m) => m.games >= 3)
    if (qualifiedModes.length > 0) {
      const worstMode = qualifiedModes.reduce((a, b) => a.win_rate < b.win_rate ? a : b)
      if (worstMode.win_rate < overallWR - 0.08) {
        const note = pickIdx([
          `Cell WR in ${worstMode.mode}: ${(worstMode.win_rate * 100).toFixed(0)}% across ${worstMode.games} deployments. Deficit of ${(((overallWR - worstMode.win_rate) * 100).toFixed(0))} points relative to cell baseline. Performance does not improve with additional exposure. Theater reassignment is assessed as PROBABLY advisable.`,
          `${(worstMode.win_rate * 100).toFixed(0)}% WR in ${worstMode.mode} (${worstMode.games} operations). ${(((overallWR - worstMode.win_rate) * 100).toFixed(0))}-point underperformance versus cell average. Pattern is stable and consistent. Analyst assesses continued deployment in this theater as LIKELY counterproductive.`,
          `${worstMode.games} operations in ${worstMode.mode}. WR: ${(worstMode.win_rate * 100).toFixed(0)}%. The cell's performance floor in this theater remains well below acceptable parameters. No corrective trend observed across the sample. Tactical reallocation is assessed as PROBABLY overdue.`,
        ], 3)
        candidates.push({ weight: (overallWR - worstMode.win_rate) * 100 + worstMode.games * 0.5, obs: {
          severity: 'red', title: 'THEATER VULNERABILITY',
          subject: `${worstMode.mode} operations`, note,
        }})
      }
    }

    // ─── TYPE: MVP OPERATOR (highest WR) ───
    const qualified = operator_stats.filter((o) => o.games >= 3)
    if (qualified.length > 0) {
      const mvp = qualified.reduce((a, b) => a.win_rate > b.win_rate ? a : b)
      if (mvp.win_rate > overallWR + 0.03) {
        const wrWithout = mvp.wr_without != null ? (mvp.wr_without * 100).toFixed(0) + '%' : 'INSUFFICIENT DATA'
        const note = pickIdx([
          `Operator ${mvp.name} records ${(mvp.win_rate * 100).toFixed(0)}% WR across ${mvp.games} joint deployments. Cell WR in their absence: ${wrWithout}. Contribution to cell performance is assessed as HIGHLY LIKELY significant.`,
          `${mvp.name}: ${(mvp.win_rate * 100).toFixed(0)}% joint WR. Cell WR without this operator: ${wrWithout}. Performance differential is consistent across game modes. Assessed as HIGH-VALUE operational asset with HIGH CONFIDENCE.`,
          `Joint WR with ${mvp.name} present: ${(mvp.win_rate * 100).toFixed(0)}%. Without: ${wrWithout}. Correlation between this operator's deployment and favorable outcomes is assessed as PROBABLY causal, not incidental.`,
        ], 4)
        candidates.push({ weight: (mvp.win_rate - overallWR) * 90 + mvp.games, obs: {
          severity: 'green', title: 'HIGH-VALUE OPERATOR',
          subject: mvp.name, note,
        }})
      }
    }

    // ─── TYPE: ANCHOR / LIABILITY (lowest WR) ───
    if (qualified.length > 0) {
      const anchor = qualified.reduce((a, b) => a.win_rate < b.win_rate ? a : b)
      if (anchor.win_rate < overallWR - 0.05) {
        const note = pickIdx([
          `Operator ${anchor.name} records ${(anchor.win_rate * 100).toFixed(0)}% WR across ${anchor.games} joint deployments — ${((overallWR - anchor.win_rate) * 100).toFixed(0)} points below cell baseline. Cell WR in their absence: ${anchor.wr_without != null ? (anchor.wr_without * 100).toFixed(0) + '%' : 'INSUFFICIENT DATA'}. Performance deficit is assessed as PROBABLY structural.`,
          `${anchor.name}: ${(anchor.win_rate * 100).toFixed(0)}% joint WR. Cell baseline: ${(overallWR * 100).toFixed(0)}%. Deficit of ${((overallWR - anchor.win_rate) * 100).toFixed(0)} points persists across recorded sample. No mitigating pattern identified.`,
          `Cell outcomes degrade measurably when ${anchor.name} is deployed. ${(anchor.win_rate * 100).toFixed(0)}% WR across ${anchor.games} operations — ${((overallWR - anchor.win_rate) * 100).toFixed(0)} points below the cell norm. Whether the deficit stems from individual performance or compositional mismatch is UNDETERMINED.`,
        ], 5)
        candidates.push({ weight: (overallWR - anchor.win_rate) * 100 + anchor.games, obs: {
          severity: 'red', title: 'PERFORMANCE DEFICIT',
          subject: anchor.name, note,
        }})
      }
    }

    // ─── TYPE: SESSION DISCIPLINE ───
    if (tilt_index && tilt_index.score >= 5.5) {
      const maxLosses = tilt_index.judgments?.[1] ?? ''
      const note = pickIdx([
        `Cell averages ${jointMatches.length > 5 ? Math.round(jointMatches.length / 7) : '2-3'} joint deployments per active session. Post-loss queue frequency shows no reduction after consecutive defeats. Session duration management is assessed as PROBABLY insufficient for sustained performance.`,
        `${maxLosses ? maxLosses + '. ' : ''}No evidence of voluntary session termination following adverse streaks in the recorded sample. Analyst assesses session pacing discipline as UNLIKELY to be a cell priority. Operational tempo: unregulated.`,
        `Joint deployment cadence remains constant regardless of outcome trajectory. Post-loss cooldown periods are not observed in the dataset. Session management is assessed with MODERATE CONFIDENCE as a contributing factor to performance variance.`,
      ], 6)
      candidates.push({ weight: tilt_index.score * 5, obs: {
        severity: 'amber', title: 'SESSION DISCIPLINE',
        subject: 'Deployment cadence analysis', note,
      }})
    }

    // ─── TYPE: ONE-TRICK EXPOSURE ───
    for (const op of operator_stats) {
      if (op.top_champions.length > 0 && op.top_champions[0].games >= 5) {
        const topChamp = op.top_champions[0]
        const pickRate = op.games > 0 ? topChamp.games / op.games : 0
        if (pickRate >= 0.55) {
          const note = pickIdx([
            `${op.name} fields ${topChamp.name} in ${(pickRate * 100).toFixed(0)}% of recorded joint deployments. Champion pool depth is assessed as LOW. Ban-phase exposure is assessed as ALMOST CERTAINLY a recurring vulnerability.`,
            `Pick rate for ${topChamp.name} by ${op.name}: ${(pickRate * 100).toFixed(0)}% across joint operations. Operator flexibility is assessed as LIMITED. Adversarial ban pressure is LIKELY to degrade this operator's effectiveness materially.`,
          `${topChamp.name} accounts for ${(pickRate * 100).toFixed(0)}% of ${op.name}'s joint deployment selections. Fallback options in the operator's record are sparse and underperforming. A targeted ban against this champion would ALMOST CERTAINLY force a suboptimal pivot.`,
          ], 7)
          candidates.push({ weight: pickRate * 40, obs: {
            severity: 'amber', title: 'ONE-TRICK EXPOSURE',
            subject: `${op.name} / ${topChamp.name}`, note,
          }})
          break // Only one one-trick obs
        }
      }
    }

    // ─── TYPE: THEATER DIVERGENCE (different champ pools per map) ───
    for (const op of operator_stats) {
      if (!op.theaters || op.games < 5) continue
      const activeTheaters = THEATER_ORDER.filter(t => op.theaters[t]?.games >= 3)
      if (activeTheaters.length >= 2) {
        const champSets = activeTheaters.map(t =>
          new Set(op.theaters[t].top_champions.map(c => c.name))
        )
        // Jaccard similarity between all theater pairs
        let minSim = 1
        for (let i = 0; i < champSets.length; i++) {
          for (let j = i + 1; j < champSets.length; j++) {
            const intersection = [...champSets[i]].filter(c => champSets[j].has(c)).length
            const union = new Set([...champSets[i], ...champSets[j]]).size
            if (union > 0) minSim = Math.min(minSim, intersection / union)
          }
        }
        if (minSim <= 0.15) {
          const theaterSummary = activeTheaters.map(t => {
            const top = op.theaters[t].top_champions[0]
            return `${t}: ${top?.name || 'N/A'}`
          }).join('; ')
          const note = pickIdx([
            `${op.name} fields materially different champion pools across theaters. ${theaterSummary}. Cross-theater overlap is assessed as NEGLIGIBLE. Operator appears to maintain separate selection doctrines per map environment.`,
            `Champion selection by ${op.name} diverges sharply between theaters. ${theaterSummary}. Overlap coefficient: ${(minSim * 100).toFixed(0)}%. Analyst assesses this as a DELIBERATE adaptation to map geometry rather than incidental variance.`,
            `Comparative review of ${op.name}'s deployment records reveals theater-isolated selection patterns. ${theaterSummary}. Whether this reflects tactical sophistication or fundamentally different comfort zones remains UNDETERMINED.`,
          ], 13)
          candidates.push({ weight: (1 - minSim) * 50 + op.games * 0.5, obs: {
            severity: 'blue', title: 'THEATER DIVERGENCE',
            subject: `${op.name} — cross-map pool split`, note,
          }})
          break
        }
      }
    }

    // ─── TYPE: THEATER SPECIALIST (one map dominates) ───
    for (const op of operator_stats) {
      if (!op.theaters || op.games < 8) continue
      for (const t of THEATER_ORDER) {
        const td = op.theaters[t]
        if (!td || td.games < 5) continue
        const concentration = td.games / op.games
        if (concentration >= 0.80) {
          const note = pickIdx([
            `${(concentration * 100).toFixed(0)}% of ${op.name}'s joint deployments occur on ${t}. ${td.games} of ${op.games} recorded operations confined to a single theater. Cross-map versatility is assessed as UNTESTED.`,
            `${op.name} deploys almost exclusively on ${t} (${td.games}/${op.games} operations). Whether this reflects preference, scheduling, or queue availability is undetermined. Operational range outside this theater: UNVERIFIED.`,
            `${op.name}'s operational footprint is almost entirely confined to ${t}. ${td.games} deployments on-theater versus ${op.games - td.games} off-theater. The cell's exposure to this operator in other map environments is classified as MINIMAL.`,
          ], 14)
          candidates.push({ weight: concentration * 30 + td.games * 0.5, obs: {
            severity: 'amber', title: 'THEATER SPECIALIST',
            subject: `${op.name} — ${t}`, note,
          }})
          break
        }
      }
    }

    // ─── TYPE: CROSS-THEATER CONSISTENCY (same champs everywhere) ───
    for (const op of operator_stats) {
      if (!op.theaters || op.games < 10) continue
      const activeTheaters = THEATER_ORDER.filter(t => op.theaters[t]?.games >= 3)
      if (activeTheaters.length >= 2) {
        const champSets = activeTheaters.map(t =>
          new Set(op.theaters[t].top_champions.map(c => c.name))
        )
        let maxSim = 0
        for (let i = 0; i < champSets.length; i++) {
          for (let j = i + 1; j < champSets.length; j++) {
            const intersection = [...champSets[i]].filter(c => champSets[j].has(c)).length
            const union = new Set([...champSets[i], ...champSets[j]]).size
            if (union > 0) maxSim = Math.max(maxSim, intersection / union)
          }
        }
        if (maxSim >= 0.60) {
          const sharedChamps = [...champSets[0]].filter(c => champSets.every(s => s.has(c)))
          const sharedList = sharedChamps.length > 0 ? sharedChamps.join(', ') : 'overlapping selections'
          const note = pickIdx([
            `${op.name} maintains a consistent champion pool across ${activeTheaters.length} active theaters. Core selections (${sharedList}) appear regardless of map environment. Operator's selection doctrine is assessed as THEATER-AGNOSTIC.`,
            `Cross-theater analysis of ${op.name}'s deployments reveals high pool overlap (${(maxSim * 100).toFixed(0)}% similarity). ${sharedList} fielded across map types. This consistency is UNUSUAL — most operators adapt selections to map geometry.`,
            `${op.name}'s selection profile remains effectively unchanged across map types. Shared picks include ${sharedList}. Whether this rigidity is a strength (mastery) or liability (inflexibility) depends on team composition. Verdict: INCONCLUSIVE.`,
          ], 15)
          candidates.push({ weight: maxSim * 35 + op.games * 0.3, obs: {
            severity: 'blue', title: 'CROSS-THEATER CONSISTENCY',
            subject: `${op.name} — uniform pool`, note,
          }})
          break
        }
      }
    }

    // ─── TYPE: WIN STREAK CEILING ───
    let maxWinStreak = 0, currentWinStreak = 0
    const chrono = [...jointMatches].sort((a, b) => (a.info?.gameEndTimestamp ?? 0) - (b.info?.gameEndTimestamp ?? 0))
    for (const m of chrono) {
      const cellTeam = getSameTeamCellGroup(m.info?.participants ?? [], puuidSet)
      if (cellTeam && cellTeam[0].win) { currentWinStreak++; maxWinStreak = Math.max(maxWinStreak, currentWinStreak) }
      else currentWinStreak = 0
    }
    if (maxWinStreak >= 4) {
      const note = pickIdx([
        `Maximum consecutive wins on record: ${maxWinStreak} operations. No streak exceeding this threshold has been observed. Whether the limiting factor is performance variance or matchmaking pressure has not been determined.`,
        `${maxWinStreak}-game win streak recorded. Cell has not surpassed this operational ceiling within the current dataset. Contributing factors — opponent calibration, fatigue, or composition degradation — are assessed as PROBABLY compounding over extended sessions.`,
        `Longest observed winning sequence: ${maxWinStreak} consecutive operations. The cell has reached but not exceeded this threshold. Analyst notes that matchmaking recalibration following sustained success is a PROBABLE contributing factor.`,
      ], 8)
      candidates.push({ weight: maxWinStreak * 6, obs: {
        severity: 'blue', title: 'OPERATIONAL CEILING',
        subject: `${maxWinStreak}-game streak maximum`, note,
      }})
    }

    // ─── TYPE: LATE-NIGHT OPERATOR ───
    const lateNightGames = jointMatches.filter((m) => {
      const ts = m.info?.gameEndTimestamp ?? m.info?.gameStartTimestamp
      if (!ts) return false
      const hour = new Date(ts).getUTCHours()
      return hour >= 5 && hour < 10 // ~midnight–5am EST in UTC
    })
    if (lateNightGames.length >= 3) {
      const lateWins = lateNightGames.filter((m) => {
        const cellTeam = getSameTeamCellGroup(m.info?.participants ?? [], puuidSet)
        return cellTeam && cellTeam[0].win
      }).length
      const lateWR = lateWins / lateNightGames.length
      const note = pickIdx([
        `${lateNightGames.length} deployments logged between 0000 and 0500 local. WR: ${(lateWR * 100).toFixed(0)}%. ${lateWR < overallWR ? `Performance falls ${(((overallWR - lateWR) * 100).toFixed(0))} points below cell baseline during this window. Degradation is assessed as PROBABLY fatigue-related.` : `Performance during this window meets or exceeds cell baseline. Contributing factors are undetermined. Surveillance continues.`}`,
        `Late-window activity: ${lateNightGames.length} joint operations between 0000 and 0500 hours. WR: ${(lateWR * 100).toFixed(0)}%. ${lateWR < 0.45 ? 'Outcome data for this period is unfavorable. Operational judgment during late-window sessions is assessed as PROBABLY impaired.' : 'Late-window performance is within acceptable parameters. No corrective assessment warranted at this time.'}`,
        `${lateNightGames.length} after-hours deployments on file (0000–0500). WR during this window: ${(lateWR * 100).toFixed(0)}%. ${lateWR < overallWR ? `A ${(((overallWR - lateWR) * 100).toFixed(0))}-point gap versus cell baseline suggests cognitive or coordination degradation. Analyst assessment: fatigue is PROBABLY a factor.` : 'Performance is stable relative to daytime operations. No evidence of impairment detected in this sample.'}`,
      ], 9)
      candidates.push({ weight: Math.abs(lateWR - overallWR) * 60 + lateNightGames.length, obs: {
        severity: lateWR < overallWR - 0.1 ? 'amber' : 'blue',
        title: 'TEMPORAL ANOMALY',
        subject: 'Late-night deployment pattern', note,
      }})
    }

    // ─── TYPE: WEEKEND WARRIOR ───
    const weekendGames = jointMatches.filter((m) => {
      const ts = m.info?.gameEndTimestamp ?? m.info?.gameStartTimestamp
      if (!ts) return false
      const day = new Date(ts).getUTCDay()
      return day === 0 || day === 6 // Saturday/Sunday in UTC
    })
    if (weekendGames.length >= 4) {
      const weekendWins = weekendGames.filter((m) => {
        const cellTeam = getSameTeamCellGroup(m.info?.participants ?? [], puuidSet)
        return cellTeam && cellTeam[0].win
      }).length
      const weekendWR = weekendWins / weekendGames.length
      const weekdayGames = jointMatches.length - weekendGames.length
      const weekdayWR = weekdayGames > 0 ? (jointWins - weekendWins) / weekdayGames : null
      if (weekdayWR != null && Math.abs(weekendWR - weekdayWR) > 0.08) {
        const better = weekendWR > weekdayWR ? 'weekends' : 'weekdays'
        const note = pickIdx([
          `Weekend WR: ${(weekendWR * 100).toFixed(0)}%. Weekday WR: ${(weekdayWR * 100).toFixed(0)}%. Cell performs measurably better on ${better}. ${better === 'weekends' ? 'Contributing factors — session length, roster availability, or fatigue reduction — have not been isolated.' : 'Destabilizing variables specific to the weekend window have not been identified. Pattern warrants continued monitoring.'}`,
          `${(Math.abs(weekendWR - weekdayWR) * 100).toFixed(0)}-point WR gap between weekends and weekdays. Variance is assessed as PROBABLY not incidental. Cell composition or scheduling factors are LIKELY contributors.`,
          `Weekend operations: ${(weekendWR * 100).toFixed(0)}% WR (${weekendGames.length} games). Weekday: ${(weekdayWR * 100).toFixed(0)}%. The cell's ${better} advantage has held across the reporting window. Roster availability and session length are assessed as PROBABLE variables.`,
        ], 10)
        candidates.push({ weight: Math.abs(weekendWR - weekdayWR) * 80, obs: {
          severity: 'blue', title: 'TEMPORAL VARIANCE',
          subject: `${better} superiority`, note,
        }})
      }
    }

    // ─── TYPE: COMPOSITION LOCK (always plays same champ combo) ───
    if (champion_synergies.length > 0) {
      const topCombo = champion_synergies[0]
      if (topCombo.games >= 4) {
        const note = pickIdx([
          `${topCombo.champions.join(' + ')} deployed ${topCombo.games} times. WR: ${(topCombo.win_rate * 100).toFixed(0)}%. Composition recurrence suggests a default selection pattern. ${topCombo.win_rate > overallWR ? 'Outcomes support continued use. Analyst has no corrective assessment.' : 'Outcomes fall below cell baseline. Composition review is assessed as PROBABLY warranted.'}`,
          `Recorded ${topCombo.games} instances of ${topCombo.champions.join('/')} composition. WR: ${(topCombo.win_rate * 100).toFixed(0)}%. ${topCombo.win_rate > 0.55 ? 'Performance at this frequency is above threshold. Pattern is assessed as LOW risk.' : 'Performance at this frequency is below expectation. Composition flexibility is assessed as LIKELY a corrective lever.'}`,
          `The ${topCombo.champions.join(' / ')} pairing has been fielded ${topCombo.games} times — the cell's most recurring composition. WR: ${(topCombo.win_rate * 100).toFixed(0)}%. ${topCombo.win_rate > overallWR ? 'Results justify the repetition. Continued use is assessed as PROBABLY optimal.' : 'Results do not support the frequency of deployment. Composition inertia is assessed as a PROBABLE liability.'}`,
        ], 11)
        candidates.push({ weight: topCombo.games * 3 + Math.abs(topCombo.win_rate - overallWR) * 50, obs: {
          severity: topCombo.win_rate > overallWR ? 'green' : 'amber',
          title: 'COMPOSITION LOCK',
          subject: topCombo.champions.join(' + '), note,
        }})
      }
    }

    // ─── TYPE: FLAWLESS OPERATION (any game with 0 deaths for all cell members) ───
    const flawless = jointMatches.filter((m) => {
      const cellTeam = getSameTeamCellGroup(m.info?.participants ?? [], puuidSet)
      return cellTeam && cellTeam.every((p) => p.deaths === 0 && p.win)
    })
    if (flawless.length > 0) {
      const note = pickIdx([
        `${flawless.length} deployment(s) on record in which all cell operators registered zero deaths and secured a victory. Execution in these instances exceeded standard performance benchmarks. Mechanism of consistency in non-flawless matches is undetermined.`,
        `Zero-casualty wins recorded: ${flawless.length}. All cell operators survived all engagements in these operations. Whether this reflects opponent quality, cell coordination, or situational variance has not been isolated. Pattern is noted for continued observation.`,
        `${flawless.length} operation(s) concluded with a full sweep — victory secured, zero cell casualties recorded. These represent the cell's peak operational execution. Replication conditions have not been identified with confidence.`,
      ], 12)
      candidates.push({ weight: flawless.length * 20 + 10, obs: {
        severity: 'green', title: 'FLAWLESS OPERATION',
        subject: `${flawless.length} zero-death deployment(s)`, note,
      }})
    }
  }

  // Sort candidates by weight (most outlying first), take top 4
  candidates.sort((a, b) => b.weight - a.weight)
  const topObs = candidates.slice(0, 4).map((c) => c.obs)

  // Pad to 4 if insufficient data
  while (topObs.length < 4) {
    topObs.push({
      severity: 'blue',
      title: 'PATTERN ANALYSIS',
      subject: 'General cell behavior',
      note: jointMatches.length < 5
        ? 'INSUFFICIENT FIELD DATA. Additional joint deployments required for pattern analysis.'
        : 'No anomalous patterns detected in current dataset. Continued surveillance recommended.',
    })
  }

  // Pick 1-3 random positions (0-5) for redacted slots
  // Count varies by seed so it feels different each time data changes
  const redactedCount_target = (seed % 3) + 1 // 1, 2, or 3
  const redactedPositions = new Set()
  redactedPositions.add(seed % 6)
  if (redactedCount_target >= 2) redactedPositions.add((seed * 3 + 2) % 6)
  if (redactedCount_target >= 3) redactedPositions.add((seed * 5 + 4) % 6)
  // Ensure we hit the target count with distinct positions
  let attempt = 0
  while (redactedPositions.size < redactedCount_target) {
    redactedPositions.add((seed * 7 + attempt++) % 6)
  }

  // Build final 6-slot array
  const assessments = []
  let realIdx = 0
  let redactedCount = 0
  for (let i = 0; i < 6; i++) {
    const code = `OBS-0${i + 1}`
    if (redactedPositions.has(i)) {
      assessments.push({ code, severity: 'black', title: null, subject: null, note: null, redacted: true, redactedVariant: redactedCount++ })
    } else {
      if (realIdx < topObs.length) {
        assessments.push({ ...topObs[realIdx], code })
        realIdx++
      } else {
        assessments.push({
          code, severity: 'blue', title: 'CONTINUED SURVEILLANCE',
          subject: 'No additional anomalies',
          note: 'All remaining patterns within expected parameters. Analyst has nothing further to report at this time.',
        })
      }
    }
  }

  return {
    total_games: matches.length,
    games_together: jointMatches.length,
    games_apart: soloMatches.length,
    win_rate_together: jointMatches.length > 0 ? jointWins / jointMatches.length : null,
    win_rate_apart: soloMatches.length > 0 ? soloWins / soloMatches.length : null,
    champion_synergies,
    game_mode_breakdown,
    operator_stats,
    duo_stats,
    heatmap,
    recent_form,
    tilt_index,
    assessments,
  }
}

module.exports = { computeCellStats }
