export default function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="border border-[#c8c3b8] bg-[#ede8df] p-4">
      <div className="classification-label mb-2">{label}</div>
      <div
        className={`text-3xl font-bold ${accent ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]'}`}
        style={{ fontFamily: 'Courier Prime, monospace' }}
      >
        {value ?? <span className="text-[#c8c3b8]">——</span>}
      </div>
      {sub && (
        <div className="text-[#777777] text-xs mt-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
