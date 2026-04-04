import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const outDir = path.join(projectRoot, 'out')

await mkdir(projectRoot, { recursive: true })
await rm(outDir, { recursive: true, force: true })
await cp(distDir, outDir, { recursive: true })

console.log('Copied Vite build output from dist to out for Netlify.')
