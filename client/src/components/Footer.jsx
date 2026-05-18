function R({ w, h = 8 }) {
  return <span className="redacted-inline" style={{ height: h, width: w }} />
}

export default function Footer({ docCode = '', office = 'LEGION/OPS', extra }) {
  return (
    <footer className="site-footer">
      DOCUMENT REF: LGN-2026-{docCode}<R w={24} />
      &nbsp;//&nbsp; ORIGINATING OFFICE: {office}
      &nbsp;//&nbsp; OVERSIGHT: <R w={38} />
      &nbsp;//&nbsp; {extra || (<>DISTRIBUTION LIMITED &nbsp;//&nbsp; DECLASSIFY ON: <R w={54} /></>)}
    </footer>
  )
}
