import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'

export default function Header() {
  const { user, logout, cells, activeCell, setActiveCell, refreshCells } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [confirmDissolve, setConfirmDissolve] = useState(null)
  const dropdownRef = useRef(null)

  const isAuthPage = location.pathname === '/authenticate'

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function handleCellSelect(cell) {
    setActiveCell(cell)
    setDropdownOpen(false)
    setConfirmDissolve(null)
    if (location.pathname === '/briefing' || location.pathname === '/oplog') return
    navigate('/briefing')
  }

  async function handleDissolve(cellId) {
    try {
      await api.deleteCell(cellId)
      await refreshCells()
      setConfirmDissolve(null)
      setDropdownOpen(false)
      navigate('/briefing')
    } catch (err) {
      alert(err.message)
    }
  }

  const riotName = user?.user_metadata?.riot_game_name
  const riotTag = user?.user_metadata?.riot_tag_line

  const briefingLink = '/briefing'
  const oplogLink = '/oplog'

  return (
    <header className="site-header">
      <div className="header-left">
        <Link to="/" className="logo">LEGION</Link>

        <div
          className={`cell-switcher${dropdownOpen ? ' open' : ''}${user ? '' : ' disabled'}`}
          ref={dropdownRef}
          aria-disabled={!user}
          title={user ? undefined : 'Authenticate to access case files'}
        >
          <button
            className="cell-switcher-trigger"
            type="button"
            tabIndex={user ? 0 : -1}
            onClick={() => user && setDropdownOpen(!dropdownOpen)}
          >
            {user && activeCell ? (
              <>
                <span>{activeCell.name}</span>
                <span className="chev">&#9662;</span>
              </>
            ) : user ? (
              <>
                <span style={{ opacity: 0.5 }}>NO ACTIVE CELL</span>
                <span className="chev">&#9662;</span>
              </>
            ) : (
              <>
                <span className="cs-redacted-bar"></span>
                <span className="chev">&#9662;</span>
              </>
            )}
          </button>

          <div className="cell-switcher-dropdown">
            {cells.length === 0 ? (
              <div className="cs-section-label">NO ACTIVE CASE FILES</div>
            ) : (
              <>
                <div className="cs-section-label">CASE FILES</div>
                {cells.map((cell) => (
                  <div key={cell.id} className="cs-cell-entry">
                    {confirmDissolve === cell.id ? (
                      <div className="cs-confirm-dissolve">
                        <div className="cs-confirm-text">DISSOLVE {cell.name}?</div>
                        <div className="cs-confirm-actions">
                          <button className="cs-confirm-yes" onClick={() => handleDissolve(cell.id)}>
                            CONFIRM
                          </button>
                          <button className="cs-confirm-no" onClick={() => setConfirmDissolve(null)}>
                            CANCEL
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={`cs-cell-row${activeCell?.id === cell.id ? ' active' : ''}`}
                        onClick={() => handleCellSelect(cell)}
                      >
                        <div className="cs-cell-name">
                          {cell.name}
                          {activeCell?.id === cell.id && <span className="cs-cell-check">&#10003;</span>}
                        </div>
                        <div className="cs-cell-meta">
                          {cell.member_count} OPERATOR{cell.member_count !== 1 ? 'S' : ''}
                          {cell.created_by === user?.id && (
                            <span
                              className="cs-dissolve-btn"
                              title="Dissolve cell"
                              onClick={(e) => { e.stopPropagation(); setConfirmDissolve(cell.id) }}
                            >
                              &#x2715;
                            </span>
                          )}
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
            <hr className="cs-divider" />
            <button
              className="cs-action-row"
              onClick={() => { setDropdownOpen(false); navigate('/intake') }}
            >
              <span className="cs-plus">+</span> Open New File
            </button>
          </div>
        </div>

        <nav>
          <NavLink to={briefingLink}>Briefing</NavLink>
          <NavLink to={oplogLink}>Operation Log</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </div>

      <div className="header-right">
        {user ? (
          <>
            {riotName && (
              <span className="user-badge">
                <strong>{riotName}</strong> #{riotTag}
              </span>
            )}
            <button className="logout-btn" onClick={handleLogout}>Disengage</button>
          </>
        ) : (
          !isAuthPage && (
            <Link to="/authenticate" className="header-cta">Authenticate</Link>
          )
        )}
      </div>
    </header>
  )
}
