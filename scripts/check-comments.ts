import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const maxShare = 0.1
const args = process.argv.slice(2)
const cached = args.includes('--cached')
const baseIndex = args.indexOf('--base')
const base = baseIndex === -1 ? 'HEAD' : args[baseIndex + 1]

const git = (command: string): string => {
  return execSync(`git ${command}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

const isComment = (line: string): boolean => {
  return line.trim().startsWith('//')
}

const blockLimit = (block: Array<string>): number => {
  const text = block.join('\n')

  return text.includes('://') || text.includes('biome-ignore') ? 2 : 1
}

const commentShare = (source: string): number => {
  const lines = source.split('\n').filter((line) => line.trim() !== '')
  const comments = lines.filter(isComment).length

  return lines.length === 0 ? 0 : comments / lines.length
}

const readBase = (path: string): string => {
  try {
    return git(`show ${cached ? ':' : `${base}:`}${path}`)
  } catch {
    return ''
  }
}

const readHead = (path: string): string => {
  if (cached) {
    return git(`show :${path}`)
  }

  return readFileSync(path, 'utf8')
}

const diff = git(`diff ${cached ? '--cached' : base} --unified=0 -- 'src/*.ts' 'src/**/*.ts'`)
const failures: Array<string> = []
let path = ''
let block: Array<string> = []

const flush = () => {
  if (block.length > blockLimit(block)) {
    failures.push(
      `${path}: ${block.length} comment lines added, starting "${block[0].trim().slice(0, 70)}"`,
    )
  }

  block = []
}

for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) {
    flush()
    path = line.slice(6)
  } else if (line.startsWith('+') && !line.startsWith('+++') && isComment(line.slice(1))) {
    block.push(line.slice(1))
  } else {
    flush()
  }
}

flush()

const touched = [
  ...new Set(
    diff
      .split('\n')
      .filter((line) => line.startsWith('+++ b/'))
      .map((line) => line.slice(6)),
  ),
]

for (const file of touched) {
  const share = commentShare(readHead(file))
  const before = commentShare(cached ? git(`show HEAD:${file}`).toString() : readBase(file))

  if (share > maxShare && share > before) {
    failures.push(
      `${file}: comment share ${Math.round(share * 100)}% is above ${maxShare * 100}% and rose from ${Math.round(before * 100)}%`,
    )
  }
}

if (failures.length > 0) {
  console.error(
    'Comments outside the allowed kinds (a link, a typo guard or a lint reason, one line each):',
  )
  for (const failure of failures) {
    console.error(`  ${failure}`)
  }
  process.exit(1)
}
