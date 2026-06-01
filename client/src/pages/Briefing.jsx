import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { MOCK_STATS, isMockCell } from '../lib/mockData'
import AuthOverlay from '../components/AuthOverlay'
import CellOverlay from '../components/CellOverlay'
import Footer from '../components/Footer'

/* ── Redacted placeholder helpers ── */
function R({ w, h = 12 }) {
  return (
    <span
      className="redacted-inline"
      style={{ width: w, height: h, padding: 0, verticalAlign: 'middle' }}
    />
  )
}

function RedactedBar({ w = '100%', h = 12 }) {
  return <div className="redacted-bar" style={{ width: w, height: h }} />
}

/* ── Formatting helpers ── */
function pct(n) {
  if (n == null) return '—'
  // If already a 0-100 number (from the mockup shape), don't multiply
  const val = n <= 1 ? n * 100 : n
  return `${val.toFixed(1)}%`
}

// Accepts 0-1 fraction
function wrClass(rate) {
  if (rate == null) return ''
  const r = rate <= 1 ? rate : rate / 100
  if (r >= 0.62) return 'wr-great'
  if (r > 0.50) return 'wr-high'
  if (r === 0.50) return 'wr-neutral'
  if (r >= 0.40) return 'wr-mid'
  return 'wr-low'
}

function modeBarClass(rate) {
  if (rate == null) return 'bar-neutral'
  const r = rate <= 1 ? rate : rate / 100
  if (r >= 0.62) return 'bar-great'
  if (r > 0.50) return 'bar-high'
  if (r === 0.50) return 'bar-neutral'
  if (r >= 0.40) return 'bar-mid'
  return 'bar-low'
}

function modeWrClass(rate) {
  if (rate == null) return 'wr-neutral'
  const r = rate <= 1 ? rate : rate / 100
  if (r >= 0.62) return 'wr-great'
  if (r > 0.50) return 'wr-high'
  if (r === 0.50) return 'wr-neutral'
  if (r >= 0.40) return 'wr-mid'
  return 'wr-low'
}

function matrixCellClass(wr, games) {
  if (wr === null) return 'matrix-self'
  if (games < 5) return 'matrix-empty'
  const r = wr <= 1 ? wr * 100 : wr
  if (r < 48) return 'wr-low'
  if (r < 54) return 'wr-mid'
  if (r < 62) return 'wr-high'
  return 'wr-great'
}

/* ── Mode name normalization ── */
const STAPLE_MODES = ['Ranked', 'Ranked Flex', 'Normal', 'ARAM', 'ARAM Mayhem', 'Arena']

function normModeName(raw) {
  // stats.js now resolves mode names server-side using queueId,
  // so the value is already human-readable (e.g., "Ranked", "ARAM Mayhem")
  // This fallback handles any raw gameMode strings that slip through
  const map = {
    CLASSIC: 'Normal',
    RANKED: 'Ranked',
    RANKED_FLEX: 'Ranked Flex',
    ARAM: 'ARAM',
    CHERRY: 'Arena',
    NEXUSBLITZ: 'Nexus Blitz',
    URF: 'URF',
    ARURF: 'ARURF',
    ULTBOOK: 'Ultimate Spellbook',
    ODIN: 'Dominion',
    ONEFORALL: 'One for All',
  }
  return map[raw?.toUpperCase?.()] || raw
}

/* ── Champion pool classification ── */
function classifyPool(topChamps, totalGames) {
  if (!topChamps || totalGames < 5) return { label: 'INCONCLUSIVE', badgeClass: 'badge-blue' }
  const top = topChamps[0]
  if (!top) return { label: 'INCONCLUSIVE', badgeClass: 'badge-blue' }
  const topPct = top.games / totalGames
  if (topPct >= 0.70) return { label: 'ONE-TRICK', badgeClass: 'badge-red' }
  const top2Pct = (topChamps[0]?.games || 0) + (topChamps[1]?.games || 0)
  if (top2Pct / totalGames >= 0.70) return { label: 'SPECIALIST', badgeClass: 'badge-amber' }
  if (topPct >= 0.50) return { label: 'NARROW', badgeClass: 'badge-amber' }
  if (topChamps.length >= 5 && topPct < 0.30) return { label: 'CHAOTIC', badgeClass: 'badge-blue' }
  return { label: 'ROLE-LOCKED', badgeClass: 'badge-amber' }
}

const THEATERS = ["SUMMONER'S RIFT", 'HOWLING ABYSS', 'RINGS OF WRATH']

function pickShade(pct) {
  if (pct >= 50) return 's-1'
  if (pct >= 35) return 's-2'
  if (pct >= 20) return 's-3'
  if (pct >= 10) return 's-4'
  return 's-5'
}

function renderPoolBar(champs, totalGames, uniqueCount) {
  const shownChamps = champs.slice(0, 5)
  const hiddenCount = (uniqueCount || champs.length) - shownChamps.length
  if (totalGames === 0 || shownChamps.length === 0) {
    return <div className="pool-seg s-empty" style={{ width: '100%' }}>NO FIELD DATA</div>
  }
  const rawPcts = shownChamps.map(c => (c.games / totalGames) * 100)
  const pcts = rawPcts.map(p => Math.max(Math.round(p), 1))
  const shownSum = pcts.reduce((a, b) => a + b, 0)
  const remainder = Math.max(0, 100 - shownSum)
  const hasRemainder = remainder > 0 && hiddenCount > 0
  if (!hasRemainder) {
    const scale = 100 / shownSum
    pcts.forEach((_, i) => { pcts[i] = Math.round(pcts[i] * scale) })
    const adj = 100 - pcts.reduce((a, b) => a + b, 0)
    if (adj !== 0) pcts[0] += adj
  }
  return <>
    {shownChamps.map((c, idx) => {
      const segPct = Math.round((c.games / totalGames) * 100)
      const shade = pickShade(segPct)
      const wr = Math.round((c.win_rate ?? 0) * 100)
      const tooltip = `${c.name} — ${segPct}% pick rate // ${wr}% WR (${c.wins ?? 0}W-${c.games - (c.wins ?? 0)}L)`
      return (
        <div key={c.name} className={`pool-seg ${shade}`}
          style={{ width: `${pcts[idx]}%` }} data-tooltip={tooltip}><span className="pool-seg-label">{c.name.toUpperCase()}</span></div>
      )
    })}
    {hasRemainder && (
      <div className="pool-seg s-empty" style={{ width: `${remainder}%` }}>
        {hiddenCount > 0 ? `+${hiddenCount} more` : ''}
      </div>
    )}
  </>
}

/* ── Tilt Index segment coloring ── */
function tiltSegClass(idx, score) {
  if (idx >= Math.round(score)) return ''
  return score >= 7 ? 'on-red' : 'on-amber'
}

