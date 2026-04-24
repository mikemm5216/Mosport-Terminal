import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'frontend', 'app')

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = walk(ROOT).filter((f) => /\.(ts|tsx)$/.test(f))

const violations: string[] = []

const providerRawImport = /from ['"].*provider|from ['"].*ingest/i
const logoPathConcat = /\/logos\/\$\{[^}]+\}\.png/g

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  const rel = file.replace(process.cwd() + '/', '')

  if (providerRawImport.test(content)) violations.push(`${rel}: imports raw provider code`)
  if (logoPathConcat.test(content)) violations.push(`${rel}: builds logo path from template literal`)

  if (rel.endsWith('SimulationDashboard.tsx') && /MatchesContext/.test(content)) {
    violations.push(`${rel}: simulation imports live matches context`)
  }

  if (rel.endsWith('LiveScheduleDashboard.tsx') && /playoffs\/summary|Playoff/i.test(content)) {
    violations.push(`${rel}: live dashboard imports playoff summary`)
  }

  if (rel.includes('/api/matches/') && /canonicalKey|logoUrl/.test(content) === false) {
    violations.push(`${rel}: api/matches route missing canonicalKey/logoUrl mapping`)
  }
}

if (violations.length > 0) {
  console.error('Product coherence check failed:')
  for (const v of violations) console.error(`- ${v}`)
  process.exit(1)
}

console.log('Product coherence check passed.')
