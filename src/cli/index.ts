#!/usr/bin/env node
import { Command } from 'commander'
import ora from 'ora'
import * as fs from 'fs'
import { walkFiles } from '../engine/walker'
import { computeReport } from '../engine/scorer'
import {
  allRules,
  finalizeErrorBoundaryViolations,
  resetErrorBoundaryState,
} from '../rules/index'
import { printReport } from '../reporter/console'
import { toJSON } from '../reporter/json'
import type { Category, RuleViolation } from '../types'

const program = new Command()

program
  .name('spaghetti-slicer')
  .description('Frontend best practices auditor for React/TypeScript codebases')
  .version('0.1.0')
  .argument('<path>', 'Directory or file to audit')
  .option('--json', 'Output results as JSON to stdout')
  .option('--fix', 'Show auto-fix suggestions')
  .option('--rule <category>', 'Only run rules from one category')
  .option('--min-score <number>', 'Exit with code 1 if score is below threshold')
  .action(async (targetPath: string, options: {
    json?: boolean
    fix?: boolean
    rule?: string
    minScore?: string
  }) => {
    const start = Date.now()
    if (!fs.existsSync(targetPath)) {
      console.error(`Error: path '${targetPath}' does not exist.`)
      process.exit(1)
    }

    const files = walkFiles(targetPath)
    const totalFiles = files.length

    let activeRules = allRules
    if (options.rule) {
      const cat = options.rule as Category
      activeRules = allRules.filter((r) => r.category === cat)
    }

    resetErrorBoundaryState()

    const spinner = options.json ? null : ora(`Scanning ${totalFiles} files...`).start()

    const allViolations: RuleViolation[] = []
    let scannedFiles = 0

    for (const filePath of files) {
      let content: string
      try {
        content = fs.readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      for (const rule of activeRules) {
        try {
          const violations = rule.run(filePath, content)
          allViolations.push(...violations)
        } catch {
          // skip rule errors
        }
      }
      scannedFiles++
    }

    const errorBoundaryViolations = finalizeErrorBoundaryViolations()
    allViolations.push(...errorBoundaryViolations)

    spinner?.succeed(`${scannedFiles} files scanned`)

    const durationMs = Date.now() - start
    const report = computeReport(allViolations, totalFiles, scannedFiles, durationMs)

    if (options.json) {
      process.stdout.write(toJSON(report) + '\n')
    } else {
      printReport(report)

      if (options.fix) {
        console.log('\nAuto-fix suggestions:')
        console.log('  Run: eslint --fix for no-explicit-any violations')
        console.log('  Run: eslint-plugin-jsx-a11y for accessibility violations')
      }
    }

    const minScore = options.minScore ? parseInt(options.minScore, 10) : null
    if (minScore !== null && report.totalScore < minScore) {
      process.exit(1)
    }
  })

program.parse()
