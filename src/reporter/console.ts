import chalk from 'chalk'
import boxen from 'boxen'
import type { AuditReport, Category } from '../types'

const CATEGORY_LABELS: Record<Category, string> = {
  architecture: 'Architecture',
  react: 'React',
  typescript: 'TypeScript',
  a11y: 'Accessibility',
  performance: 'Performance',
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10)
  const empty = 10 - filled
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
}

function scoreLabel(score: number): string {
  if (score >= 90) return chalk.green('✅ Excellent')
  if (score >= 75) return chalk.green('✅ Good')
  if (score >= 60) return chalk.yellow('⚠️  Needs Work')
  return chalk.red('❌ Poor')
}

export function printReport(report: AuditReport): void {
  console.log(
    boxen(
      chalk.bold.cyan('  spaghetti-slicer v0.1.0') +
        '\n  Scanning React/TS codebase...',
      { padding: 1, borderStyle: 'round', borderColor: 'cyan' },
    ),
  )

  const duration = (report.durationMs / 1000).toFixed(1)
  console.log(
    chalk.green('✔') +
      ` ${report.scannedFiles} files scanned in ${duration}s\n`,
  )

  const criticals = report.violations.filter((v) => v.severity === 'critical')
  const warnings = report.violations.filter((v) => v.severity === 'warning')
  const infos = report.violations.filter((v) => v.severity === 'info')

  if (criticals.length > 0) {
    console.log(chalk.red.bold(`CRITICAL (${criticals.length})`))
    for (const v of criticals) {
      console.log(
        chalk.red(`✗ ${v.filePath}:${v.line}`),
      )
      console.log(
        `  ${chalk.gray(`[${v.category}]`)} ${v.message}`,
      )
    }
    console.log()
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold(`WARNINGS (${warnings.length})`))
    for (const v of warnings) {
      console.log(
        chalk.yellow(`⚠ ${v.filePath}:${v.line}`),
      )
      console.log(
        `  ${chalk.gray(`[${v.category}]`)} ${v.message}`,
      )
    }
    console.log()
  }

  if (infos.length > 0) {
    console.log(chalk.blue.bold(`INFO (${infos.length})`))
    for (const v of infos) {
      console.log(
        chalk.blue(`ℹ ${v.filePath}:${v.line}`),
      )
      console.log(
        `  ${chalk.gray(`[${v.category}]`)} ${v.message}`,
      )
    }
    console.log()
  }

  const categories: Category[] = [
    'architecture',
    'react',
    'typescript',
    'a11y',
    'performance',
  ]

  const scoreLines = categories
    .map((cat) => {
      const s = report.categoryScores[cat]
      const label = CATEGORY_LABELS[cat].padEnd(14)
      return `  ${label} ${scoreBar(s)}  ${s}/100`
    })
    .join('\n')

  const summary = [
    chalk.bold('  AUDIT SCORE'),
    '',
    scoreLines,
    '',
    `  Total Score:   ${chalk.bold(String(report.totalScore))}/100  ${scoreLabel(report.totalScore)}`,
    '',
    `  ${chalk.red(`${report.criticalCount} critical`)}  •  ${chalk.yellow(`${report.warningCount} warnings`)}  •  ${chalk.blue(`${report.infoCount} info`)}`,
  ].join('\n')

  console.log(
    boxen(summary, {
      padding: { top: 0, bottom: 0, left: 0, right: 2 },
      borderStyle: 'round',
      borderColor: report.totalScore >= 75 ? 'green' : report.totalScore >= 60 ? 'yellow' : 'red',
    }),
  )
}
