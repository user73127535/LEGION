require('dotenv').config()
const express = require('express')
const cors = require('cors')

const cellsRouter = require('./routes/cells')
const operatorsRouter = require('./routes/operators')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/cells', cellsRouter)
app.use('/api/operators', operatorsRouter)

app.get('/api/health', async (_req, res) => {
  // Decode JWT payload to check which role the key actually has
  let keyRole = 'unknown'
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString())
    keyRole = payload.role || 'missing'
  } catch { /* malformed key */ }

  // Live-test the Riot API key
  let riotKeyValid = false
  let riotError = null
  try {
    const riotRes = await fetch(
      'https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Coslett/ZOO',
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
    )
    riotKeyValid = riotRes.ok
    if (!riotRes.ok) riotError = `HTTP ${riotRes.status}`
  } catch (err) {
    riotError = err.message
  }

  res.json({
    status: 'OPERATIONAL',
    classification: 'UNCLASSIFIED',
    service_role_loaded: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    key_role: keyRole,
    riot_key_loaded: !!process.env.RIOT_API_KEY,
    riot_key_valid: riotKeyValid,
    riot_error: riotError,
  })
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[LEGION] Server operational on port ${PORT}`)
  })
}

module.exports = app
