const express = require('express')
const https = require('https')
const router = express.Router()
const { supabase } = require('../db/supabase')

// Direct Riot API lookup using Node https module (fetch was failing on Vercel)
function lookupRiotAccount(gameName, tagLine) {
  return new Promise((resolve, reject) => {
    const region = process.env.RIOT_REGION || 'americas'
    const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    const options = {
      hostname: `${region}.api.riotgames.com`,
      path,
      method: 'GET',
      headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        if (res.statusCode === 404) return reject(new Error('NOT_FOUND'))
        if (res.statusCode !== 200) return reject(new Error(`RIOT_API_ERROR:${res.statusCode}:${body}`))
        try { resolve(JSON.parse(body)) }
        catch { reject(new Error(`RIOT_PARSE_ERROR:${body.slice(0, 200)}`)) }
      })
    })

    req.on('error', (err) => reject(new Error(`RIOT_NETWORK_ERROR:${err.message}`)))
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('RIOT_TIMEOUT')) })
    req.end()
  })
}

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'AUTHENTICATION REQUIRED' })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'CLEARANCE DENIED' })
  req.user = user
  next()
}

// POST /operators/validate-riot-id — public pre-signup check (no auth required)
router.post('/validate-riot-id', async (req, res) => {
  const { riotGameName, riotTagLine } = req.body
  if (!riotGameName || !riotTagLine) {
    return res.status(400).json({ error: 'RIOT ID REQUIRED: gameName + tagLine' })
  }
  try {
    const account = await lookupRiotAccount(riotGameName, riotTagLine)
    res.json({ valid: true, gameName: account.gameName, tagLine: account.tagLine })
  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'INTAKE FAILED. RIOT ID NOT FOUND IN RIOT RECORDS.' })
    }
    return res.status(502).json({ error: 'RIOT API UNAVAILABLE. TRY AGAIN SHORTLY.' })
  }
})

router.post('/link', requireAuth, async (req, res) => {
  try {
    const sb = supabase
    const { riotGameName, riotTagLine } = req.body
    if (!riotGameName || !riotTagLine) {
      return res.status(400).json({ error: 'RIOT ID REQUIRED: gameName + tagLine' })
    }

    let account
    try {
      account = await lookupRiotAccount(riotGameName, riotTagLine)
    } catch (err) {
      if (err.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'OPERATOR NOT FOUND IN RIOT RECORDS' })
      }
      console.error('[LEGION] Riot API error during link:', err.message)
      return res.status(502).json({ error: 'RIOT API UNAVAILABLE. TRY AGAIN SHORTLY.' })
    }

    const { data: existing } = await sb
      .from('operators')
      .select('user_id')
      .eq('puuid', account.puuid)
      .single()

    if (existing && existing.user_id !== req.user.id) {
      return res.status(409).json({
        error: 'RIOT ACCOUNT ALREADY LINKED TO ANOTHER OPERATOR. EACH RIOT ID MAY ONLY BE CLAIMED ONCE.'
      })
    }

    const { data, error } = await sb
      .from('operators')
      .upsert({
        user_id: req.user.id,
        puuid: account.puuid,
        riot_game_name: account.gameName,
        riot_tag_line: account.tagLine,
        is_verified: true,
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      console.error('[LEGION] DB error during operator link:', error.message)
      return res.status(500).json({ error: 'DATABASE ERROR. CONTACT HANDLER.' })
    }
    res.json(data)
  } catch (crash) {
    console.error('[LEGION] operators/link CRASH:', crash)
    res.status(500).json({ error: 'INTERNAL ERROR' })
  }
})

router.get('/:puuid', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('operators')
    .select('riot_game_name, riot_tag_line, is_verified, created_at')
    .eq('puuid', req.params.puuid)
    .single()

  if (error) return res.status(404).json({ error: 'OPERATOR NOT FOUND' })
  res.json(data)
})

module.exports = router
