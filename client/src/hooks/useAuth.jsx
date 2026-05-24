import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { MOCK_USER, MOCK_CELLS, MOCK_ACTIVE_CELL } from '../lib/mockData'

const AuthContext = createContext(null)

const ACTIVE_CELL_KEY = 'legion_active_cell'
const DEV_MOCK = import.meta.env.DEV

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cells, setCells] = useState([])
  const [activeCell, setActiveCellState] = useState(null)
  const [cellsLoading, setCellsLoading] = useState(true)
  const [riotLinkError, setRiotLinkError] = useState(null)

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

  const refreshCells = useCallback(async () => {
    const data = await fetchCells()
    restoreActiveCell(data)
    return data
  }, [fetchCells, restoreActiveCell])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        setLoading(false)
        linkRiotIdIfNeeded(session.user)
        fetchCells().then(restoreActiveCell)
      } else if (DEV_MOCK) {
        setSession({ user: MOCK_USER, access_token: 'mock' })
        setCells(MOCK_CELLS)
        setActiveCellState(MOCK_ACTIVE_CELL)
        setLoading(false)
        setCellsLoading(false)
      } else {
        setSession(null)
        setLoading(false)
        setCellsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && DEV_MOCK) return
      setSession(session)
      if (event === 'SIGNED_IN' && session?.user) {
        linkRiotIdIfNeeded(session.user)
        fetchCells().then(restoreActiveCell)
      }
      if (event === 'SIGNED_OUT') {
        setCells([])
        setActiveCell(null)
        setCellsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchCells, restoreActiveCell, setActiveCell])

  // Re-validate session when the tab becomes visible again (e.g. after sleep)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible' || DEV_MOCK) return
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
    if (!name || !tag) {
      console.warn('[LEGION] No Riot ID in user metadata — skipping link')
      return
    }

    try {
      await api.linkRiotId({ riotGameName: name, riotTagLine: tag })
      setRiotLinkError(null)
    } catch (err) {
      console.error(`[LEGION] Riot ID link failed for ${name}#${tag}:`, err.message)
      setRiotLinkError(`RIOT ID LINK FAILED FOR ${name}#${tag}: ${err.message}`)
    }
  }

  const signUp = useCallback(async (email, password, riotGameName, riotTagLine) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { riot_game_name: riotGameName, riot_tag_line: riotTagLine } }
    })
    if (error) throw error
    return data
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    cells,
    cellsLoading,
    activeCell,
    setActiveCell,
    refreshCells,
    riotLinkError,
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
