/**
 * Riot API service layer.
 *
 * Wraps all Riot endpoints with:
 *  1. Token-bucket rate limiting (20 req/sec, 100 req/2min)
 *  2. In-memory response cache (5-min TTL)
 *  3. Automatic retry on 429 (rate limited)
 *
 * The rate limiter uses a simple queue: every request goes through
 * waitForSlot() before hitting the network. This prevents bursting
 * past Riot's limits even when fetching dozens of matches at once.
 */

const RIOT_API_KEY = process.env.RIOT_API_KEY
const RIOT_REGION = process.env.RIOT_REGION || 'americas'
const LOL_REGION = process.env.LOL_REGION || 'na1'

// ── In-memory cache (5-min TTL) ──────────────────────────────────

const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000

function getCached(url) {
  if (!cache.has(url)) return null
  const { data, ts } = cache.get(url)
  if (Date.now() - ts > CACHE_TTL) {
    cache.delete(url)
    return null
  }
  return data
}

function setCache(url, data) {
  cache.set(url, { data, ts: Date.now() })
}

// ── Token-bucket rate limiter ────────────────────────────────────
// Two buckets: 20 tokens/sec and 100 tokens/2min.
// Requests wait in a FIFO queue until both buckets have capacity.

const buckets = {
  perSecond:  { tokens: 20, max: 20,  refillMs: 1000,    lastRefill: Date.now() },
  per2Min:    { tokens: 100, max: 100, refillMs: 120_000, lastRefill: Date.now() },
}

function refillBucket(b) {
  const now = Date.now()
  const elapsed = now - b.lastRefill
  const refills = Math.floor(elapsed / b.refillMs)
  if (refills > 0) {
    b.tokens = Math.min(b.max, b.tokens + refills * b.max)
    b.lastRefill += refills * b.refillMs
  }
}

function canConsume() {
  refillBucket(buckets.perSecond)
  refillBucket(buckets.per2Min)
  return buckets.perSecond.tokens > 0 && buckets.per2Min.tokens > 0
}

function consume() {
  buckets.perSecond.tokens--
  buckets.per2Min.tokens--
}

const queue = []
let draining = false

function waitForSlot() {
  return new Promise((resolve) => {
    queue.push(resolve)
    if (!draining) drainQueue()
  })
}

async function drainQueue() {
  draining = true
  while (queue.length > 0) {
    if (canConsume()) {
      consume()
      const next = queue.shift()
      next()
    } else {
      // Wait a short tick and retry
      await new Promise((r) => setTimeout(r, 60))
    }
  }
  draining = false
}

// ── Core fetch with caching + rate limiting ──────────────────────

async function riotFetch(url, retries = 2) {
  // Check cache first
  const cached = getCached(url)
  if (cached) return cached

  // Wait for rate limit slot
  await waitForSlot()

  const res = await fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  })

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10)
    console.warn(`[RIOT] Rate limited — retrying in ${retryAfter}s`)
    if (retries <= 0) throw new Error('RATE_LIMITED')
    await new Promise((r) => setTimeout(r, retryAfter * 1000))
    return riotFetch(url, retries - 1)
  }

  if (res.status === 404) {
    throw new Error('NOT_FOUND')
  }

  if (!res.ok) {
    throw new Error(`RIOT_API_ERROR:${res.status}`)
  }

  const data = await res.json()
  setCache(url, data)
  return data
}

// ── Public API ───────────────────────────────────────────────────

async function getAccountByRiotId(gameName, tagLine) {
  const url = `https://${RIOT_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  return riotFetch(url)
}

async function getMatchIds(puuid, count = 20) {
  const url = `https://${RIOT_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`
  return riotFetch(url)
}

async function getMatch(matchId) {
  const url = `https://${RIOT_REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`
  return riotFetch(url)
}

module.exports = { getAccountByRiotId, getMatchIds, getMatch }
