import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const TL_CLIENT_ID = process.env.TRUELAYER_CLIENT_ID
const TL_CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET
const TL_REDIRECT_URI = 'http://localhost:3000/callback'
const FRONTEND_URL = 'http://localhost:5173'

// Step 1: Redirect user to TrueLayer to connect their bank
app.get('/api/connect', (req, res) => {
  const nonce = Math.random().toString(36).substring(2)
  const state = Math.random().toString(36).substring(2)
  const authUrl = `https://auth.truelayer.com/?response_type=code&client_id=${TL_CLIENT_ID}&redirect_uri=${encodeURIComponent(TL_REDIRECT_URI)}&scope=info%20accounts%20balance%20transactions%20cards&nonce=${nonce}&state=${state}&providers=uk-ob-all%20uk-oauth-all`
  res.json({ url: authUrl })
})

// Step 2: TrueLayer redirects here — exchange code for token, then send to frontend
app.get('/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.redirect(`${FRONTEND_URL}?tl_error=no_code`)
  try {
    const response = await fetch('https://auth.truelayer.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: TL_CLIENT_ID,
        client_secret: TL_CLIENT_SECRET,
        redirect_uri: TL_REDIRECT_URI,
        code,
      }),
    })
    const data = await response.json()
    if (data.access_token) {
      res.redirect(`${FRONTEND_URL}?tl_token=${encodeURIComponent(data.access_token)}`)
    } else {
      res.redirect(`${FRONTEND_URL}?tl_error=${encodeURIComponent(JSON.stringify(data))}`)
    }
  } catch (err) {
    res.redirect(`${FRONTEND_URL}?tl_error=${encodeURIComponent(err.message)}`)
  }
})

// Step 3: Fetch accounts
app.get('/api/accounts', async (req, res) => {
  const token = req.headers.authorization
  try {
    const response = await fetch('https://api.truelayer.com/data/v1/accounts', {
      headers: { Authorization: token },
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Fetch credit cards
app.get('/api/cards', async (req, res) => {
  const token = req.headers.authorization
  try {
    const response = await fetch('https://api.truelayer.com/data/v1/cards', {
      headers: { Authorization: token },
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/cards/:id/balance', async (req, res) => {
  const token = req.headers.authorization
  try {
    const response = await fetch(
      `https://api.truelayer.com/data/v1/cards/${req.params.id}/balance`,
      { headers: { Authorization: token } }
    )
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/cards/:id/transactions', async (req, res) => {
  const token = req.headers.authorization
  try {
    const response = await fetch(
      `https://api.truelayer.com/data/v1/cards/${req.params.id}/transactions`,
      { headers: { Authorization: token } }
    )
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Step 4: Fetch transactions for an account
app.get('/api/accounts/:id/transactions', async (req, res) => {
  const token = req.headers.authorization
  try {
    const response = await fetch(
      `https://api.truelayer.com/data/v1/accounts/${req.params.id}/transactions`,
      { headers: { Authorization: token } }
    )
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Step 5: Fetch balance for an account
app.get('/api/accounts/:id/balance', async (req, res) => {
  const token = req.headers.authorization
  try {
    const response = await fetch(
      `https://api.truelayer.com/data/v1/accounts/${req.params.id}/balance`,
      { headers: { Authorization: token } }
    )
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})