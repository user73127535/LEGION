const express = require('express')
const router = express.Router()
const { supabase } = require('../db/supabase')
const { getAccountByRiotId } = require('../services/riot')

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'AUTHENTICATION REQUIRED' })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'CLEARANCE DENIED' })
  req.user = user
  next()
}

router.post('/link', requireAuth, async (req, res) => {
  const sb = supabase
  const { riotGameName, riotTagLine } = req.body
  if (!riotGameName || !riotTagLine) {
    return res.status(400).json({ error: 'RIOT ID REQUIRED: gameName + tagLine' })
  }

  let account
  try {
    account = await getAccountByRiotId(riotGameName, riotTagLine)
  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'OPERATOR NOT FOUND IN RIOT RECORDS' })
    }
    return res.status(502).json({ error: `RIOT API UNAVAILABLE: ${err.message}` })
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

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
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
