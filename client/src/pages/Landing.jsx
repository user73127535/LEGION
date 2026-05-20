import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

function R({ w, h = 8 }) {
  return <span className="redacted-inline" style={{ height: h, width: w, verticalAlign: 'middle' }} />
}

export default function Landing() {
  return (
    <div className="landing-body">
      <section className="hero intel-stagger">
        <h1>LEGION</h1>
        <p className="tagline">Surveillance on cells that queue together.</p>
        <p className="tagline-sub">
          LEGION compiles intelligence on cells of two or more cooperating
          operators. Joint deployments are logged, indexed, and assessed against{' '}
          <R w={54} h={11} />{' '}
          baselines. Solo activity is out of scope.
        </p>
        <div className="cta-group">
          <Link to="/authenticate" className="btn btn-primary">Open a New File</Link>
          <Link to="/authenticate" className="cta-secondary-link">
            Already on file? Authenticate &rarr;
          </Link>
        </div>
      </section>

      <section className="stats-strip intel-reveal reveal-d3">
        <div className="stats-strip-inner intel-stagger">
          <div className="stat-block">
            <div className="stat-block-value"><R w={72} h={30} /></div>
            <div className="stat-block-label">
              Matches Filed <span style={{ opacity: 0.6 }}>[CLASSIFIED]</span>
            </div>
          </div>
          <div className="stat-block">
            <div className="stat-block-value"><R w={88} h={30} /></div>
            <div className="stat-block-label">
              Cells Under Surveillance <span style={{ opacity: 0.6 }}>[CLASSIFIED]</span>
            </div>
          </div>
          <div className="stat-block">
            <div className="stat-block-value"><R w={62} h={30} /></div>
            <div className="stat-block-label">
              Operators on File <span style={{ opacity: 0.6 }}>[CLASSIFIED]</span>
            </div>
          </div>
          <div className="stat-block">
            <div className="stat-block-value">0</div>
            <div className="stat-block-label">Solo Reports Filed</div>
          </div>
        </div>
      </section>

      <section className="features intel-reveal reveal-d5">
        <div className="features-intro">
          <div className="eyebrow eyebrow-green">&bull; FILE CONTENTS</div>
          <h2>Intelligence compiled at the cell level.</h2>
          <p>
            Every cell file resolves to two living documents, refreshed as new
            matches are filed under <R w={48} h={11} />.
          </p>
        </div>
        <div className="features-grid intel-stagger">
          <div className="feature">
            <div className="feature-number">
              REPORT-01 &middot; BRIEFING &middot; <R w={36} />
            </div>
            <div className="feature-title">Cell intelligence summary</div>
            <p className="feature-desc">
              Joint WR vs. the counterfactual baseline. Operator roster with
              per-subject subtraction analysis. Champion pools. Pair-level WR
              matrix. Tilt index and post-loss cohesion decay. Behavioral
              observations filed by mode and time of day.
            </p>
          </div>
          <div className="feature">
            <div className="feature-number">REPORT-02 &middot; OPERATION LOG</div>
            <div className="feature-title">Joint deployments, indexed</div>
            <p className="feature-desc">
              Match history scoped to engagements with two or more operators on
              the same team. Per-match KDA, champion, and damage tabulated by
              operator. Filterable by theater, outcome, and operator. Solo
              matches are out of scope and not retained.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
