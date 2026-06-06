import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

function isErrorBoundaryClass(node: TSESTree.ClassDeclaration): boolean {
  if (!node.superClass) return false

  const methods = findNodes<TSESTree.MethodDefinition>(node, 'MethodDefinition')
  return methods.some((m) => {
    const key = m.key
    if (key.type !== 'Identifier') return false
    return (
      key.name === 'componentDidCatch' || key.name === 'getDerivedStateFromError'
    )
  })
}

let hasErrorBoundary = false
let firstFilePath = ''
let firstCheckDone = false

export function resetErrorBoundaryState(): void {
  hasErrorBoundary = false
  firstFilePath = ''
  firstCheckDone = false
}

export const missingErrorBoundaryRule: Rule = {
  id: 'missing-error-boundary',
  name: 'Missing Error Boundary',
  description: 'Codebase should have at least one error boundary component.',
  category: 'react',
  severity: 'warning',
  run(filePath, fileContent) {
    if (!firstCheckDone) {
      firstFilePath = filePath
      firstCheckDone = true
    }

    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    const classes = findNodes<TSESTree.ClassDeclaration>(ast, 'ClassDeclaration')
    if (classes.some(isErrorBoundaryClass)) {
      hasErrorBoundary = true
    }

    return []
  },
}

export function finalizeErrorBoundaryViolations(): RuleViolation[] {
  if (!hasErrorBoundary && firstFilePath) {
    return [
      {
        ruleId: 'missing-error-boundary',
        message:
          'No error boundary found in codebase. Wrap route-level components with an error boundary.',
        filePath: firstFilePath,
        line: 1,
        severity: 'warning',
        category: 'react',
      },
    ]
  }
  return []
}
