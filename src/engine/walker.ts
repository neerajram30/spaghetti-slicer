import { globSync } from 'glob'
import * as path from 'path'
import * as fs from 'fs'

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
]

export function walkFiles(rootPath: string): string[] {
  const absoluteRoot = path.resolve(rootPath)

  const stat = fs.statSync(absoluteRoot)
  if (stat.isFile()) {
    return [absoluteRoot]
  }

  const files = globSync('**/*.{ts,tsx,js,jsx}', {
    cwd: absoluteRoot,
    absolute: true,
    ignore: IGNORE_PATTERNS,
  })

  return files
}
