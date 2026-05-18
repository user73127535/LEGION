import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Footer from '../components/Footer'

export default function Authenticate() {
  const { signIn, signUp, user, cells, cellsLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('return_to')
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [riotName, setRiotName] = useState('')
  const [riotTag, setRiotTag] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  if (user && cellsLoading) return null
  if (user) {
    if (returnTo) return <Navigate to={returnTo} replace />
    return <Navigate to={cells.length > 0 ? '/briefing' : '/intake'} replace />
  }

  function switchMode(next) {
    setMode(next)
    setError(null)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      // The Navigate redirect at the top handles routing once user/cells are loaded
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signUp(email, password, riotName, riotTag)
      setSignUpSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="form-wrapper">
        <div className="form-card">
          <div className="form-card-banner">
            CONFIDENTIAL // OPERATOR AUTHENTICATION // HANDLE WITH CARE
          </div>
          <h1 className="form-title">Authenticate</h1>
          <p className="form-subtitle">
            Sign in to an existing operator file, or open a new one. Cell
            designation follows after authentication.
          </p>

          <div className="auth-tabs" role="tablist">
            <button
              className={`auth-tab${mode === 'signin' ? ' active' : ''}`}
              type="button"
              role="tab"
              onClick={() => switchMode('signin')}
            >
              Sign In
            </button>
            <button
              className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
              type="button"
              role="tab"
              onClick={() => switchMode('signup')}
            >
              New Operator
            </button>
          </div>

          {error && (
            <div className="auth-error">ACCESS DENIED: {error}</div>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn}>
              <div className="field">
                <label>EMAIL</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'VERIFYING...' : 'AUTHENTICATE'}
              </button>
              <div className="forgot-link">
                <a href="#">Forgot password?</a>
              </div>
            </form>
          )}

          {mode === 'signup' && !signUpSuccess && (
            <form onSubmit={handleSignUp}>
              <div className="field">
                <label>EMAIL</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>PASSWORD</label>
                <input
                  type="password"
                  placeholder="minimum eight characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="riot-id-row">
                <div className="field">
                  <label>RIOT GAME NAME</label>
                  <input
                    type="text"
                    placeholder="YourName"
                    value={riotName}
                    onChange={(e) => setRiotName(e.target.value)}
                    required
                  />
                </div>
                <div className="riot-id-hash">#</div>
                <div className="field">
                  <label>TAG</label>
                  <input
                    type="text"
                    placeholder="NA1"
                    value={riotTag}
                    onChange={(e) => setRiotTag(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'PROCESSING...' : 'OPEN OPERATOR FILE'}
              </button>
            </form>
          )}

          {mode === 'signup' && signUpSuccess && (
            <div className="auth-success">
              <div className="eyebrow eyebrow-green">IDENTITY LOGGED</div>
              <p>
                Confirmation transmitted to the provided address. Verify your
                identity to complete intake. Check your email.
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer docCode="AUTH-" office="LEGION/AUTH" />
    </>
  )
}