/* ── Link Analysis SVG ── */
// 5-tier edge color matching Game Mode Breakdown
function linkEdgeColor(wrPct) {
  if (wrPct >= 62) return 'var(--green)'
  if (wrPct > 50) return '#16a34a'
  if (wrPct >= 40) return 'var(--red-mid)'
  return 'var(--red)'
}

// CIA-style bond classification
function classifyBond(games, wrPct) {
  if (games === 0) return { label: 'UNLINKED', color: 'var(--muted-light)' }
  if (games < 5)   return { label: 'EMERGING', color: 'var(--muted)' }
  if (wrPct >= 58 && games >= 15) return { label: 'CORE', color: 'var(--green)' }
  if (wrPct >= 50) return { label: 'STABLE', color: 'var(--muted)' }
  if (wrPct >= 42) return { label: 'VOLATILE', color: 'var(--amber)' }
  return { label: 'STRAINED', color: 'var(--red)' }
}

function buildLinkSVG(ops, duoStats) {
  if (!ops || ops.length < 2) return null

  const ACTIVE_THRESHOLD = 5
  const active = ops.filter(op => op.games >= ACTIVE_THRESHOLD)
  const inactive = ops.filter(op => op.games < ACTIVE_THRESHOLD)

  const n = Math.min(active.length, 7)
  if (n < 1) return null

  const cx = 200, cy = 175
  const r = 110

  // Position active nodes — special-case small node counts
  let positions
  if (n === 1) {
    positions = [{ x: cx, y: cy }]
  } else if (n === 2) {
    positions = [{ x: cx - 120, y: cy }, { x: cx + 120, y: cy }]
  } else {
    positions = active.slice(0, n).map((_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
    })
  }

  const inactivePositions = inactive.map((_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(inactive.length, 1) + Math.PI / 6
    return {
      x: cx + (r + 55) * Math.cos(angle),
      y: cy + (r + 55) * Math.sin(angle),
    }
  })

  // Build a lookup from duo_stats for quick pair matching
  const duoLookup = new Map()
  if (duoStats) {
    duoStats.forEach(d => {
      const k1 = [d.puuids?.[0], d.puuids?.[1]].sort().join('|')
      const k2 = [d.names?.[0], d.names?.[1]].sort().join('|')
      duoLookup.set(k1, d)
      duoLookup.set(k2, d)
    })
  }

  // Complete graph — every pair of active operators gets an edge
  const edges = []
  const maxGames = duoStats ? Math.max(...duoStats.map(d => d.games), 1) : 1
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = active[i], b = active[j]
      const keyPuuid = [a.puuid, b.puuid].sort().join('|')
      const keyName = [a.name, b.name].sort().join('|')
      const duo = duoLookup.get(keyPuuid) || duoLookup.get(keyName)

      if (duo && duo.games > 0) {
        const wr = duo.win_rate <= 1 ? duo.win_rate * 100 : duo.win_rate
        const wrRound = Math.round(wr)
        const stroke = wrRound === 50 ? 'var(--muted)' : linkEdgeColor(wr)
        const bond = classifyBond(duo.games, wrRound)
        // Thickness: 1px base + up to 2.5px scaled by game share
        const width = 1 + (duo.games / maxGames) * 2.5
        edges.push({ i1: i, i2: j, stroke, wr: wrRound, games: duo.games,
          dashed: duo.games < 10, width, bond, noData: false })
      } else {
        const bond = classifyBond(0, 0)
        edges.push({ i1: i, i2: j, stroke: 'var(--muted-light)', wr: null,
          games: 0, dashed: true, width: 0.5, bond, noData: true })
      }
    }
  }

  return { active, inactive, positions, inactivePositions, edges, n, cx, cy, r }
}

