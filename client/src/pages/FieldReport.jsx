import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import SectionHeader from '../components/SectionHeader'
import StatCard from '../components/StatCard'
import RedactedBlock from '../components/RedactedBlock'

export default function FieldReport() {
  const { cellId } = useParams()
  const [cell, setCell] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncLoading, setSyncLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.getCell(cellId), api.getCellStats(cellId)])
      .then(([cellData, statsData]) => {
        setCell(cellData)
        setStats(statsData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [cellId])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="classification-label mb-4">RETRIEVING CLASSIFIED FIELD REPORTS<span className="blink">_</span></div>
        <RedactedBlock lines={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="border border-[#1a1a1a] p-6">
          <div className="classification-label mb-2">TRANSMISSION ERROR</div>
          <p className="text-[#1a1a1a] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{error}</p>
        </div>
      </div>
    )
  }

  const winRateTogether = stats?.win_rate_together != null
    ? `${(stats.win_rate_together * 100).toFixed(1)}%`
    : null
  const winRateApart = stats?.win_rate_apart != null
    ? `${(stats.win_rate_apart * 100).toFixed(1)}%`
    : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-start justify-between mb-6">
        <SectionHeader
          classification="FIELD REPORT // RESTRICTED"
          title={cell?.name ?? 'UNKNOWN CELL'}
          sub={`${cell?.member_count ?? 0} OPERATORS // ESTABLISHED ${cell?.created_at ? new Date(cell.created_at).toLocaleDateString() : '——'}`}
        />
        <Link
          to={`/cells/${cellId}/operations`}
          className="border border-[#c8c3b8] text-[#777777] hover:text-[#1a1a1a] hover:border-[#777777] text-xs tracking-widest uppercase px-3 py-2 transition-colors"
          style={{ fontFamily: 'IBM Plex Mono, monospace' }}
        >
          OPERATION LOG →
        </Link>
      </div>

      {/* Win rate comparison */}
      <div className="mb-8">
        <div className="classification-label mb-3">COMBAT EFFECTIVENESS ANALYSIS</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#c8c3b8]">
          <StatCard
            label="WIN RATE TOGETHER"
            value={winRateTogether}
            sub={`${stats?.games_together ?? 0} joint operations`}
            accent={stats?.win_rate_together > 0.5}
          />
          <StatCard
            label="WIN RATE APART"
            value={winRateApart}
            sub={`${stats?.games_apart ?? 0} solo operations`}
          />
          <StatCard
            label="TOTAL OPERATIONS"
            value={stats?.total_games ?? null}
            sub="logged matches"
          />
          <StatCard
            label="ACTIVE OPERATORS"
            value={cell?.member_count ?? null}
            sub="cell members"
          />
        </div>
      </div>

      {/* Champion synergies */}
      <div className="mb-8">
        <div className="classification-label mb-3">CHAMPION SYNERGY // MOST DEPLOYED</div>
        {stats?.champion_synergies?.length > 0 ? (
          <div className="border border-[#c8c3b8]">
            <div className="grid grid-cols-3 sm:grid-cols-5 border-b border-[#c8c3b8] bg-[#f5f0e8] px-4 py-2">
              {['OPERATORS', 'CHAMPIONS', 'GAMES', 'WIN RATE', 'DELTA'].map((h) => (
                <div key={h} className="classification-label">{h}</div>
              ))}
            </div>
            {stats.champion_synergies.map((syn, i) => (
              <div
                key={i}
                className="grid grid-cols-3 sm:grid-cols-5 px-4 py-3 border-b border-[#d4cfc5] hover:bg-[#ede8df] transition-colors"
              >
                <div className="text-[#777777] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {syn.operators?.join(' + ') ?? '——'}
                </div>
                <div className="text-[#1a1a1a] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {syn.champions?.join(' / ') ?? '——'}
                </div>
                <div className="text-[#777777] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {syn.games}
                </div>
                <div className={`text-xs ${syn.win_rate > 0.5 ? 'text-[#1a1a1a]' : 'text-[#999]'}`} style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {(syn.win_rate * 100).toFixed(1)}%
                </div>
                <div className={`text-xs ${syn.delta > 0 ? 'text-[#1a1a1a]' : 'text-[#999]'}`} style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {syn.delta > 0 ? '+' : ''}{(syn.delta * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-[#c8c3b8] bg-[#ede8df] p-6">
            <p className="text-[#777777] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              INSUFFICIENT FIELD DATA. OPERATIONS PENDING.
            </p>
            <RedactedBlock lines={2} />
          </div>
        )}
      </div>

      {/* Game mode breakdown */}
      <div className="mb-8">
        <div className="classification-label mb-3">THEATER OF OPERATIONS // BREAKDOWN</div>
        {stats?.game_mode_breakdown?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#c8c3b8]">
            {stats.game_mode_breakdown.map((mode) => (
              <div key={mode.mode} className="bg-[#ede8df] p-4">
                <div className="classification-label mb-2">{mode.mode}</div>
                <div
                  className="text-2xl text-[#1a1a1a] mb-1"
                  style={{ fontFamily: 'Courier Prime, monospace' }}
                >
                  {(mode.win_rate * 100).toFixed(1)}%
                </div>
                <div className="text-[#777777] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {mode.games} operations
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-[#c8c3b8] bg-[#ede8df] p-6">
            <p className="text-[#777777] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              INSUFFICIENT FIELD DATA. OPERATIONS PENDING.
            </p>
          </div>
        )}
      </div>

      {/* Operators */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="classification-label">CELL ROSTER // ACTIVE OPERATORS</div>
        </div>
        {cell?.members?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#c8c3b8]">
            {cell.members.map((m) => (
              <div key={m.id} className="bg-[#ede8df] p-4 flex items-center justify-between">
                <div>
                  <div className="text-[#1a1a1a] text-sm" style={{ fontFamily: 'Courier Prime, monospace' }}>
                    {m.riot_game_name}#{m.riot_tag_line}
                  </div>
                  <div className="text-[#c8c3b8] text-xs mt-0.5" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    PUUID: <span className="text-[#d4cfc5]">████████████████</span>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 border ${m.is_verified ? 'border-[#c8c3b8] text-[#777777]' : 'border-[#1a1a1a] text-[#1a1a1a]'}`}
                  style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {m.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-[#c8c3b8] bg-[#ede8df] p-6">
            <p className="text-[#777777] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              NO OPERATORS DETECTED IN THIS CELL.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
