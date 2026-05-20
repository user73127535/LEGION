import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import AuthOverlay from '../components/AuthOverlay'
import CellOverlay from '../components/CellOverlay'
import Footer from '../components/Footer'

function R({ w, h = 12 }) {
  return (
    <span
      className="redacted-block"
      style={{ width: w, height: h, verticalAlign: 'middle' }}
    />
  )
}

function RedactedMatchRow() {
  return (
    <div className="match-row sealed">
      <div className="match-row-head">
        <span className="result-tag"><R w={28} h={10} /></span>
        <span className="match-mode"><R w={50} h={10} /></span>
        <span className="match-duration"><R w={36} h={12} /></span>
        <span className="match-time"><R w={48} h={10} /></span>
      </div>
      <table className="match-ops">
        <thead>
          <tr>
            <th>Operator</th>
            <th>Champion</th>
            <th>KDA</th>
            <th className="col-num">Damage</th>
            <th className="col-num">Gold</th>
          </tr>
        </thead>
        <tbody>
          {[130, 110, 100].map((w, i) => (
            <tr key={i}>
              <td><R w={w} h={12} /></td>
              <td><R w={60} h={12} /></td>
              <td><R w={70} h={12} /></td>
              <td className="col-num"><R w={40} h={12} /></td>
              <td className="col-num"><R w={36} h={12} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatDamage(dmg) {
  if (!dmg) return '0'
  if (dmg >= 1000) return (dmg / 1000).toFixed(1) + 'k'
  return String(dmg)
}

const STAPLE_MODES = ['Ranked', 'Ranked Flex', 'Normal', 'ARAM', 'ARAM Mayhem', 'Arena']

function resolveMode(gameMode, queueId) {
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

function isRotating(modeName) {
  return !STAPLE_MODES.includes(modeName)
}

export default function OperationLog() {
  const { user, activeCell } = useAuth()
  const [operations, setOperations] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterMode, setFilterMode] = useState('All')
  const [filterOutcome, setFilterOutcome] = useState('All')
  const [activeOperators, setActiveOperators] = useState(null)

  const cellId = activeCell?.id
  const hasCell = !!(user && activeCell)
  const hasData = operations && operations.length > 0

  const fetchOps = useCallback(async () => {
    if (!cellId) return
    setLoading(true)
    try {
      const data = await api.getOperationLog(cellId)
      setOperations(data)
    } catch {
      setOperations(null)
    } finally {
      setLoading(false)
    }
  }, [cellId])

  useEffect(() => {
    if (hasCell) fetchOps()
    else setOperations(null)
  }, [hasCell, fetchOps])

  const allOperatorNames = [...new Set(
    (operations ?? []).flatMap((op) => op.participants.map((p) => p.name)).filter(Boolean)
  )].sort()

  useEffect(() => {
    if (allOperatorNames.length > 0 && activeOperators === null) {
      setActiveOperators(new Set(allOperatorNames))
    }
  }, [allOperatorNames.length])

  const currentOps = activeOperators ?? new Set(allOperatorNames)

  const toggleOperator = (name) => {
    const next = new Set(currentOps)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setActiveOperators(next)
  }

  const filtersAreDirty = filterMode !== 'All' ||
    filterOutcome !== 'All' ||
    (activeOperators !== null && activeOperators.size !== allOperatorNames.length)

  const resetFilters = () => {
    setFilterMode('All')
    setFilterOutcome('All')
    setActiveOperators(new Set(allOperatorNames))
  }

  const filtered = (operations ?? []).filter((op) => {
    if (filterMode !== 'All' && resolveMode(op.game_mode, op.queue_id) !== filterMode) return false
    if (filterOutcome === 'Wins' && !op.cell_members_won) return false
    if (filterOutcome === 'Losses' && op.cell_members_won) return false
    if (activeOperators !== null) {
      const opNames = op.participants.map((p) => p.name)
      if (!opNames.some((n) => currentOps.has(n))) return false
    }
    return true
  })

  const grouped = []
  let currentDate = null
  for (const op of filtered) {
    const dateStr = formatDate(op.game_end_timestamp)
    if (dateStr !== currentDate) {
      currentDate = dateStr
      grouped.push({ date: dateStr, ops: [] })
    }
    grouped[grouped.length - 1].ops.push(op)
  }

  const totalWins = filtered.filter((o) => o.cell_members_won).length
  const totalLosses = filtered.length - totalWins
  const jointWR = filtered.length > 0 ? totalWins / filtered.length : null
  const avgDuration = filtered.length > 0
    ? Math.round(filtered.reduce((sum, o) => sum + (o.game_duration ?? 0), 0) / filtered.length)
    : null

  const modes = ['All', ...new Set((operations ?? []).map((o) => resolveMode(o.game_mode, o.queue_id)))]

  const currentUserName = user?.user_metadata?.riot_game_name ?? null

  return (
    <>
      {!user && <AuthOverlay />}
      {user && <CellOverlay />}

      <div className="page-header-bar">
        <div className="page-header">
          <div>
            <div className={`eyebrow ${hasCell ? 'eyebrow-green' : ''}`}>
              &bull; OPERATION LOG &mdash; {hasCell ? 'ACTIVE' : 'INACTIVE'}
            </div>
            <h1 className="title-hero page-title">
              {hasCell ? activeCell.name : <R w={180} h={28} />}
            </h1>
            <div className="page-meta">
              <strong>{hasCell ? (activeCell.member_count ?? 0) : <R w={16} h={11} />}</strong> operator{(hasCell ? activeCell.member_count : 0) !== 1 ? 's' : ''}
              <span className="meta-divider">//</span>
              region <strong>{hasCell ? 'NA' : <R w={24} h={11} />}</strong>
              <span className="meta-divider">//</span>
              established <strong>{hasCell && activeCell.created_at
                ? new Date(activeCell.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : <R w={90} h={11} />}</strong>
              <span className="meta-divider">//</span>
              case <strong>LGN-<R w={36} h={11} /></strong>
              <span className="meta-divider">//</span>
              <span className="sync-meta">last synced <span>3</span>s ago</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`page-content${hasCell && !operations ? ' loading' : ''}`}>

        {/* ── SUMMARY STRIP ── */}
        <div className="summary-strip intel-stagger">
          <div className="summary-card">
            <div className="summary-card-accent" style={{ background: 'var(--green)' }} />
            <div className="summary-label">Joint Win Rate</div>
            <div className="summary-value val-green">
              {hasData ? `${(jointWR * 100).toFixed(1)}%` : <R w={100} h={36} />}
            </div>
            <div className="summary-sub">
              {hasData ? `across ${filtered.length} matches` : <R w={90} h={10} />}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-accent" style={{ background: 'var(--text)' }} />
            <div className="summary-label">Total Wins</div>
            <div className="summary-value">
              {hasData ? totalWins : <R w={60} h={36} />}
            </div>
            <div className="summary-sub">
              {hasData ? 'current season' : <R w={80} h={10} />}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-accent" style={{ background: 'var(--red)' }} />
            <div className="summary-label">Total Losses</div>
            <div className="summary-value val-red">
              {hasData ? totalLosses : <R w={60} h={36} />}
            </div>
            <div className="summary-sub">
              {hasData ? 'current season' : <R w={80} h={10} />}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-accent" style={{ background: 'var(--amber)' }} />
            <div className="summary-label">Avg. Duration</div>
            <div className="summary-value">
              {hasData ? formatDuration(avgDuration) : <R w={80} h={36} />}
            </div>
            <div className="summary-sub">
              {hasData ? 'per deployment' : <R w={70} h={10} />}
            </div>
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div className="filter-bar intel-reveal reveal-d4">
          <div className="filter-bar-head">
            <span className="filter-bar-head-label">Filters</span>
            <button
              type="button"
              className="reset-filters-btn"
              disabled={!filtersAreDirty}
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
          <div className="filter-row">
            <span className="filter-label">THEATER</span>
            <div className="filter-chips">
              {modes.map((m) => (
                <button
                  className={`chip${filterMode === m ? ' active' : ''}`}
                  key={m}
                  onClick={() => setFilterMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">OUTCOME</span>
            <div className="filter-chips">
              {['All', 'Wins', 'Losses'].map((o) => (
                <button
                  className={`chip${filterOutcome === o ? ' active' : ''}`}
                  key={o}
                  onClick={() => setFilterOutcome(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
          {allOperatorNames.length > 0 && (
            <div className="filter-row">
              <span className="filter-label">OPERATORS</span>
              <div className="filter-chips">
                {allOperatorNames.map((name) => (
                  <button
                    className={`chip operator-chip${currentOps.has(name) ? ' active' : ' inactive'}`}
                    key={name}
                    onClick={() => toggleOperator(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── MATCH LIST ── */}
        <div className="match-list intel-reveal reveal-d5">
          <div className="match-list-head">
            <div className="match-list-title">Deployment History</div>
            <div className="match-list-count">
              SHOWING {filtered.length} OF {(operations ?? []).length}
            </div>
          </div>

          {hasData && currentOps.size === 1 ? (
            <div className="scope-notice">
              <div className="scope-notice-label">SINGLE OPERATOR SELECTED</div>
              <div className="scope-notice-text">
                Individual operator performance falls outside the scope of this surveillance program.
                LEGION monitors joint deployments exclusively — operations involving two or more
                operators from the same cell. Select additional operators to review deployment history.
              </div>
              <div className="scope-notice-ref">Solo Reports Filed: 0</div>
            </div>
          ) : hasData ? (
            grouped.map((group, gi) => (
              <div key={gi}>
                <div className="match-day-header">
                  {group.date} &mdash; <span className="day-count">{group.ops.length}</span> deployment{group.ops.length !== 1 ? 's' : ''}
                </div>
                {group.ops.map((op) => (
                  <div
                    key={op.match_id}
                    className={`match-row ${op.cell_members_won ? 'win' : 'loss'}`}
                  >
                    <div className="match-row-head">
                      <span className="result-tag">
                        {op.cell_members_won ? 'WIN' : 'LOSS'}
                      </span>
                      <span className={`match-mode${isRotating(resolveMode(op.game_mode, op.queue_id)) ? ' mode-rotating' : ''}`}>
                        {resolveMode(op.game_mode, op.queue_id)}
                      </span>
                      <span className="match-duration">{formatDuration(op.game_duration)}</span>
                      <span className="match-time">{formatTime(op.game_end_timestamp)}</span>
                    </div>
                    <table className="match-ops">
                      <thead>
                        <tr>
                          <th>Operator</th>
                          <th>Champion</th>
                          <th>KDA</th>
                          <th className="col-num">Damage</th>
                          <th className="col-num">Gold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {op.participants.map((p, pi) => (
                          <tr key={pi}>
                            <td className={`op-name${p.name === currentUserName ? ' you' : ''}`}>
                              {p.name}
                            </td>
                            <td>{p.champion}</td>
                            <td className="op-kda">{p.kills} / {p.deaths} / {p.assists}</td>
                            <td className="op-dmg col-num">{formatDamage(p.damage)}</td>
                            <td className="op-gold col-num">{formatDamage(p.gold)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <>
              <div className="match-day-header">
                <R w={120} h={10} /> &mdash; <R w={14} h={10} /> DEPLOYMENTS
              </div>
              <RedactedMatchRow />
              <RedactedMatchRow />
              <RedactedMatchRow />

              <div className="match-day-header">
                <R w={120} h={10} /> &mdash; <R w={14} h={10} /> DEPLOYMENTS
              </div>
              <RedactedMatchRow />
              <RedactedMatchRow />

              <div className="match-day-header">
                <R w={120} h={10} /> &mdash; <R w={14} h={10} /> DEPLOYMENTS
              </div>
              <RedactedMatchRow />
              <RedactedMatchRow />
              <RedactedMatchRow />
            </>
          )}
        </div>
      </div>

      <Footer docCode="OPLOG-" office="LEGION/OPS" />
    </>
  )
}
