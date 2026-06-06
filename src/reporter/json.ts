import type { AuditReport } from '../types'

export function toJSON(report: AuditReport): string {
  return JSON.stringify(report, null, 2)
}
