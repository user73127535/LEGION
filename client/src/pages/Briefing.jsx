import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
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

const POOL_SHADES = ['s-1', 's-2', 's-3', 's-4', 's-5']

/* ── Tilt Index segment coloring ── */
function tiltSegClass(idx, score) {
  if (idx >= Math.round(score)) return ''
  return score >= 7 ? 'on-red' : 'on-amber'
}

/* ── Link Analysis SVG ── */
function buildLinkSVG(ops, duoStats) {
  if (!ops || ops.length < 2) return null

  const ACTIVE_THRESHOLD = 20
  const active = ops.filter(op => op.games >= ACTIVE_THRESHOLD)
  const inactive = ops.filter(op => op.games < ACTIVE_THRESHOLD)

  const n = Math.min(active.length, 7)
  const cx = 180, cy = 200
  const r = 110

  const positions = active.slice(0, n).map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  const inactivePositions = inactive.map((_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(inactive.length, 1) + Math.PI / 6
    return {
      x: cx + (r + 50) * Math.cos(angle),
      y: cy + (r + 50) * Math.sin(angle),
    }
  })

  const edges = []
  if (duoStats) {
    const maxGames = Math.max(...duoStats.map(d => d.games), 1)
    duoStats.forEach(duo => {
      const i1 = active.findIndex(o => o.puuid === duo.puuids?.[0] || o.name === duo.names?.[0])
      const i2 = active.findIndex(o => o.puuid === duo.puuids?.[1] || o.name === duo.names?.[1])
      if (i1 === -1 || i2 === -1 || i1 >= n || i2 >= n) return
      const wr = duo.win_rate <= 1 ? duo.win_rate * 100 : duo.win_rate
      const stroke = wr >= 55 ? '#15803d' : wr >= 45 ? '#8a8a8a' : '#b91c1c'
      const width = 1 + (duo.games / maxGames) * 5
      const opacity = wr >= 55 ? 0.78 : wr >= 45 ? 0.4 : 0.55
      edges.push({ i1, i2, stroke, width, opacity })
    })
  }

  const abbrev = name => name.slice(0, 3).toUpperCase()

  return { active, inactive, positions, inactivePositions, edges, n, abbrev }
}

