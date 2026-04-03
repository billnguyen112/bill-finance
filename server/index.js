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

// Persistent token store: access_token → refresh_token (survives server restarts)
import { readFileSync, writeFileSync, existsSync } from 'fs'
const TOKEN_FILE = new URL('../.tl_tokens.json', import.meta.url).pathname
let tokenStoreData = {}
try { if (existsSync(TOKEN_FILE)) tokenStoreData = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')); } catch {}
const tokenStore = new Map(Object.entries(tokenStoreData))

function persistTokens() {
  try { writeFileSync(TOKEN_FILE, JSON.stringify(Object.fromEntries(tokenStore)), 'utf8'); } catch {}
}

// Step 1: Redirect user to TrueLayer to connect their bank
app.get('/api/connect', (req, res) => {
  const nonce = Math.random().toString(36).substring(2)
  const state = Math.random().toString(36).substring(2)
  const authUrl = `https://auth.truelayer.com/?response_type=code&client_id=${TL_CLIENT_ID}&redirect_uri=${encodeURIComponent(TL_REDIRECT_URI)}&scope=info%20accounts%20balance%20transactions%20cards%20offline_access&nonce=${nonce}&state=${state}&providers=uk-ob-all%20uk-oauth-all`
  res.json({ url: authUrl })
})

// Step 2: TrueLayer redirects here — exchange code for tokens
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
      // Store refresh token server-side (keyed by access token)
      if (data.refresh_token) {
        tokenStore.set(data.access_token, data.refresh_token)
        persistTokens()
        console.log(`[TOKEN] Stored refresh token for new connection (expires in ${data.expires_in}s)`)
      }
      res.redirect(`${FRONTEND_URL}?tl_token=${encodeURIComponent(data.access_token)}`)
    } else {
      res.redirect(`${FRONTEND_URL}?tl_error=${encodeURIComponent(JSON.stringify(data))}`)
    }
  } catch (err) {
    res.redirect(`${FRONTEND_URL}?tl_error=${encodeURIComponent(err.message)}`)
  }
})

// Refresh endpoint — exchange old access token for a new one using refresh token
app.post('/api/refresh', async (req, res) => {
  const oldToken = (req.headers.authorization || '').replace('Bearer ', '')
  const refreshToken = tokenStore.get(oldToken)

  if (!refreshToken) {
    return res.status(401).json({ error: 'no_refresh_token', message: 'No refresh token found. Please reconnect your bank.' })
  }

  try {
    const response = await fetch('https://auth.truelayer.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: TL_CLIENT_ID,
        client_secret: TL_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    })
    const data = await response.json()

    if (data.access_token) {
      // Remove old token, store new mapping
      tokenStore.delete(oldToken)
      if (data.refresh_token) {
        tokenStore.set(data.access_token, data.refresh_token)
      }
      persistTokens()
      console.log(`[TOKEN] Refreshed successfully. New token expires in ${data.expires_in}s`)
      res.json({ access_token: data.access_token })
    } else {
      tokenStore.delete(oldToken)
      console.log(`[TOKEN] Refresh failed:`, data)
      res.status(401).json({ error: 'refresh_failed', message: 'Token refresh failed. Please reconnect your bank.' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Register a refresh token manually (for tokens already in localStorage on page load)
app.post('/api/register-token', (req, res) => {
  const { accessToken, refreshToken } = req.body
  if (accessToken && refreshToken) {
    tokenStore.set(accessToken, refreshToken)
    persistTokens()
    res.json({ ok: true })
  } else {
    res.status(400).json({ error: 'missing fields' })
  }
})

// Proxy helper — wraps TrueLayer API calls with auto-refresh on 401
async function tlFetch(url, token, res) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json()

  // If token expired, tell the frontend to refresh
  if (data.error === 'invalid_access_token' || response.status === 401) {
    return res.status(401).json({ error: 'token_expired', message: 'Access token expired. Call /api/refresh.' })
  }

  res.json(data)
}

// Accounts
app.get('/api/accounts', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try { await tlFetch('https://api.truelayer.com/data/v1/accounts', token, res) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Cards
app.get('/api/cards', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try { await tlFetch('https://api.truelayer.com/data/v1/cards', token, res) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/cards/:id/balance', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try { await tlFetch(`https://api.truelayer.com/data/v1/cards/${req.params.id}/balance`, token, res) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/cards/:id/transactions', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const from = req.query.from || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  const to = req.query.to || new Date().toISOString().split('T')[0]
  try { await tlFetch(`https://api.truelayer.com/data/v1/cards/${req.params.id}/transactions?from=${from}&to=${to}`, token, res) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Account transactions
app.get('/api/accounts/:id/transactions', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const from = req.query.from || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  const to = req.query.to || new Date().toISOString().split('T')[0]
  try { await tlFetch(`https://api.truelayer.com/data/v1/accounts/${req.params.id}/transactions?from=${from}&to=${to}`, token, res) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Account balance
app.get('/api/accounts/:id/balance', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try { await tlFetch(`https://api.truelayer.com/data/v1/accounts/${req.params.id}/balance`, token, res) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// ── IBKR Client Portal Gateway Proxy ────────────────
// Gateway runs on https://localhost:5000 with self-signed cert
const IBKR_BASE = 'https://localhost:5000/v1/api'

// Allow self-signed certs for IBKR gateway
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function ibkrFetch(path, method = 'GET') {
  const url = `${IBKR_BASE}${path}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
  })
  return res.json()
}

// Check if IBKR gateway is authenticated
app.get('/api/ibkr/status', async (req, res) => {
  try {
    const data = await ibkrFetch('/iserver/auth/status')
    res.json(data)
  } catch (err) {
    res.json({ authenticated: false, error: err.message })
  }
})

// Keep session alive (call every 5 min)
app.post('/api/ibkr/tickle', async (req, res) => {
  try {
    const data = await ibkrFetch('/tickle')
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get portfolio accounts
app.get('/api/ibkr/accounts', async (req, res) => {
  try {
    const data = await ibkrFetch('/portfolio/accounts')
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get account summary (balance, NAV, margin)
app.get('/api/ibkr/account/:id/summary', async (req, res) => {
  try {
    const data = await ibkrFetch(`/portfolio/${req.params.id}/summary`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get account ledger (cash balances by currency)
app.get('/api/ibkr/account/:id/ledger', async (req, res) => {
  try {
    const data = await ibkrFetch(`/portfolio/${req.params.id}/ledger`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get positions with P&L
app.get('/api/ibkr/account/:id/positions', async (req, res) => {
  try {
    const page = req.query.page || 0
    const data = await ibkrFetch(`/portfolio/${req.params.id}/positions/${page}`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get P&L for account
app.get('/api/ibkr/pnl', async (req, res) => {
  try {
    const data = await ibkrFetch('/iserver/account/pnl/partitioned')
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get performance (TWR returns) for account — used to calculate total P&L
app.post('/api/ibkr/performance', async (req, res) => {
  try {
    const response = await fetch(`${IBKR_BASE}/pa/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Token auto-refresh enabled (refresh tokens last ~90 days)`)
  console.log(`IBKR Gateway proxy: ${IBKR_BASE}`)
})
