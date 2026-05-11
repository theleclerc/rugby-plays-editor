import type { Plugin, Connect } from 'vite'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

interface Entry {
  name: string
  savedAt: number
  frameCount: number
}

const NAME_RE = /^[a-z0-9-_]+\.json$/i

function safeResolve(folder: string, name: string): string | null {
  if (!NAME_RE.test(name)) return null
  const resolved = path.resolve(folder, name)
  if (resolved !== folder && !resolved.startsWith(folder + path.sep)) return null
  return resolved
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

async function listFolder(folder: string): Promise<Entry[]> {
  await ensureDir(folder)
  const files = await fs.readdir(folder)
  const entries = await Promise.all(
    files
      .filter((f) => NAME_RE.test(f))
      .map(async (f) => {
        const full = path.join(folder, f)
        const stat = await fs.stat(full)
        let frameCount = 0
        try {
          const data = JSON.parse(await fs.readFile(full, 'utf8'))
          if (Array.isArray(data?.frames)) frameCount = data.frames.length
        } catch {
          /* ignore unreadable file */
        }
        return { name: f, savedAt: stat.mtimeMs, frameCount }
      }),
  )
  return entries.sort((a, b) => b.savedAt - a.savedAt)
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function makeHandler(folders: { scratch: string; examples: string }): Connect.NextHandleFunction {
  return async (req, res, next) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost')
      const segs = url.pathname.split('/').filter(Boolean)
      const which = segs[0]
      if (which !== 'scratch' && which !== 'examples') return next()

      const folder = folders[which]
      const name = segs[1]

      // /__dev__/{which}  → list (GET only)
      if (!name) {
        if (req.method !== 'GET') {
          return sendJson(res, 405, { error: 'Method not allowed' })
        }
        return sendJson(res, 200, await listFolder(folder))
      }

      // /__dev__/{which}/{name}  → CRUD on a single file
      const target = safeResolve(folder, name)
      if (!target) return sendJson(res, 400, { error: 'Invalid name' })

      if (req.method === 'GET') {
        try {
          const buf = await fs.readFile(target, 'utf8')
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(buf)
        } catch {
          return sendJson(res, 404, { error: 'Not found' })
        }
      }

      if (req.method === 'PUT') {
        await ensureDir(folder)
        const body = await readBody(req)
        try {
          JSON.parse(body)
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON body' })
        }
        await fs.writeFile(target, body, 'utf8')
        return sendJson(res, 200, { ok: true })
      }

      if (req.method === 'DELETE') {
        try {
          await fs.unlink(target)
        } catch {
          /* idempotent */
        }
        res.statusCode = 204
        return res.end()
      }

      return sendJson(res, 405, { error: 'Method not allowed' })
    } catch (err) {
      return sendJson(res, 500, { error: String(err) })
    }
  }
}

export function devStoragePlugin(): Plugin {
  return {
    name: 'rugby-dev-storage',
    apply: 'serve', // do not include in production builds
    configureServer(server) {
      const root = server.config.root
      const folders = {
        scratch: path.resolve(root, 'dev-scratch'),
        examples: path.resolve(root, 'src/examples'),
      }
      server.middlewares.use('/__dev__', makeHandler(folders))
    },
  }
}
