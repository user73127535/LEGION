import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

const AuthContext = createContext(null)

const ACTIVE_CELL_KEY = 'legion_active_cell'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cells, setCells] = useState([])
  const [activeCell, setActiveCellState] = useState(null)
  const [cellsLoading, setCellsLoading] = useState(false)

  const fetchCells = useCallback(async () => {
    setCellsLoading(true)
    try {
      const data = await api.getCells()
      setCells(data)
      return data
    } catch {
      setCells([])
      return []
    } finally {
      setCellsLoading(false)
    }
  }, [])

  const setActiveCell = useCallback((cell) => {
    setActiveCellState(cell)
    if (cell) {
      localStorage.setItem(ACTIVE_CELL_KEY, JSON.stringify(cell))
    } else {
      localStorage.removeItem(ACTIVE_CELL_KEY)
    }
  }, [])

  // Restore active cell from localStorage, then validate against fetched cells
  const restoreActiveCell = useCallback((fetchedCells) => {
    const stored = localStorage.getItem(ACTIVE_CELL_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const match = fetchedCells.find((c) => c.id === parsed.id)
        if (match) {
          setActiveCellState(match)
          return
        }
      } catch { /* ignore corrupt localStorage */ }
    }
    // Default to first cell if available
    if (fetchedCells.length > 0) {
      setActiveCell(fetchedCells[0])
    } else {
      setActiveCell(null)
    }
  }, [setActiveCell])

  async function refreshCells() {
    const data = await fetchCells()
    restoreActiveCell(data)
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) {
        linkRiotIdIfNeeded(session.user)
        fetchCells().then(restoreActiveCell)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' && session?.user) {
        linkRiotIdIfNeeded(session.user)
        fetchCells().then(restoreActiveCell)
      }
      if (event === 'SIGNED_OUT') {
        setCells([])
        setActiveCell(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchCells, restoreActiveCell, setActiveCell])

  // Re-validate session when the tab becomes visible again (e.g. after sleep)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      supabase.auth.getSession().then(({ data: { session: fresh } }) => {
        if (fresh) {
          setSession(fresh)
        } else if (session) {
          setSession(null)
          setCells([])
          setActiveCell(null)
        }
      })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session, setActiveCell])

  async function linkRiotIdIfNeeded(user) {
    const name = user.user_metadata?.riot_game_name
    const tag = user.user_metadata?.riot_tag_line
    if (!name || !tag) return

    try {
      await api.linkRiotId({ riotGameName: name, riotTagLine: tag })
    } catch {
      // Silent — backend may not be running or Riot key not configured
    }
  }

  async function signUp(email, password, riotGameName, riotTagLine) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { riot_game_name: riotGameName, riot_tag_line: riotTagLine } }
    })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    cells,
    cellsLoading,
    activeCell,
    setActiveCell,
    refreshCells,
    signUp,
    signIn,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
