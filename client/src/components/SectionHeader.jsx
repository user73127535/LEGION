export default function SectionHeader({ classification = 'CONFIDENTIAL', title, sub }) {
  return (
    <div className="border-b border-[#c8c3b8] pb-4 mb-6">
      <div className="classification-label mb-1">{classification}</div>
      <h2
        className="text-2xl text-[#1a1a1a] tracking-wider uppercase m-0"
        style={{ fontFamily: 'Courier Prime, monospace' }}
      >
        {title}
      </h2>
      {sub && (
        <p className="text-[#777777] text-xs mt-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          {sub}
        </p>
      )}
    </div>
  )
}
