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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OPERATIONAL', classification: 'UNCLASSIFIED' })
})

app.listen(PORT, () => {
  console.log(`[LEGION] Server operational on port ${PORT}`)
})
