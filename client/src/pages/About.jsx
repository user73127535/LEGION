import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

function R({ w, h = 8 }) {
  return <span className="redacted-inline" style={{ height: h, width: w, verticalAlign: 'middle' }} />
}

export default function About() {
  return (
    <>
      <section className="about-hero">
        <div className="doc-stamp">
          <div className="stamp-block">
            DOCUMENT<br />
            <strong>LGN-ABOUT-001</strong>
          </div>
          <div className="stamp-block accent">
            STATUS<br />
            <strong>PUBLIC RELEASE</strong>
          </div>
          <div className="stamp-block">
            INITIATIVE<br />
            <strong>LEGION</strong>
          </div>
        </div>
        <div className="hero-body">
          <div className="eyebrow eyebrow-green">
            <span className="live-dot"></span> BRIEFING &middot; DECLASSIFIED
            FOR PUBLIC RELEASE &middot; AUTHORITY <R w={34} h={9} />
          </div>
          <h1 className="title-hero">About LEGION</h1>
          <p className="lead">
            LEGION operates under ZOO directive <R w={54} h={13} />. Files are
            maintained on cells of two or more cooperating operators conducting
            joint deployments. Engagements are logged, indexed, and assessed
            against <R w={78} h={13} /> baselines.
          </p>
          <p className="lead">
            Solo activity falls outside operational scope; that signal is
            well-served by adjacent agencies. Subjects volunteering cell
            membership for surveillance are processed through standard intake.
            Petitioning instructions follow.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div className="eyebrow">&bull; INTAKE PROCEDURE</div>
          <h2>How to open a file.</h2>
          <p className="section-lede">
            Four stages from petition to first briefing. Each stage appends data
            to the cell's case file.
          </p>
        </div>
        <div className="intake-list">
          <div className="intake-step">
            <div className="intake-num">01</div>
            <div>
              <h3>Open the new file</h3>
              <p>
                Submit the intake form. An account is provisioned and a case file
                is opened on the cell. The case is indexed by file number and
                tagged for monitoring.
              </p>
            </div>
          </div>
          <div className="intake-step">
            <div className="intake-num">02</div>
            <div>
              <h3>Link a Riot account</h3>
              <p>
                One Riot ID is bound to the file at intake. The corresponding
                PUUID is recorded and cross-referenced against match logs at each
                subsequent poll. Linkage is verified before the file is sealed.
              </p>
            </div>
          </div>
          <div className="intake-step">
            <div className="intake-num">03</div>
            <div>
              <h3>Designate the cell</h3>
              <p>
                Name the cell. Up to 10 operators may be associated with a single
                file. Each additional operator is appended via invite code or by
                Riot ID; appended operators are tagged for monitoring on a rolling
                basis.
              </p>
            </div>
          </div>
          <div className="intake-step">
            <div className="intake-num">04</div>
            <div>
              <h3>Deploy</h3>
              <p>
                Queue together. LEGION compiles intelligence on joint deployments
                only. The first briefing is filed after the next match in which
                two or more cell operators are deployed on the same team.
                Briefings refresh as new matches are logged.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div className="eyebrow">&bull; TERMINOLOGY</div>
          <h2>Glossary of field terms.</h2>
          <p className="section-lede">
            LEGION uses intelligence-community vocabulary throughout the
            interface. Translate as needed.
          </p>
        </div>
        <div className="term-grid">
          <div className="term-row">
            <div className="term-label">CELL</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">A registered group of up to 10 cooperating operators.</div>
          </div>
          <div className="term-row">
            <div className="term-label">OPERATOR</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">A single player linked to a cell via Riot ID.</div>
          </div>
          <div className="term-row">
            <div className="term-label">OPEN NEW FILE</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">Submit a cell to LEGION for surveillance. Triggers case-file creation.</div>
          </div>
          <div className="term-row">
            <div className="term-label">AUTHENTICATE</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">Sign in to an existing operator account.</div>
          </div>
          <div className="term-row">
            <div className="term-label">BRIEFING</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">The cell's primary surveillance summary. Updated as new matches are filed.</div>
          </div>
          <div className="term-row">
            <div className="term-label">OPERATION LOG</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">Match history filtered to joint deployments. Solo matches are out of scope.</div>
          </div>
          <div className="term-row">
            <div className="term-label">JOINT DEPLOYMENT</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">A match in which two or more cell operators were on the same team.</div>
          </div>
          <div className="term-row">
            <div className="term-label">TILT INDEX</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">Composite metric tracking post-loss cohesion decay across consecutive-loss sequences.</div>
          </div>
          <div className="term-row">
            <div className="term-label">ZOO</div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">
              <R w={62} h={13} />. Parent agency. LEGION operates as one of
              several initiatives under its directive.
            </div>
          </div>
          <div className="term-row">
            <div className="term-label"><R w={88} h={13} /></div>
            <div className="term-arrow">&rarr;</div>
            <div className="term-def">
              <R w={62} h={13} /> <R w={142} h={13} />.{' '}
              <R w={74} h={13} /> following <R w={54} h={13} /> protocol.
            </div>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="eyebrow eyebrow-green">&bull; INTAKE OPEN</div>
        <h3>Open a new file on your cell.</h3>
        <p>
          Submit the cell to LEGION for surveillance. Link one Riot ID, designate
          the cell, append additional operators. The first briefing is filed after
          the next joint deployment.
        </p>
        <div className="cta-group">
          <Link to="/authenticate" className="btn btn-accent">Open New File</Link>
          <Link to="/" className="btn btn-secondary">Return to Home</Link>
        </div>
      </section>

      <Footer
        docCode="ABOUT-"
        office="LEGION/ANALYSIS"
        extra="CLEARED FOR EXTERNAL DISTRIBUTION"
      />
    </>
  )
}
