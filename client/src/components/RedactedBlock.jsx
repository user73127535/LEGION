export default function RedactedBlock({ lines = 3 }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="bg-[#d4cfc5] h-3"
          style={{ width: `${60 + Math.sin(i * 2.5) * 30}%` }}
        />
      ))}
    </div>
  )
}