export default function Briefing() {
  const { user, activeCell } = useAuth()
  const [stats, setStats] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const cellId = activeCell?.id
  const hasCell = !!(user && activeCell)
  const hasData = stats && stats.games_together > 0

  const fetchStats = useCallback(async () => {
    if (!cellId) return
    setLoading(true)
    try {
      if (isMockCell(cellId)) {
        setStats(MOCK_STATS)
      } else {
        const data = await api.getCellStats(cellId)
        setStats(data)
      }
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [cellId])

  useEffect(() => {
    if (hasCell) fetchStats()
    else setStats(null)
  }, [hasCell, fetchStats])

  async function handleSync() {
    if (!cellId || syncing) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await api.ingestMatches(cellId)
      setSyncResult(result)
      await fetchStats()
    } catch (err) {
      setSyncResult({ status: 'ERROR', message: err.message })
    } finally {
      setSyncing(false)
    }
  }

  // Determine the current user's name from operator_stats by matching user metadata
  const currentUserName = user?.user_metadata?.riot_game_name || user?.email?.split('@')[0] || ''

  // Split game modes into staple / rotating
  // Always show all staple modes even if no data (0 games)
  const { stapleModes, rotatingModes } = useMemo(() => {
    if (!hasData || !stats.game_mode_breakdown) return { stapleModes: [], rotatingModes: [] }
    const dataByName = new Map()
    const rotating = []
    stats.game_mode_breakdown.forEach(m => {
      const name = normModeName(m.mode)
      if (STAPLE_MODES.includes(name)) dataByName.set(name, { ...m, name })
      else rotating.push({ ...m, name })
    })
    const staple = STAPLE_MODES.map(name =>
      dataByName.get(name) || { mode: name, name, games: 0, win_rate: null }
    )
    return { stapleModes: staple, rotatingModes: rotating }
  }, [hasData, stats])

  // Build duo matrix from duo_stats + operator_stats
  const matrixData = useMemo(() => {
    if (!hasData || !stats.operator_stats) return null
    const ops = stats.operator_stats
    const n = ops.length
    // Build lookup from duo_stats — keyed by PUUID (name-change-proof), name fallback
    const lookup = {}
    if (stats.duo_stats) {
      stats.duo_stats.forEach(d => {
        const wr = d.win_rate <= 1 ? d.win_rate * 100 : d.win_rate
        const val = { wr, games: d.games }
        // PUUID keys (permanent — survives name changes)
        if (d.puuids?.[0] && d.puuids?.[1]) {
          lookup[`${d.puuids[0]}|${d.puuids[1]}`] = val
          lookup[`${d.puuids[1]}|${d.puuids[0]}`] = val
        }
        // Name keys (fallback for display-only / mock data)
        const n0 = d.names?.[0], n1 = d.names?.[1]
        if (n0 && n1) {
          lookup[`${n0}|${n1}`] = val
          lookup[`${n1}|${n0}`] = val
        }
      })
    }
    const codes = ops.map(op => op.name.slice(0, 3).toUpperCase())
    return { ops, codes, n, lookup }
  }, [hasData, stats])

  // Build heatmap — API returns UTC [day][hour] counts, day 0 = Sunday
  // Shift to user's local timezone, then reorder to MON-first
  const heatmapData = useMemo(() => {
    if (!hasData || !stats.heatmap) return null
    const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

    // Shift UTC heatmap to local timezone
    const offsetHours = Math.round(-new Date().getTimezoneOffset() / 60)
    const localMap = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (let utcDay = 0; utcDay < 7; utcDay++) {
      for (let utcHour = 0; utcHour < 24; utcHour++) {
        const count = stats.heatmap[utcDay]?.[utcHour] || 0
        if (count === 0) continue
        const shifted = utcHour + offsetHours
        const localHour = ((shifted % 24) + 24) % 24
        const dayShift = shifted < 0 ? -1 : shifted >= 24 ? 1 : 0
        const localDay = ((utcDay + dayShift) % 7 + 7) % 7
        localMap[localDay][localHour] += count
      }
    }

    // Reorder to Mon-first: [Sun=0] -> last
    const reordered = [1, 2, 3, 4, 5, 6, 0].map(i => localMap[i])
    const max = Math.max(1, ...reordered.flat())

    // Timezone label
    const tzAbbr = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop()
    return { DAYS, rows: reordered, max, tzAbbr }
  }, [hasData, stats])

  // Heatmap cell intensity class
  function heatClass(count, max) {
    if (count === 0) return 'h-0'
    const ratio = count / max
    if (ratio <= 0.2) return 'h-1'
    if (ratio <= 0.4) return 'h-2'
    if (ratio <= 0.6) return 'h-3'
    if (ratio <= 0.8) return 'h-4'
    return 'h-5'
  }

  // Link analysis data
  const linkData = useMemo(() => {
    if (!hasData || !stats.operator_stats) return null
    return buildLinkSVG(stats.operator_stats, stats.duo_stats)
  }, [hasData, stats])

  // Find current user's wr_without from operator_stats
  // This is the cell's joint WR in matches where THIS user was absent
  const currentUserWrWithout = useMemo(() => {
    if (!hasData || !stats.operator_stats) return null
    const me = stats.operator_stats.find((op) =>
      op.name?.toLowerCase() === currentUserName.toLowerCase()
    )
    return me?.wr_without ?? null
  }, [hasData, stats, currentUserName])

  // Delta between joint WR and WR-without-you
  const wrDelta = useMemo(() => {
    if (!hasData) return null
    const joint = stats.win_rate_together
    const without = currentUserWrWithout
    if (joint == null || without == null) return null
    const jv = joint <= 1 ? joint * 100 : joint
    const wv = without <= 1 ? without * 100 : without
    return (jv - wv).toFixed(1)
  }, [hasData, stats, currentUserWrWithout])

  const [inviteOpen, setInviteOpen] = useState(false)

  // Joint WR value formatted
  const jointWR = hasData ? pct(stats.win_rate_together) : null
  const jointWRClass = hasData ? (
    (stats.win_rate_together <= 1 ? stats.win_rate_together : stats.win_rate_together / 100) > 0.5 ? 'positive' : ''
  ) : ''

  return (
    <>
      {!user && <AuthOverlay />}
      {user && <CellOverlay />}

      {/* ── PAGE HEADER BAR ── */}
      <div className="page-header-bar">
        <div className="page-header">
          <div>
            <div className={`eyebrow ${hasCell ? 'eyebrow-green' : ''}`}>
              &bull; CELL BRIEFING &mdash; {hasCell ? 'ACTIVE' : 'INACTIVE'}
            </div>
            <h1 className="title-hero page-title">
              {hasCell ? activeCell.name : <R w={180} h={28} />}
            </h1>
            <div className="page-meta">
              <strong>{hasCell ? (activeCell.member_count ?? 0) : <R w={16} h={11} />}</strong>
              {' '}operator{(hasCell ? activeCell.member_count : 0) !== 1 ? 's' : ''}
              <span className="meta-divider">//</span>
              region <strong>{hasCell ? 'NA' : <R w={24} h={11} />}</strong>
              <span className="meta-divider">//</span>
              established <strong>{hasCell && activeCell.created_at
                ? new Date(activeCell.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : <R w={90} h={11} />}</strong>
              <span className="meta-divider">//</span>
              case <strong>LGN-<R w={36} h={11} /></strong>
              {hasCell && (
                <>
                  <span className="meta-divider">//</span>
                  <button
                    className="recruit-btn"
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? 'SYNCING...' : '+ Sync Intel'}
                  </button>
                </>
              )}
            </div>
            {syncResult && (
              <div className="sync-result">
                {syncResult.status === 'ERROR'
                  ? `SYNC FAILED: ${syncResult.message}`
                  : syncResult.remaining > 0
                  ? `INGEST IN PROGRESS — ${syncResult.fetched ?? 0} new matches filed, ${syncResult.remaining} pending. Sync again to continue.`
                  : `INGEST COMPLETE — ${syncResult.fetched ?? 0} new matches filed, ${syncResult.skipped ?? 0} already on record`}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`dashboard${hasCell && !stats ? ' loading' : ''}`}>

        {/* ── INVITE CODE BANNER (collapsible) ── */}
        {hasCell && activeCell.invite_code && (
          inviteOpen ? (
            <div className="invite-banner">
              <div className="invite-banner-left">
                <div className="invite-banner-label">CELL INTAKE CODE</div>
                <div className="invite-banner-desc">
                  Distribute to open files on additional operators for this cell.
                </div>
              </div>
              <div className="invite-banner-right">
                <code className="invite-code-display">{activeCell.invite_code}</code>
                <button
                  className="invite-copy-btn"
                  onClick={() => navigator.clipboard.writeText(activeCell.invite_code)}
                  title="Copy to clipboard"
                >
                  COPY
                </button>
                <button
                  className="invite-collapse-btn"
                  onClick={() => setInviteOpen(false)}
                  title="Minimize"
                >
                  &minus;
                </button>
              </div>
            </div>
          ) : (
            <button className="invite-banner-collapsed" onClick={() => setInviteOpen(true)}>
              <span className="invite-banner-label">CELL INTAKE CODE</span>
              <span className="invite-collapsed-chevron">&#9662;</span>
            </button>
          )
        )}

        {/* ════════════════════════════
            CELL MEMBERS
            ════════════════════════════ */}
        <div className="card cell-members intel-reveal">

          {/* Summary strip */}
          <div className="cm-summary intel-stagger">
            {/* Joint WR */}
            <div className="cm-summary-cell">
              <div className="cm-summary-label">Joint WR</div>
              <div className={`cm-summary-value ${jointWRClass}`}>
                {hasData ? jointWR : <R w={80} h={28} />}
              </div>
              <div className="cm-summary-note">
                {hasData && wrDelta != null ? (
                  <span className={`badge ${parseFloat(wrDelta) >= 0 ? 'badge-green' : 'badge-red'}`}>
                    {parseFloat(wrDelta) >= 0 ? '↑' : '↓'} {Math.abs(wrDelta)} pts vs. without you
                  </span>
                ) : <R w={100} h={10} />}
              </div>
            </div>

            {/* WR Without You — matches the table's "Cell WR Without —" column */}
            <div className="cm-summary-cell">
              <div className="cm-summary-label">WR Without You</div>
              <div className="cm-summary-value muted">
                {hasData ? pct(currentUserWrWithout) : <R w={80} h={28} />}
              </div>
              <div className="cm-summary-note">
                {hasData ? 'joint games without you' : <R w={120} h={10} />}
              </div>
            </div>

            {/* Deployments */}
            <div className="cm-summary-cell">
              <div className="cm-summary-label">Deployments</div>
              <div className="cm-summary-value">
                {hasData ? stats.games_together : <R w={60} h={28} />}
              </div>
              <div className="cm-summary-note">
                {hasData ? `Season ${stats.season_year || new Date().getFullYear()}` : <R w={80} h={10} />}
              </div>
            </div>

            {/* Recent Form */}
            <div className="cm-summary-cell">
              <div className="cm-summary-label">Recent Form</div>
              <div className="form-streak">
                {hasData && stats.recent_form ? (
                  stats.recent_form.slice(0, 10).map((g, i) => (
                    <div
                      key={i}
                      className={`form-box ${g.win ? 'w' : 'l'}${i === 0 ? ' latest' : ''}`}
                    >
                      {g.win ? 'W' : 'L'}
                    </div>
                  ))
                ) : (
                  Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 18, height: 18,
                        background: 'var(--ink)', opacity: 0.6,
                        borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    />
                  ))
                )}
              </div>
              <div className="cm-summary-note" style={{ marginTop: 6 }}>
                {hasData ? 'last 10 deployments' : <R w={100} h={10} />}
              </div>
            </div>
          </div>

          {/* Operator table */}
          <table className="cm-table">
            <thead>
              <tr>
                <th>OPERATOR</th>
                <th>STATUS</th>
                <th>GAMES (SEASON)</th>
                <th>WIN RATE</th>
                <th>CELL WR WITHOUT &mdash;</th>
              </tr>
            </thead>
            <tbody>
              {hasData && stats.operator_stats ? (
                stats.operator_stats.map((op) => {
                  const isYou = currentUserName && op.name?.toLowerCase() === currentUserName.toLowerCase()
                  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
                  const isActive = op.last_played != null && op.last_played > sevenDaysAgo
                  return (
                    <tr key={op.puuid} className={isYou ? 'cm-you' : ''}>
                      <td>
                        <div className="cm-name">
                          {op.name}
                          {isYou && <span className="cm-you-tag">YOU</span>}
                        </div>
                      </td>
                      <td>
                        <span className="cm-status">
                          <span className={`status-dot ${isActive ? 'status-active' : 'status-inactive'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="cm-num">{op.games}</td>
                      <td className={`cm-num ${
                        (op.win_rate <= 1 ? op.win_rate : op.win_rate / 100) > 0.5
                          ? 'cm-num-pos'
                          : (op.win_rate <= 1 ? op.win_rate : op.win_rate / 100) < 0.48
                          ? 'cm-num-neg'
                          : ''
                      }`}>
                        {pct(op.win_rate)}
                      </td>
                      <td className={`cm-num ${
                        isYou && op.wr_without != null
                          ? (op.wr_without <= 1 ? op.wr_without : op.wr_without / 100) > 0.5
                            ? 'cm-num-pos'
                            : (op.wr_without <= 1 ? op.wr_without : op.wr_without / 100) < 0.48
                            ? 'cm-num-neg'
                            : ''
                          : ''
                      }`}>
                        {isYou
                          ? (op.wr_without != null ? pct(op.wr_without) : '—')
                          : <span className="redacted redacted-w-short" />}
                      </td>
                    </tr>
                  )
                })
              ) : (
                [140, 120, 100, 110, 90].map((w, i) => (
                  <tr key={i}>
                    <td><R w={w} h={14} /></td>
                    <td><R w={55} h={14} /></td>
                    <td><R w={30} h={14} /></td>
                    <td><R w={50} h={14} /></td>
                    <td><R w={50} h={14} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ════════════════════════════
            GAME MODE BREAKDOWN
            ════════════════════════════ */}
        <div className="card mode-panel intel-reveal reveal-d1">
          <div className="panel-title">Game Mode Breakdown</div>
          <div className="panel-subtitle">Win rate and activity by mode (current season)</div>

          {/* Axis tick labels */}
          <div className="mode-scale">
            <div />
            <div className="mode-scale-axis">
              <span style={{ left: '25%' }}>25%</span>
              <span style={{ left: '50%' }}>50%</span>
              <span style={{ left: '75%' }}>75%</span>
            </div>
            <div /><div />
          </div>

          <div className="mode-rows">
            {hasData ? (
              <>
                {/* Staple modes — always show all, even with 0 games */}
                {stapleModes.map(m => {
                  const hasGames = m.games > 0
                  const wrVal = hasGames ? (m.win_rate <= 1 ? m.win_rate * 100 : m.win_rate) : 0
                  return (
                    <div className={`mode-row${!hasGames ? ' mode-empty' : ''}`} key={m.name}>
                      <div className="mode-name">{m.name}</div>
                      <div className="mode-bar-wrap">
                        {hasGames
                          ? <div className={`mode-bar ${modeBarClass(m.win_rate)}`} style={{ width: `${wrVal}%` }} />
                          : <div className="mode-bar mode-bar-empty" />}
                        <div className="mode-tick t-25" />
                        <div className="mode-tick t-50" />
                        <div className="mode-tick t-75" />
                      </div>
                      <div className={`mode-wr ${hasGames ? modeWrClass(m.win_rate) : 'wr-neutral'}`}>
                        {hasGames ? pct(m.win_rate) : '—'}
                      </div>
                      <div className="mode-games">{hasGames ? `${m.games} games` : 'no data'}</div>
                    </div>
                  )
                })}

                {/* Rotating modes divider + rows */}
                {rotatingModes.length > 0 && (
                  <>
                    <div className="mode-section-divider">Featured / Rotating</div>
                    {rotatingModes.map(m => {
                      const wrVal = m.win_rate <= 1 ? m.win_rate * 100 : m.win_rate
                      return (
                        <div className="mode-row mode-rotating" key={m.mode}>
                          <div className="mode-name">{m.name}</div>
                          <div className="mode-bar-wrap">
                            <div className={`mode-bar ${modeBarClass(m.win_rate)}`} style={{ width: `${wrVal}%` }} />
                            <div className="mode-tick t-25" />
                            <div className="mode-tick t-50" />
                            <div className="mode-tick t-75" />
                          </div>
                          <div className={`mode-wr ${modeWrClass(m.win_rate)}`}>{pct(m.win_rate)}</div>
                          <div className="mode-games">{m.games} games</div>
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            ) : (
              ['Ranked', 'Ranked Flex', 'Normal', 'ARAM', 'Arena'].map(mode => (
                <div className="mode-row" key={mode}>
                  <div className="mode-name">{mode}</div>
                  <div className="mode-bar-wrap">
                    <div className="mode-bar" style={{ width: '40%' }} />
                    <div className="mode-tick t-25" />
                    <div className="mode-tick t-50" />
                    <div className="mode-tick t-75" />
                  </div>
                  <div><R w={44} h={14} /></div>
                  <div><R w={50} h={10} /></div>
                </div>
              ))
            )}
          </div>

          <div className="mode-advisory">
            <span className="advisory-marker">&#9632;</span>
            ARAM: Mayhem match data is withheld from Riot API by directive.
            Field records for this theater are not available for external analysis.
            Matches played in this mode will not appear in LEGION reporting
            until the restriction is lifted.
          </div>
        </div>

        {/* ════════════════════════════
            DUO MATRIX + HEATMAP
            ════════════════════════════ */}
        <div className="two-col intel-reveal reveal-d2">

          {/* Duo Win Rate Matrix */}
          <div className="card vis-panel">
            <div className="panel-title">Duo Win Rates</div>
            <div className="panel-subtitle">Win rate when any two operators deploy together</div>
            <div className="panel-body">
              {matrixData ? (
                <div
                  className="matrix-grid data-reveal"
                  style={{
                    gridTemplateColumns: `48px repeat(${matrixData.n}, minmax(0, 1fr))`,
                    gridTemplateRows: `36px repeat(${matrixData.n}, 1fr)`,
                  }}
                >
                  {/* Top-left empty corner */}
                  <div />
                  {/* Column headers */}
                  {matrixData.ops.map((op, ci) => (
                    <div key={`col-${ci}`} className="matrix-label-top">{matrixData.codes[ci]}</div>
                  ))}
                  {/* Rows */}
                  {matrixData.ops.flatMap((rowOp, ri) => [
                      <div key={`row-label-${ri}`} className="matrix-label">{matrixData.codes[ri]}</div>,
                      ...matrixData.ops.map((colOp, ci) => {
                        if (ri === ci) {
                          return (
                            <div key={`cell-${ri}-${ci}`} className="matrix-cell matrix-self">—</div>
                          )
                        }
                        const entry = matrixData.lookup[`${rowOp.puuid}|${colOp.puuid}`]
                          || matrixData.lookup[`${rowOp.name}|${colOp.name}`]
                        const wr = entry?.wr ?? null
                        const games = entry?.games ?? 0
                        const cellClass = matrixCellClass(wr, games)
                        const displayWr = wr != null ? `${wr.toFixed(0)}%` : ''
                        const tooltip = wr != null
                          ? `${rowOp.name} + ${colOp.name}: ${wr.toFixed(1)}% over ${games} games`
                          : `${rowOp.name} + ${colOp.name}: insufficient data`
                        return (
                          <div
                            key={`cell-${ri}-${ci}`}
                            className={`matrix-cell ${cellClass}`}
                            data-tooltip={tooltip}
                          >
                            {games >= 5 ? displayWr : ''}
                          </div>
                        )
                      }),
                  ])}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3, marginTop: 20 }}>
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: 32,
                        background: 'var(--ink)', opacity: 0.6,
                        borderRadius: 3,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="card vis-panel">
            <div className="panel-title">Activity Heatmap</div>
            <div className="panel-subtitle">When the cell deploys together{heatmapData ? ` — ${heatmapData.tzAbbr}` : ''}</div>
            <div className="panel-body">
              {heatmapData ? (
                <div className="data-reveal">
                  <div className="heatmap-grid">
                    {heatmapData.DAYS.flatMap((day, di) => [
                        <div key={`day-label-${di}`} className="heatmap-day-label">{day}</div>,
                        ...heatmapData.rows[di].map((count, hour) => {
                          const t = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
                          return (
                            <div
                              key={`${di}-${hour}`}
                              className={`heatmap-cell ${heatClass(count, heatmapData.max)}`}
                              data-tooltip={`${day} ${t}: ${count} games`}
                            />
                          )
                        }),
                    ])}
                  </div>
                  <div className="heatmap-hour-labels">
                    <div />
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div key={h} className="heatmap-hour-label">
                        {h % 6 === 0 ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`) : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, marginTop: 20 }}>
                  {Array.from({ length: 84 }).map((_, i) => (
                    <div key={i} style={{ height: 20, background: 'var(--ink)', opacity: 0.6, borderRadius: 2 }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════
            CHAMPION POOLS
            ════════════════════════════ */}
        <div className="card fun-card pools-card intel-reveal reveal-d3">
          <div className="fun-label">&bull; Operator Profiles</div>
          <div className="fun-title">Champion Pools</div>
          <div className="fun-subtitle">Champion selection patterns, by subject and theater</div>
          <div className="fun-body">
            <div className="pools-grid">
              {hasData && stats.operator_stats ? (
                stats.operator_stats.map((op, opIdx) => {
                  const isYou = currentUserName && op.name?.toLowerCase() === currentUserName.toLowerCase()
                  const totalGames = op.games || 0
                  const allChamps = op.top_champions || []

                  const activeTheaters = THEATERS.filter(t => op.theaters?.[t]?.games > 0)
                  const theaterClassifs = activeTheaters.map(t => classifyPool(op.theaters[t].top_champions, op.theaters[t].games))

                  const bestChamp = allChamps[0]
                  const bestWrChamp = allChamps.filter(c => c.games >= 3).sort((a, b) => b.win_rate - a.win_rate)[0]
                  const opSeed = (op.name || '').split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 0) >>> 0

                  const strongTemplates = [
                    () => `${allChamps.length} champion${allChamps.length !== 1 ? 's' : ''} on file across ${activeTheaters.length} theater${activeTheaters.length !== 1 ? 's' : ''}.`,
                    () => bestChamp ? `Primary asset: ${bestChamp.name}. ${allChamps.length} unique selections recorded.` : `${allChamps.length} selections on file.`,
                    () => `${totalGames} joint deployments surveyed. ${allChamps.length} distinct champion selections catalogued.`,
                    () => bestChamp ? `${bestChamp.name} leads deployment frequency. ${allChamps.length - 1} alternate${allChamps.length > 2 ? 's' : ''} on record.` : 'No dominant selection pattern identified.',
                    () => activeTheaters.length >= 2 ? `Selection data spans ${activeTheaters.length} theaters. ${allChamps.length} champions indexed.` : `All ${totalGames} deployments confined to ${activeTheaters[0] || 'a single theater'}.`,
                  ]

                  const textTemplates = [
                    () => bestWrChamp ? `Highest-WR asset: ${bestWrChamp.name} at ${Math.round(bestWrChamp.win_rate * 100)}% across ${bestWrChamp.games} deployments. ${bestChamp && bestChamp.name !== bestWrChamp.name ? `Most fielded: ${bestChamp.name} (${bestChamp.games} ops).` : 'Also the most fielded selection.'}` : 'Insufficient data for performance ranking.',
                    () => {
                      const labels = theaterClassifs.map(c => c.label)
                      const unique = [...new Set(labels)]
                      return unique.length > 1
                        ? `Classification shifts across theaters: ${unique.join(', ')}. Operator modifies selection doctrine by map environment.`
                        : unique.length === 1
                        ? `Uniform ${unique[0]} classification across all active theaters. No adaptive deviation detected.`
                        : 'Theater-level classification pending additional data.'
                    },
                    () => bestChamp ? `${bestChamp.name} deployed ${bestChamp.games} times (${Math.round(bestChamp.win_rate * 100)}% WR). ${bestChamp.win_rate >= 0.55 ? 'Outcomes support continued prioritization.' : bestChamp.win_rate < 0.45 ? 'Outcome data for this selection is unfavorable. Review warranted.' : 'Performance within expected parameters.'}` : 'No deployment data on file.',
                    () => {
                      const oneTricks = theaterClassifs.filter(c => c.label === 'ONE-TRICK')
                      if (oneTricks.length > 0) return `ONE-TRICK classification detected in ${oneTricks.length} theater${oneTricks.length > 1 ? 's' : ''}. Ban-phase vulnerability is assessed as ELEVATED. Pool depth: LIMITED.`
                      const chaotics = theaterClassifs.filter(c => c.label === 'CHAOTIC')
                      if (chaotics.length > 0) return `CHAOTIC classification in ${chaotics.length} theater${chaotics.length > 1 ? 's' : ''}. Per-champion mastery depth: INCONCLUSIVE. Selection methodology undetermined.`
                      return bestWrChamp && bestWrChamp.win_rate >= 0.6 ? `${bestWrChamp.name} represents a high-value asset at ${Math.round(bestWrChamp.win_rate * 100)}% WR. Continued deployment recommended.` : 'No performance anomaly flagged. Surveillance continues.'
                    },
                    () => {
                      if (activeTheaters.length === 1) return `Operational range limited to ${activeTheaters[0]}. Cross-theater assessment: NOT POSSIBLE with current dataset.`
                      const bestTheater = activeTheaters.reduce((a, b) => (op.theaters[a]?.win_rate ?? 0) > (op.theaters[b]?.win_rate ?? 0) ? a : b)
                      const btWr = Math.round((op.theaters[bestTheater]?.win_rate ?? 0) * 100)
                      return `Strongest theater: ${bestTheater} (${btWr}% WR). ${bestChamp ? `${bestChamp.name} remains the primary selection across environments.` : 'No dominant pick identified.'}`
                    },
                  ]

                  const noteStrong = totalGames < 5
                    ? `${totalGames} matches recorded. Sample below threshold.`
                    : strongTemplates[opSeed % strongTemplates.length]()
                  const noteText = totalGames < 5
                    ? 'Profile pending additional deployments.'
                    : textTemplates[(opSeed + 2) % textTemplates.length]()

                  return (
                    <div key={op.puuid} className="pool-row">
                      <div className="pool-header">
                        <span className="pool-name">
                          {op.name}
                          {isYou && <span className="cm-you-tag">YOU</span>}
                        </span>
                      </div>
                      {THEATERS.map(theater => {
                        const td = op.theaters?.[theater] || { games: 0, top_champions: [], unique_champions: 0 }
                        const tGames = td.games || 0
                        const tChamps = td.top_champions || []
                        const { label: tLabel, badgeClass: tBadge } = classifyPool(tChamps, tGames)
                        return (
                          <div key={theater} className="pool-theater">
                            <div className="pool-theater-header">
                              <span className="pool-theater-label">{theater}</span>
                              <span className="pool-theater-games">{tGames} OPS</span>
                              <span className={`pool-theater-badge badge ${tBadge}`}>{tLabel}</span>
                            </div>
                            <div className="pool-bar pool-bar-sm">
                              {renderPoolBar(tChamps, tGames, td.unique_champions)}
                            </div>
                          </div>
                        )
                      })}
                      <div className="pool-note">
                        <strong>{noteStrong}</strong>
                        {noteText}
                      </div>
                    </div>
                  )
                })
              ) : (
                [160, 130, 110, 140, 100].map((w, i) => (
                  <div key={i} className="pool-row">
                    <div className="pool-header">
                      <span className="pool-name"><R w={w} h={14} /></span>
                    </div>
                    {THEATERS.map(t => (
                      <div key={t} className="pool-theater">
                        <div className="pool-theater-header">
                          <span className="pool-theater-label"><R w={100} h={10} /></span>
                        </div>
                        <div className="pool-bar pool-bar-sm">
                          <RedactedBar w="100%" h={22} />
                        </div>
                      </div>
                    ))}
                    <div className="pool-note" style={{ marginTop: 10 }}>
                      <RedactedBar w="80%" h={10} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════
            ANALYST NOTES SECTION HEADER
            ════════════════════════════ */}
        <div className="section-divider intel-reveal reveal-d4">
          <div className="eyebrow">&bull; ANALYST NOTES</div>
          <h2 className="section-title">Behavioral Intelligence</h2>
          <div className="section-subtitle">Performance anomalies, synergies, and deployment patterns</div>
        </div>

        {/* ════════════════════════════
            ANALYST ROW: TILT + LINK
            ════════════════════════════ */}
        <div className="analyst-row intel-reveal reveal-d5">

          {/* TILT INDEX */}
          <div className="card fun-card">
            <div className="fun-label">&bull; Behavioral Assessment</div>
            <div className="fun-title">Tilt Index</div>
            <div className="fun-body">

              {/* What we're measuring */}
              <div className="tilt-measuring">
                <div className="tilt-measuring-label">WHAT WE&rsquo;RE MEASURING</div>
                <div className="tilt-measuring-text">
                  Post-loss cohesion decay across consecutive-loss sequences. Scale 0&ndash;10. Higher = worse.
                </div>
              </div>

              {hasData && stats.tilt_index ? (() => {
                const ti = stats.tilt_index
                const score = ti.score ?? 0
                const level = ti.level ?? 'GUARDED'
                return (
                  <>
                    <div className="tilt-class-head">
                      <div className="tilt-class-label">THREAT LEVEL</div>
                      <div className="tilt-class-value" style={{
                        color: score >= 7 ? 'var(--red)' : score >= 5 ? 'var(--amber)' : 'var(--green)',
                      }}>
                        {level.toUpperCase()}
                      </div>
                      <div className="tilt-class-score">{score.toFixed(1)} / 10</div>
                    </div>
                    <div className="tilt-segments">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`tilt-seg ${tiltSegClass(i, score)}`} />
                      ))}
                    </div>
                    <div className="judgments-head">KEY JUDGMENTS</div>
                    {(ti.judgments || []).map((j, idx) => (
                      <div key={idx} className="judgment">
                        {typeof j === 'object' && j.label
                          ? <><strong>{j.label}</strong> &mdash; {j.text}</>
                          : j}
                      </div>
                    ))}
                    <div className="tilt-analyst-note">
                      {score >= 7
                        ? 'Post-loss performance decline is assessed as ALMOST CERTAINLY a material factor in cell outcomes. Operational pause following consecutive losses is STRONGLY recommended.'
                        : score >= 5
                        ? 'Post-loss cohesion decay is consistent with the recorded sample. Analyst assesses behavioral disruption as PROBABLY a contributing factor. Session discipline merits monitoring.'
                        : 'Tilt susceptibility within normal operational parameters. No corrective action indicated at this time.'}
                    </div>
                    <div className="confidence-stamp">
                      CONFIDENCE: {ti.confidence?.toUpperCase() || 'MODERATE'} &middot; N={stats.games_together}
                    </div>
                  </>
                )
              })() : (
                <>
                  <div className="tilt-class-head">
                    <div className="tilt-class-label">THREAT LEVEL</div>
                    <div className="tilt-class-value" style={{ color: 'var(--muted)' }}>
                      <R w={100} h={20} />
                    </div>
                    <div className="tilt-class-score"><R w={60} h={16} /></div>
                  </div>
                  <div className="tilt-segments">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="tilt-seg" style={{ background: 'var(--ink)', opacity: 0.6 }} />
                    ))}
                  </div>
                  <div className="judgments-head">KEY JUDGMENTS</div>
                  {[0.9, 0.75, 0.82, 0.7, 0.85].map((w, i) => (
                    <div key={i} className="judgment">
                      <RedactedBar w={`${w * 100}%`} h={10} />
                    </div>
                  ))}
                  <div className="confidence-stamp"><R w={160} h={10} /></div>
                </>
              )}
            </div>
          </div>

          {/* LINK ANALYSIS */}
          <div className="card fun-card link-panel">
            <div className="fun-label">&bull; Network Intelligence</div>
            <div className="fun-title">Link Analysis</div>
            <div className="link-svg-wrap">
              {linkData ? (
                <svg
                  className="link-svg data-reveal"
                  viewBox="0 0 400 370"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Edges — complete graph with WR + bond classification */}
                  {linkData.edges.map((e, i) => {
                    const p1 = linkData.positions[e.i1]
                    const p2 = linkData.positions[e.i2]
                    if (!p1 || !p2) return null
                    const midX = (p1.x + p2.x) / 2
                    const midY = (p1.y + p2.y) / 2
                    return (
                      <g key={`edge-${i}`}>
                        <line
                          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                          stroke={e.stroke} strokeWidth={e.width}
                          strokeDasharray={e.dashed ? '4,3' : 'none'}
                          strokeOpacity={e.noData ? 0.3 : 0.75}
                        />
                        {!e.noData && (
                          <>
                            <rect x={midX - 18} y={midY - 9} width={36} height={16} rx={2}
                              fill="var(--card)" stroke={e.stroke} strokeWidth={0.75} opacity={0.95} />
                            <text x={midX} y={midY + 3} textAnchor="middle"
                              fontFamily="Courier Prime, monospace" fontSize="9.5" fontWeight="700"
                              fill={e.stroke}>
                              {e.wr}%
                            </text>
                            {/* Bond classification label */}
                            <text x={midX} y={midY + 20} textAnchor="middle"
                              fontFamily="IBM Plex Mono, monospace" fontSize="7" fontWeight="600"
                              letterSpacing="1.5" fill={e.bond.color}>
                              {e.bond.label}
                            </text>
                          </>
                        )}
                        {e.noData && (
                          <text x={midX} y={midY + 4} textAnchor="middle"
                            fontFamily="IBM Plex Mono, monospace" fontSize="7" fontWeight="600"
                            letterSpacing="1" fill="var(--muted-light)" opacity={0.5}>
                            UNLINKED
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {/* Active nodes — crosshair target markers */}
                  {linkData.active.slice(0, linkData.n).map((op, i) => {
                    const p = linkData.positions[i]
                    if (!p) return null
                    // Push label outward from center so it never overlaps edges
                    const angle = Math.atan2(p.y - linkData.cy, p.x - linkData.cx)
                    const labelDist = 26
                    const lx = p.x + labelDist * Math.cos(angle)
                    const ly = p.y + labelDist * Math.sin(angle)
                    const dx = p.x - linkData.cx
                    const anchor = dx > 15 ? 'start' : dx < -15 ? 'end' : 'middle'
                    // For top-center nodes, nudge label upward; for bottom, downward
                    const vertNudge = Math.abs(dx) <= 15 ? (p.y < linkData.cy ? -6 : 6) : 0
                    return (
                      <g key={op.puuid || i}>
                        {/* Crosshair arms */}
                        <line x1={p.x - 10} y1={p.y} x2={p.x - 4} y2={p.y} stroke="var(--text)" strokeWidth={0.75} />
                        <line x1={p.x + 4} y1={p.y} x2={p.x + 10} y2={p.y} stroke="var(--text)" strokeWidth={0.75} />
                        <line x1={p.x} y1={p.y - 10} x2={p.x} y2={p.y - 4} stroke="var(--text)" strokeWidth={0.75} />
                        <line x1={p.x} y1={p.y + 4} x2={p.x} y2={p.y + 10} stroke="var(--text)" strokeWidth={0.75} />
                        {/* Center dot */}
                        <circle cx={p.x} cy={p.y} r={2.5} fill="var(--text)" />
                        {/* Operator name — pushed outward from center */}
                        <text x={lx} y={ly + vertNudge} textAnchor={anchor}
                          fontFamily="IBM Plex Mono, monospace" fontSize="10" fontWeight="600"
                          letterSpacing="1.2" fill="var(--text)">
                          {op.name.toUpperCase()}
                        </text>
                        <text x={lx} y={ly + vertNudge + 12} textAnchor={anchor}
                          fontFamily="IBM Plex Mono, monospace" fontSize="8" fontWeight="400"
                          fill="var(--muted)">
                          {op.games} OPS
                        </text>
                      </g>
                    )
                  })}

                  {/* Inactive nodes — faded minimal markers */}
                  {linkData.inactive.map((op, i) => {
                    const p = linkData.inactivePositions[i]
                    if (!p) return null
                    return (
                      <g key={`inactive-${op.puuid || i}`} opacity={0.35}>
                        <line x1={p.x - 5} y1={p.y} x2={p.x + 5} y2={p.y} stroke="var(--muted)" strokeWidth={0.5} />
                        <line x1={p.x} y1={p.y - 5} x2={p.x} y2={p.y + 5} stroke="var(--muted)" strokeWidth={0.5} />
                        <text x={p.x} y={p.y + 14} textAnchor="middle"
                          fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="600"
                          letterSpacing="1" fill="var(--muted)">
                          {op.name.toUpperCase()}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              ) : (
                <div style={{
                  width: 140, height: 140, borderRadius: '50%',
                  border: '2px dashed var(--ink)', opacity: 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <R w={60} h={12} />
                </div>
              )}
            </div>
            <div className="link-legend">
              <div className="legend-row">
                <div className="legend-line" style={{ background: 'var(--green)' }} />
                <span>CORE &mdash; HIGH WR, DEEP HISTORY</span>
              </div>
              <div className="legend-row">
                <div className="legend-line" style={{ background: 'var(--muted)' }} />
                <span>STABLE / VOLATILE &mdash; MIXED RECORD</span>
              </div>
              <div className="legend-row">
                <div className="legend-line" style={{ background: 'var(--red)' }} />
                <span>STRAINED &mdash; BELOW EXPECTATIONS</span>
              </div>
              <div className="legend-row">
                <svg width="22" height="3" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="1.5" x2="22" y2="1.5" stroke="var(--muted-light)" strokeWidth="0.75" strokeDasharray="3,2" />
                </svg>
                <span>UNLINKED &mdash; NO JOINT OPS</span>
              </div>
              <div className="legend-row">
                <span>LINE WEIGHT = DEPLOYMENT FREQUENCY</span>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════
            FIELD ASSESSMENTS
            ════════════════════════════ */}
        <div className="analyst-bottom intel-reveal reveal-d6">
          <div className="card fun-card">
            <div className="fun-label">&bull; Field Assessment</div>
            <div className="fun-title">Analyst Observations</div>
            <div className="fun-subtitle">Judgments compiled from current season match data</div>
            <div className="fun-body">
              <div className="assessment-list">
                {hasData && stats.assessments ? (
                  stats.assessments.map((a, i) => {
                    const tagBg =
                      a.severity === 'green' ? 'badge-green' :
                      a.severity === 'red' ? 'badge-red' :
                      a.severity === 'amber' ? 'badge-amber' :
                      a.severity === 'blue' ? 'badge-blue' : ''
                    const isRedacted = a.redacted

                    return (
                      <div
                        key={i}
                        className={`assessment-item severity-${a.severity || 'blue'}${isRedacted ? ' assessment-redacted' : ''}`}
                      >
                        <div className="assessment-head">
                          <span className="assessment-code">
                            {a.code} &middot;{' '}
                            {isRedacted
                              ? <span className="redacted-inline" style={{ height: 11, width: 88 }} />
                              : (a.title?.toUpperCase() || 'ASSESSMENT')}
                          </span>
                          {isRedacted ? (
                            <span
                              className="assessment-tag badge"
                              style={{ background: 'var(--text)', color: 'var(--bg)' }}
                            >
                              CLASSIFIED
                            </span>
                          ) : (
                            <span className={`assessment-tag badge ${tagBg}`}>
                              {a.title?.toUpperCase() || a.severity?.toUpperCase() || 'OBSERVATION'}
                            </span>
                          )}
                        </div>
                        <div className="assessment-subject">
                          {isRedacted
                            ? <span className="redacted-inline" style={{ height: 18, width: 180 }} />
                            : a.subject}
                        </div>
                        {isRedacted ? (
                          <div className="assessment-note">
                            {a.redactedVariant === 1 ? (<>
                              <span className="blk" style={{ width: 110 }} />
                              <span className="blk" style={{ width: 64 }} />
                              <span className="vis">Pending review.</span>
                              <span className="blk" style={{ width: 88 }} />
                              <span className="vis">Access restricted per</span>
                              <span className="blk" style={{ width: 72 }} />
                              <span className="blk" style={{ width: 120 }} />
                            </>) : (<>
                              <span className="blk" style={{ width: 96 }} />
                              <span className="blk" style={{ width: 42 }} />
                              <span className="vis">Details withheld.</span>
                              <span className="blk" style={{ width: 128 }} />
                              <span className="blk" style={{ width: 64 }} />
                              <span className="vis">Surveillance maintained.</span>
                              <span className="blk" style={{ width: 152 }} />
                            </>)}
                          </div>
                        ) : (
                          <div className="assessment-note">{a.note}</div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  /* Redacted placeholder assessments */
                  [
                    { code: 'OBS-01', severity: 'green' },
                    { code: 'OBS-02', severity: 'red' },
                    { code: 'OBS-03', severity: 'red' },
                    { code: 'OBS-04', severity: 'amber' },
                    { code: 'OBS-05', severity: 'black' },
                    { code: 'OBS-06', severity: 'blue' },
                  ].map((a, i) => (
                    <div key={i} className={`assessment-item severity-${a.severity} assessment-redacted`}>
                      <div className="assessment-head">
                        <span className="assessment-code">
                          {a.code} &middot; <span className="redacted-inline" style={{ height: 11, width: 88 }} />
                        </span>
                        <span className="assessment-tag badge" style={{ background: 'var(--text)', color: 'var(--bg)' }}>
                          CLASSIFIED
                        </span>
                      </div>
                      <div className="assessment-subject">
                        <span className="redacted-inline" style={{ height: 18, width: 180 }} />
                      </div>
                      <div className="assessment-note">
                        <span className="blk" style={{ width: 120 }} />
                        <span className="vis"> &nbsp; </span>
                        <span className="blk" style={{ width: 80 }} />
                        <span className="blk" style={{ width: 62 }} />
                        <span className="vis">Surveillance maintained.</span>
                        <span className="blk" style={{ width: 148 }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Analyst signature footer */}
              <div style={{
                marginTop: 28, paddingTop: 18,
                borderTop: '1px dashed var(--border)',
                display: 'flex', gap: 18, flexWrap: 'wrap',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px', letterSpacing: '1.8px', color: 'var(--muted)',
              }}>
                <span>ANALYST OF RECORD: <span className="redacted-inline" style={{ height: 10, width: 88 }} /></span>
                <span>VERIFIED BY: <span className="redacted-inline" style={{ height: 10, width: 74 }} /></span>
                <span>FILED: {new Date().toISOString().slice(0, 10)} <span className="redacted-inline" style={{ height: 10, width: 34 }} /></span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <Footer docCode="BRIEF-" office="LEGION/OPS" />
    </>
  )
}
