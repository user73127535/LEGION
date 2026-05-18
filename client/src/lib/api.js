import { supabase } from './supabase'

const BASE = '/api'

/**
 * Wrapper around fetch that:
 *  1. Reads the current Supabase session token
 *  2. Attaches it as a Bearer token on every request
 *  3. Parses JSON responses and throws on errors
 *
 * Without this, every authenticated backend route returns 401
 * because the server checks for a valid JWT in the Authorization header.
 */
async function request(path, options = {}) {
  // Get the current session's access token
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }

  return res.json()
}

export const api = {
  // Cell endpoints
  getCells: () => request('/cells'),
  createCell: (data) =>
    request('/cells', { method: 'POST', body: JSON.stringify(data) }),
  getCell: (id) => request(`/cells/${id}`),
  joinCell: (id, data) =>
    request(`/cells/${id}/join`, { method: 'POST', body: JSON.stringify(data) }),
  joinCellByCode: (invite_code) =>
    request('/cells/join-by-code', { method: 'POST', body: JSON.stringify({ invite_code }) }),
  deleteCell: (id) =>
    request(`/cells/${id}`, { method: 'DELETE' }),

  // Match ingest — pulls new match data from Riot API for a cell
  ingestMatches: (id) =>
    request(`/cells/${id}/ingest`, { method: 'POST' }),

  // Stats endpoints (read from cached DB data, no Riot API calls)
  getCellStats: (id) => request(`/cells/${id}/stats`),
  getOperationLog: (id) => request(`/cells/${id}/operations`),

  // Operator endpoints
  getOperator: (puuid) => request(`/operators/${puuid}`),
  linkRiotId: (data) =>
    request('/operators/link', { method: 'POST', body: JSON.stringify(data) }),
}
