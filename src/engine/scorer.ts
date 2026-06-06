import type { AuditReport, Category, RuleViolation } from '../types'

const CATEGORY_WEIGHTS: Record<Category, number> = {
  architecture: 25,
  react: 20,
  typescript: 20,
  a11y: 20,
  performance: 15,
}

const SEVERITY_DEDUCTIONS = {
  critical: 10,
  warning: 5,
  info: 2,
}

function scoreCategory(violations: RuleViolation[]): number {
  let score = 100
  for (const v of violations) {
    score -= SEVERITY_DEDUCTIONS[v.severity]
  }
  return Math.max(0, score)
}

export function computeReport(
  violations: RuleViolation[],
  totalFiles: number,
  scannedFiles: number,
  durationMs: number,
): AuditReport {
  const categories: Category[] = ['architecture', 'react', 'typescript', 'a11y', 'performance']

  const categoryScores = {} as Record<Category, number>
  for (const cat of categories) {
    const catViolations = violations.filter((v) => v.category === cat)
    categoryScores[cat] = scoreCategory(catViolations)
  }

  const totalScore = Math.round(
    categories.reduce(
      (sum, cat) => sum + categoryScores[cat] * (CATEGORY_WEIGHTS[cat] / 100),
      0,
    ),
  )

  const criticalCount = violations.filter((v) => v.severity === 'critical').length
  const warningCount = violations.filter((v) => v.severity === 'warning').length
  const infoCount = violations.filter((v) => v.severity === 'info').length

  return {
    totalFiles,
    scannedFiles,
    totalViolations: violations.length,
    criticalCount,
    warningCount,
    infoCount,
    categoryScores,
    totalScore,
    violations,
    durationMs,
  }
}
