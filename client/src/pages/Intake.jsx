import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import Footer from '../components/Footer'

function R({ w, h = 8 }) {
  return <span className="redacted-inline" style={{ height: h, width: w, verticalAlign: 'middle' }} />
}

export default function Intake() {
  const navigate = useNavigate()
  const { refreshCells, setActiveCell } = useAuth()
  const [mode, setMode] = useState('new')
  const [cellName, setCellName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function selectOption(next) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'new') {
        if (!cellName.trim()) {
          setError('CELL NAME IS REQUIRED.')
          setLoading(false)
          return
        }
        const cell = await api.createCell({ name: cellName.trim() })
        setActiveCell(cell)
        await refreshCells()
        navigate('/briefing')
      } else {
        if (!inviteCode.trim()) {
          setError('INVITE CODE IS REQUIRED.')
          setLoading(false)
          return
        }
        const result = await api.joinCellByCode(inviteCode.trim())
        const cells = await refreshCells()
        const joined = cells.find((c) => c.id === result.cell_id)
        if (joined) setActiveCell(joined)
        navigate('/briefing')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="form-wrapper">
        <form className="form-card intake-form-card" onSubmit={handleSubmit}>
          <div className="form-card-banner">
            CONFIDENTIAL // CELL INTAKE // HANDLE WITH CARE
          </div>
          <h1 className="form-title">Open a New File</h1>
          <p className="form-subtitle">
            Designate the cell. A case file will be opened on intake; subsequent
            joint deployments are logged and assessed against{' '}
            <R w={48} h={11} /> baselines.
          </p>

          {error && (
            <div className="auth-error">{error}</div>
          )}

          <div
            className={`cell-option${mode === 'new' ? ' selected' : ''}`}
            onClick={() => selectOption('new')}
          >
            <div className="radio-dot" />
            <div>
              <div className="option-title">Open a New Case</div>
              <div className="option-desc">
                Additional operators may be appended after intake.
              </div>
            </div>
          </div>

          {mode === 'new' && (
            <div className="cell-name-field">
              <div className="field">
                <label>CELL NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Zoo 2"
                  value={cellName}
                  onChange={(e) => setCellName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div
            className={`cell-option${mode === 'join' ? ' selected' : ''}`}
            onClick={() => selectOption('join')}
          >
            <div className="radio-dot" />
            <div>
              <div className="option-title">Join an Existing Case</div>
              <div className="option-desc">
                Provide the invite code issued by the case file owner.
              </div>
            </div>
          </div>

          {mode === 'join' && (
            <div className="cell-name-field">
              <div className="field">
                <label>INVITE CODE</label>
                <input
                  type="text"
                  placeholder="LGN-XXXX-XXXX"
                  className="invite-code-input"
                  maxLength={12}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'PROCESSING...' : 'OPEN NEW FILE'}
          </button>
        </form>
      </section>

      <Footer
        docCode="INTAKE-"
        office="LEGION/INTAKE"
        extra="DISTRIBUTION LIMITED // DECLASSIFY ON: CASE CLOSURE"
      />
    </>
  )
}