export default function Briefing() {
  const { user, activeCell } = useAuth()
  const [stats, setStats] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const hasCell = user && activeCell
  const hasData = stats && stats.games_together > 0

  const fetchStats = useCallback(async () => {
    if (!activeCell) return
    setLoading(true)
    try {
      const data = await api.getCellStats(activeCell.id)
      setStats(data)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [activeCell])

  useEffect(() => {
    if (hasCell) fetchStats()
    else setStats(null)
  }, [hasCell, fetchStats])

  async function handleSync() {
    if (!activeCell || syncing) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await api.ingestMatches(activeCell.id)
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
  const { stapleModes, rotatingModes } = useMemo(() => {
    if (!hasData || !stats.game_mode_breakdown) return { stapleModes: [], rotatingModes: [] }
    const staple = [], rotating = []
    stats.game_mode_breakdown.forEach(m => {
      const name = normModeName(m.mode)
      if (STAPLE_MODES.includes(name)) staple.push({ ...m, name })
      else rotating.push({ ...m, name })
    })
    return { stapleModes: staple, rotatingModes: rotating }
  }, [hasData, stats])

  // Build duo matrix from duo_stats + operator_stats
  const matrixData = useMemo(() => {
    if (!hasData || !stats.operator_stats) return null
    const ops = stats.operator_stats
    const n = ops.length
    // Build lookup from duo_stats
    const lookup = {}
    if (stats.duo_stats) {
      stats.duo_stats.forEach(d => {
        const key1 = `${d.names?.[0]}|${d.names?.[1]}`
        const key2 = `${d.names?.[1]}|${d.names?.[0]}`
        const wr = d.win_rate <= 1 ? d.win_rate * 100 : d.win_rate
        lookup[key1] = { wr, games: d.games }
        lookup[key2] = { wr, games: d.games }
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

  // Delta between joint WR and apart WR
  const wrDelta = useMemo(() => {
    if (!hasData) return null
    const joint = stats.win_rate_together
    const solo = stats.win_rate_apart
    if (joint == null || solo == null) return null
    const jv = joint <= 1 ? joint * 100 : joint
    const sv = solo <= 1 ? solo * 100 : solo
    return (jv - sv).toFixed(1)
  }, [hasData, stats])

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
                  : `INGEST COMPLETE — ${syncResult.fetched ?? 0} new matches filed, ${syncResult.skipped ?? 0} already on record`}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard">

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
        <div className="card cell-members">

          {/* Summary strip */}
          <div className="cm-summary">
            {/* Joint WR */}
            <div className="cm-summary-cell">
              <div className="cm-summary-label">Joint WR</div>
              <div className={`cm-summary-value ${jointWRClass}`}>
                {hasData ? jointWR : <R w={80} h={28} />}
              </div>
              <div className="cm-summary-note">
                {hasData && wrDelta != null ? (
                  <span className={`badge ${parseFloat(wrDelta) >= 0 ? 'badge-green' : 'badge-red'}`}>
                    {parseFloat(wrDelta) >= 0 ? '↑' : '↓'} {Math.abs(wrDelta)} pts vs. solo
                  </span>
                ) : <R w={100} h={10} />}
              </div>
            </div>

            {/* WR Without You */}
            <div className="cm-summary-cell">
              <div className="cm-summary-label">WR Without You</div>
              <div className="cm-summary-value muted">
                {hasData ? pct(stats.win_rate_apart) : <R w={80} h={28} />}
              </div>
              <div className="cm-summary-note">
                {hasData ? 'counterfactual baseline' : <R w={120} h={10} />}
              </div>
            </div>

            {/* Deployments */}
            <div className="cm-summary-cell">
              <div className="cm-summary-label">Deployments</div>
              <div className="cm-summary-value">
                {hasData ? stats.games_together : <R w={60} h={28} />}
              </div>
              <div className="cm-summary-note">
                {hasData ? 'last 30 days' : <R w={80} h={10} />}
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
                      className={`form-box ${g.win ? 'w' : 'l'}${i === stats.recent_form.length - 1 ? ' latest' : ''}`}
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
                <th>GAMES (30D)</th>
                <th>WIN RATE</th>
                <th>CELL WR WITHOUT &mdash;</th>
              </tr>
            </thead>
            <tbody>
              {hasData && stats.operator_stats ? (
                stats.operator_stats.map((op) => {
                  const isYou = op.name?.toLowerCase().startsWith(currentUserName.toLowerCase()) ||
                    op.puuid === user?.id
                  const isActive = op.games >= 20
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
                      <td>
                        {isYou && op.wr_without != null
                          ? <span className="cm-num">{pct(op.wr_without)}</span>
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
        <div className="card mode-panel">
          <div className="panel-title">Game Mode Breakdown</div>
          <div className="panel-subtitle">Win rate and activity by mode (last 30 days)</div>

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
                {/* Staple modes */}
                {stapleModes.map(m => {
                  const wrVal = m.win_rate <= 1 ? m.win_rate * 100 : m.win_rate
                  return (
                    <div className="mode-row" key={m.mode}>
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
        </div>

        {/* ════════════════════════════
            DUO MATRIX + HEATMAP
            ════════════════════════════ */}
        <div className="two-col">

          {/* Duo Win Rate Matrix */}
          <div className="card vis-panel">
            <div className="panel-title">Duo Win Rates</div>
            <div className="panel-subtitle">Win rate when any two operators deploy together</div>
            <div className="panel-body">
              {matrixData ? (
                <div
                  className="matrix-grid"
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
                        const key = `${rowOp.name}|${colOp.name}`
                        const entry = matrixData.lookup[key]
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
                <>
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
                </>
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
        <div className="card fun-card pools-card">
          <div className="fun-label">&bull; Operator Profiles</div>
          <div className="fun-title">Champion Pools</div>
          <div className="fun-subtitle">Champion selection patterns, by subject</div>
          <div className="fun-body">
            <div className="pools-grid">
              {hasData && stats.operator_stats ? (
                stats.operator_stats.map((op, opIdx) => {
                  const isYou = op.name?.toLowerCase().startsWith(currentUserName.toLowerCase()) || op.puuid === user?.id
                  const champs = op.top_champions || []
                  const totalGames = op.games || 0
                  const { label, badgeClass } = classifyPool(champs, totalGames)

                  const shownChamps = champs.slice(0, 5)
                  const uniqueTotal = op.unique_champions || champs.length
                  const hiddenCount = uniqueTotal - shownChamps.length
                  const topChamp = shownChamps[0]
                  const topPct = topChamp ? Math.round((topChamp.games / totalGames) * 100) : 0

                  const chaoticStrongs = [
                    `${uniqueTotal} champions across ${totalGames} matches. No pattern detected.`,
                    `${uniqueTotal} unique picks in ${totalGames} deployments. No dominant selection.`,
                    `${uniqueTotal} champions rotated across ${totalGames} engagements. Pool entropy: high.`,
                    `${uniqueTotal} picks filed across ${totalGames} deployments. Selection: erratic.`,
                    `${uniqueTotal} unique selections logged. Distribution spread across ${totalGames} engagements.`,
                  ]
                  const chaoticTexts = [
                    'Selection methodology undetermined. Per-champion mastery: marginal.',
                    'No repeatable pattern observed. Operator adapts picks to team composition or mood — unclear which.',
                    'Champion rotation appears random within role constraints. Mastery depth: inconclusive.',
                    'Pick behavior defies categorization. No loyalty to any single champion detected.',
                    'Operator exhibits no discernible pick priority. Situational adaptation suspected but unconfirmed.',
                  ]
                  const opSeed = (op.name || '').split('').reduce((s, c, i) => s * 31 + c.charCodeAt(0), 0) >>> 0

                  const noteStrong = totalGames < 5
                    ? `${totalGames} matches recorded. Sample below threshold.`
                    : label === 'ONE-TRICK' && topChamp
                    ? `${champs.length} champion${champs.length !== 1 ? 's' : ''} on file. Functionally one.`
                    : label === 'CHAOTIC'
                    ? chaoticStrongs[opIdx % chaoticStrongs.length]
                    : topChamp
                    ? `${champs.length} champion${champs.length !== 1 ? 's' : ''} on file. ${topChamp.name} in ${topPct}% of deployments.`
                    : 'No champion data on file.'
                  const noteText = totalGames < 5
                    ? 'Profile pending additional deployments.'
                    : label === 'ONE-TRICK'
                    ? `${topChamp?.name} in ${topPct}% of recorded matches. Reversion observed within two matches of any deviation. Specialist profile assessed with HIGH CONFIDENCE.`
                    : label === 'CHAOTIC'
                    ? chaoticTexts[(opIdx + 2) % chaoticTexts.length]
                    : label === 'INCONCLUSIVE'
                    ? 'Profile pending additional deployments.'
                    : label === 'NARROW'
                    ? 'Secondary picks selected only when primary is unavailable. No deviation observed under cell-internal pressure.'
                    : label === 'SPECIALIST'
                    ? `Secondary picks selected only when ${topChamp?.name || 'primary'} is banned. Role: fixed. No deviation observed.`
                    : `No off-lane deployments observed. Team composition adjusts to accommodate.`

                  return (
                    <div key={op.puuid} className="pool-row">
                      <div className="pool-header">
                        <span className="pool-name">
                          {op.name}
                          {isYou && <span className="cm-you-tag">YOU</span>}
                        </span>
                        <span className={`pool-class badge ${badgeClass}`}>{label}</span>
                      </div>
                      <div className="pool-bar">
                        {totalGames < 5 ? (
                          <div className="pool-seg s-empty" style={{ width: '100%' }}>
                            INSUFFICIENT DATA &mdash; {totalGames} MATCHES
                          </div>
                        ) : shownChamps.length === 0 ? (
                          <div className="pool-seg s-empty" style={{ width: '100%' }}>NO DATA</div>
                        ) : (
                          (() => {
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
                                const shade = POOL_SHADES[idx] || 's-5'
                                const hideText = idx > 0 && pcts[idx] < 8
                                const segPct = Math.round((c.games / totalGames) * 100)
                                const shortName = c.name.length <= 5 ? c.name.toUpperCase() : c.name.slice(0, 4).toUpperCase()
                                let label
                                if (idx === 0) {
                                  label = pcts[idx] >= 25 ? `${c.name.toUpperCase()} ${segPct}%` : c.name.toUpperCase()
                                } else {
                                  label = shortName
                                }
                                return (
                                  <div
                                    key={c.name}
                                    className={`pool-seg ${shade}${hideText ? ' hide-text' : ''}`}
                                    style={{ width: `${pcts[idx]}%` }}
                                  >
                                    {label}
                                  </div>
                                )
                              })}
                              {hasRemainder && (
                                <div
                                  className="pool-seg s-empty"
                                  style={{ width: `${remainder}%` }}
                                >
                                  {hiddenCount > 0 ? `+${hiddenCount} more` : ''}
                                </div>
                              )}
                            </>
                          })()
                        )}
                      </div>
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
                      <span className="pool-class badge badge-blue"><R w={60} h={10} /></span>
                    </div>
                    <div className="pool-bar">
                      <RedactedBar w="100%" h={26} />
                    </div>
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
        <div className="section-divider">
          <div className="eyebrow">&bull; ANALYST NOTES</div>
          <h2 className="section-title">Behavioral Intelligence</h2>
          <div className="section-subtitle">Performance anomalies, synergies, and deployment patterns</div>
        </div>

        {/* ════════════════════════════
            ANALYST ROW: TILT + LINK
            ════════════════════════════ */}
        <div className="analyst-row">

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
                  className="link-svg"
                  viewBox="0 40 360 340"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Edges */}
                  {linkData.edges.map((e, i) => {
                    const p1 = linkData.positions[e.i1]
                    const p2 = linkData.positions[e.i2]
                    if (!p1 || !p2) return null
                    return (
                      <line
                        key={i}
                        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                        stroke={e.stroke}
                        strokeWidth={e.width}
                        strokeOpacity={e.opacity}
                      />
                    )
                  })}
                  {/* Active nodes */}
                  {linkData.active.slice(0, linkData.n).map((op, i) => {
                    const p = linkData.positions[i]
                    if (!p) return null
                    const code = linkData.abbrev(op.name)
                    const labelY = p.y < 200 ? p.y - 18 : p.y + 26
                    const anchor = 'middle'
                    const labelX = p.x
                    return (
                      <g key={op.puuid || i}>
                        <circle cx={p.x} cy={p.y} r={10} fill="#1a1a1a" />
                        <text
                          x={labelX} y={labelY}
                          textAnchor={anchor}
                          fontFamily="IBM Plex Mono, monospace"
                          fontSize="12"
                          fontWeight="700"
                          fill="#1a1a1a"
                          letterSpacing="1.5"
                        >
                          {code}
                        </text>
                      </g>
                    )
                  })}
                  {/* Inactive orbit nodes */}
                  {linkData.inactive.map((op, i) => {
                    const p = linkData.inactivePositions[i]
                    if (!p) return null
                    const code = linkData.abbrev(op.name)
                    return (
                      <g key={`inactive-${op.puuid || i}`}>
                        <circle cx={p.x} cy={p.y} r={6} fill="#1a1a1a" stroke="#d4ccb8" strokeWidth={2} strokeDasharray="2,2" />
                        <text
                          x={p.x + 12} y={p.y + 4}
                          textAnchor="start"
                          fontFamily="IBM Plex Mono, monospace"
                          fontSize="11"
                          fontWeight="700"
                          fill="#6b6558"
                          letterSpacing="1.5"
                        >
                          {code}
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
                <span>HIGH WR PAIRING</span>
              </div>
              <div className="legend-row">
                <div className="legend-line" style={{ background: 'var(--red)' }} />
                <span>LOW WR PAIRING</span>
              </div>
              <div className="legend-row">
                <div className="legend-node node-isolated" />
                <span>NO JOINT OPS</span>
              </div>
              <div className="legend-row">
                <span>LINE WEIGHT = JOINT GAMES</span>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════
            FIELD ASSESSMENTS
            ════════════════════════════ */}
        <div className="analyst-bottom">
          <div className="card fun-card">
            <div className="fun-label">&bull; Field Assessment</div>
            <div className="fun-title">Analyst Observations</div>
            <div className="fun-subtitle">Judgments compiled from 30-day match data</div>
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
