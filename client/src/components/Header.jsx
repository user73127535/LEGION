import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import ConfirmModal from './ConfirmModal'

export default function Header() {
  const { user, logout, cells, activeCell, setActiveCell, refreshCells } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dissolveTarget, setDissolveTarget] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [managingCellId, setManagingCellId] = useState(null)
  const [managedMembers, setManagedMembers] = useState([])
  const [managingLoading, setManagingLoading] = useState(false)
  const dropdownRef = useRef(null)

  const isAuthPage = location.pathname === '/authenticate'

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setManagingCellId(null)
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
    setManagingCellId(null)
    if (location.pathname === '/briefing' || location.pathname === '/oplog') return
    navigate('/briefing')
  }

  const handleDissolve = useCallback(async () => {
    if (!dissolveTarget) return
    try {
      await api.deleteCell(dissolveTarget.id)
      await refreshCells()
      setDissolveTarget(null)
      setManagingCellId(null)
      setDropdownOpen(false)
      navigate('/briefing')
    } catch (err) {
      alert(err.message)
    }
  }, [dissolveTarget, refreshCells, navigate])

  async function handleManageToggle(e, cell) {
    e.stopPropagation()
    if (managingCellId === cell.id) {
      setManagingCellId(null)
      return
    }
    setManagingCellId(cell.id)
    setManagingLoading(true)
    try {
      const data = await api.getCell(cell.id)
      setManagedMembers(data.members || [])
    } catch {
      setManagedMembers([])
    } finally {
      setManagingLoading(false)
    }
  }

  const handleRemoveOperator = useCallback(async () => {
    if (!removeTarget) return
    try {
      await api.removeOperator(removeTarget.cellId, removeTarget.userId)
      setRemoveTarget(null)
      // Refresh member list
      const data = await api.getCell(removeTarget.cellId)
      setManagedMembers(data.members || [])
      await refreshCells()
    } catch (err) {
      alert(err.message)
    }
  }, [removeTarget, refreshCells])

  const riotName = user?.user_metadata?.riot_game_name
  const riotTag = user?.user_metadata?.riot_tag_line

  const briefingLink = '/briefing'
  const oplogLink = '/oplog'

  return (
    <>
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
                {cells.map((cell) => {
                  const isHandler = cell.created_by === user?.id
                  const isManaging = managingCellId === cell.id
                  return (
                    <div key={cell.id} className="cs-cell-entry">
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
                          {isHandler && (
                            <span
                              className="cs-manage-btn"
                              title="Manage operators"
                              onClick={(e) => handleManageToggle(e, cell)}
                            >
                              {isManaging ? '▴' : '▾'}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Handler management panel */}
                      {isHandler && isManaging && (
                        <div className="cs-manage-panel">
                          <div className="cs-manage-label">OPERATORS ON FILE</div>
                          {managingLoading ? (
                            <div className="cs-manage-loading">RETRIEVING ROSTER...</div>
                          ) : (
                            <div className="cs-manage-list">
                              {managedMembers.map((member) => {
                                const isYou = member.user_id === user?.id || member.id === user?.id
                                const displayName = member.riot_game_name || 'UNKNOWN'
                                return (
                                  <div key={member.user_id || member.id} className="cs-manage-row">
                                    <span className="cs-manage-name">
                                      {displayName}
                                      {isYou && <span className="cs-manage-you">YOU</span>}
                                    </span>
                                    {!isYou && (
                                      <button
                                        className="cs-manage-remove"
                                        onClick={() => setRemoveTarget({
                                          cellId: cell.id,
                                          userId: member.user_id || member.id,
                                          name: displayName,
                                        })}
                                      >
                                        REMOVE
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          <button
                            className="cs-manage-dissolve"
                            onClick={() => setDissolveTarget(cell)}
                          >
                            DISSOLVE CELL
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
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

    {dissolveTarget && (
      <ConfirmModal
        label="IRREVERSIBLE ACTION"
        title={`Dissolve ${dissolveTarget.name}?`}
        description="This will permanently dissolve the cell and remove all operators. All associated case data will be lost. This action cannot be undone."
        confirmText={dissolveTarget.name}
        onConfirm={handleDissolve}
        onCancel={() => setDissolveTarget(null)}
      />
    )}

    {removeTarget && (
      <ConfirmModal
        label="HANDLER ACTION"
        title={`Remove ${removeTarget.name}?`}
        description={`This will remove ${removeTarget.name} from the cell. They will lose access to all cell intelligence and operation logs. They can rejoin later with a valid intake code.`}
        confirmText={removeTarget.name}
        onConfirm={handleRemoveOperator}
        onCancel={() => setRemoveTarget(null)}
      />
    )}
    </>
  )
}
