export type Severity = 'critical' | 'warning' | 'info'

export type Category =
  | 'architecture'
  | 'react'
  | 'typescript'
  | 'a11y'
  | 'performance'

export interface RuleViolation {
  ruleId: string
  message: string
  filePath: string
  line: number
  column?: number
  severity: Severity
  category: Category
}

export interface RuleResult {
  ruleId: string
  violations: RuleViolation[]
}

export interface Rule {
  id: string
  name: string
  description: string
  category: Category
  severity: Severity
  run: (filePath: string, fileContent: string) => RuleViolation[]
}

export interface AuditReport {
  totalFiles: number
  scannedFiles: number
  totalViolations: number
  criticalCount: number
  warningCount: number
  infoCount: number
  categoryScores: Record<Category, number>
  totalScore: number
  violations: RuleViolation[]
  durationMs: number
}
