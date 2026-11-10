// Minimal access-request endpoint: validates input server-side, rate-limits per IP,
// rejects honeypot/too-fast submissions, and appends accepted requests to a JSONL file.
// No third-party dependencies. Also serves ./dist so one process can host the site.
import http from 'node:http'
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const DIST = join(ROOT, '..', 'dist')
const STORE = process.env.ACCESS_STORE || join(ROOT, 'data', 'access-requests.jsonl')
const PORT = Number(process.env.PORT || 8787)
const INTERESTS = ['Speech QA', 'Indic language review', 'Audio analysis', 'Regression testing', 'Product evaluation']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const hits = new Map() // ip -> timestamps
const WINDOW = 15 * 60_000
const LIMIT = 5

function limited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW)
  list.push(now)
  hits.set(ip, list)
  return list.length > LIMIT
}

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)

function validate(b) {
  const v = {
    name: clean(b.name, 120),
    email: clean(b.email, 200).toLowerCase(),
    organisation: clean(b.organisation, 160),
    role: clean(b.role, 120),
    interest: clean(b.interest, 60),
    message: clean(b.message, 1000),
  }
  const errors = {}
  if (v.name.length < 2) errors.name = 'Please enter your name.'
  if (!EMAIL.test(v.email)) errors.email = 'Please enter a valid work email.'
  if (v.organisation.length < 2) errors.organisation = 'Please enter your organisation.'
  if (v.role.length < 2) errors.role = 'Please enter your role.'
  if (!INTERESTS.includes(v.interest)) errors.interest = 'Please choose an area of interest.'
  return { v, errors }
}

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  let size = 0
  const chunks = []
  for await (const c of req) {
    size += c.length
    if (size > 10_000) throw new Error('too large')
    chunks.push(c)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain', '.xml': 'application/xml' }

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x')
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(DIST, p)
  try {
    const s = await stat(file)
    if (s.isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(DIST, 'index.html')
  }
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404).end('Not found')
  }
}

http
  .createServer(async (req, res) => {
    if (req.url?.startsWith('/api/access-requests')) {
      if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed.' })
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown'
      if (limited(ip)) return send(res, 429, { message: 'Too many requests.' })
      let body
      try {
        body = await readBody(req)
      } catch {
        return send(res, 400, { message: 'Invalid request.' })
      }
      // Bots: honeypot filled or submitted implausibly fast. Reply neutrally, store nothing.
      if (clean(body.website, 50) || Number(body.elapsedMs) < 2500) return send(res, 400, { message: 'We could not record your request.' })
      const { v, errors } = validate(body)
      if (Object.keys(errors).length) return send(res, 422, { errors, message: 'Please check the highlighted fields.' })
      try {
        await mkdir(dirname(STORE), { recursive: true })
        await appendFile(STORE, JSON.stringify({ ...v, receivedAt: new Date().toISOString() }) + '\n', { mode: 0o600 })
      } catch (e) {
        console.error('store failed', e)
        return send(res, 500, { message: 'We could not record your request. Please try again.' })
      }
      return send(res, 201, { ok: true })
    }
    return serveStatic(req, res)
  })
  .listen(PORT, () => console.log(`SvaraLens server on :${PORT}`))
