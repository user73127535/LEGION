import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Enlist() {
  const { enlist } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', riotGameName: '', riotTagLine: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await enlist(form.email, form.password, form.riotGameName, form.riotTagLine)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="classification-label mb-4">ENLISTMENT STATUS</div>
        <h2 className="text-2xl tracking-widest text-[#1a1a1a] uppercase mb-4" style={{ fontFamily: 'Courier Prime, monospace' }}>
          IDENTITY LOGGED.
        </h2>
        <p className="text-[#777777] text-xs mb-8" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          Confirmation directive transmitted to your communication channel. Verify to activate field clearance.
        </p>
        <Link
          to="/authenticate"
          className="border border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f0e8] text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          style={{ fontFamily: 'IBM Plex Mono, monospace' }}
        >
          AUTHENTICATE
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="classification-label mb-2">PERSONNEL INTAKE // FORM-001</div>
      <h1
        className="text-3xl tracking-widest text-[#1a1a1a] uppercase mb-2"
        style={{ fontFamily: 'Courier Prime, monospace' }}
      >
        ENLISTMENT
      </h1>
      <p className="text-[#777777] text-xs mb-8" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
        Submit credentials to initiate field clearance. Riot ID required for operator verification.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="EMAIL ADDRESS"
          type="email"
          value={form.email}
          onChange={(v) => set('email', v)}
          placeholder="operator@domain.com"
          required
        />
        <Field
          label="PASSPHRASE"
          type="password"
          value={form.password}
          onChange={(v) => set('password', v)}
          placeholder="••••••••••••"
          required
        />
        <div className="border-t border-[#c8c3b8] pt-4">
          <div className="classification-label mb-3">RIOT ID VERIFICATION</div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="GAME NAME"
              type="text"
              value={form.riotGameName}
              onChange={(v) => set('riotGameName', v)}
              placeholder="GameName"
              required
            />
            <Field
              label="TAG LINE"
              type="text"
              value={form.riotTagLine}
              onChange={(v) => set('riotTagLine', v)}
              placeholder="NA1"
              required
            />
          </div>
          <p className="text-[#c8c3b8] text-xs mt-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
            FORMAT: GameName#TagLine — identity will be verified against Riot records.
          </p>
        </div>

        {error && (
          <div className="border border-[#1a1a1a] bg-[#ede8df] p-3">
            <span className="text-[#1a1a1a] text-xs" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              ERROR: {error}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full border border-[#1a1a1a] bg-[#1a1a1a] text-[#f5f0e8] hover:bg-transparent hover:text-[#1a1a1a] text-xs tracking-widest uppercase px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          style={{ fontFamily: 'IBM Plex Mono, monospace' }}
        >
          {loading ? 'PROCESSING...' : 'SUBMIT FOR CLEARANCE'}
        </button>
      </form>

      <p className="text-[#c8c3b8] text-xs mt-6 text-center" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
        CLEARANCE ALREADY GRANTED?{' '}
        <Link to="/authenticate" className="text-[#777777] hover:text-[#1a1a1a] transition-colors">
          AUTHENTICATE
        </Link>
      </p>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="classification-label block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#ede8df] border border-[#c8c3b8] text-[#1a1a1a] placeholder-[#c8c3b8] text-xs px-3 py-2.5 focus:outline-none focus:border-[#777777] transition-colors"
        style={{ fontFamily: 'IBM Plex Mono, monospace' }}
      />
    </div>
  )
}
