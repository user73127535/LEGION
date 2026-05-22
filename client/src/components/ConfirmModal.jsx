import { useState, useEffect, useRef } from 'react'

export default function ConfirmModal({ label, title, description, confirmText, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const match = typed.trim().toUpperCase() === confirmText.toUpperCase()

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-header">
          <div className="confirm-header-label">{label}</div>
          <div className="confirm-header-title">{title}</div>
        </div>
        <div className="confirm-body">
          <p>{description}</p>
          <div className="confirm-input-label">
            Type <strong>{confirmText}</strong> to confirm
          </div>
          <input
            ref={inputRef}
            className="confirm-input"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && match) onConfirm() }}
            placeholder={confirmText}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>CANCEL</button>
          <button className="confirm-execute" disabled={!match} onClick={onConfirm}>
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  )
}
