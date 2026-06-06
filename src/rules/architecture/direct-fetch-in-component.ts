import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine, getNodeColumn } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

function isCustomHookOrService(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return (
    lower.includes('/hooks/') ||
    lower.includes('/services/') ||
    lower.includes('/api/') ||
    lower.includes('.service.') ||
    lower.includes('.hook.')
  )
}

function getFunctionName(node: TSESTree.Node): string | null {
  if (node.type === 'FunctionDeclaration') {
    return (node as TSESTree.FunctionDeclaration).id?.name ?? null
  }
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression'
  ) {
    const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent
    if (parent?.type === 'VariableDeclarator') {
      const id = (parent as TSESTree.VariableDeclarator).id
      if (id.type === 'Identifier') return id.name
    }
  }
  return null
}

function isComponentFunction(node: TSESTree.Node): boolean {
  const name = getFunctionName(node)
  if (!name) return false
  return /^[A-Z]/.test(name)
}

function attachParents(node: TSESTree.Node, parent?: TSESTree.Node): void {
  ;(node as TSESTree.Node & { parent?: TSESTree.Node }).parent = parent
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const child = (node as Record<string, unknown>)[key]
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            attachParents(item as TSESTree.Node, node)
          }
        }
      } else if ('type' in child) {
        attachParents(child as TSESTree.Node, node)
      }
    }
  }
}

function getAncestorComponentFunction(node: TSESTree.Node): TSESTree.Node | null {
  let current: TSESTree.Node | undefined = (
    node as TSESTree.Node & { parent?: TSESTree.Node }
  ).parent
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression'
    ) {
      if (isComponentFunction(current)) return current
    }
    current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent
  }
  return null
}

export const directFetchInComponentRule: Rule = {
  id: 'direct-fetch-in-component',
  name: 'Direct Fetch in Component',
  description: 'fetch/axios calls should not be made directly inside components.',
  category: 'architecture',
  severity: 'critical',
  run(filePath, fileContent) {
    if (isCustomHookOrService(filePath)) return []

    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    attachParents(ast)
    const violations: RuleViolation[] = []

    const calls = findNodes<TSESTree.CallExpression>(ast, 'CallExpression')

    for (const call of calls) {
      const callee = call.callee
      let isFetchCall = false

      if (callee.type === 'Identifier' && callee.name === 'fetch') {
        isFetchCall = true
      }

      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'axios'
      ) {
        isFetchCall = true
      }

      if (callee.type === 'Identifier' && callee.name === 'axios') {
        isFetchCall = true
      }

      if (!isFetchCall) continue

      const componentAncestor = getAncestorComponentFunction(call)
      if (!componentAncestor) continue

      violations.push({
        ruleId: 'direct-fetch-in-component',
        message:
          'Direct fetch() call found in component. Move to a custom hook or service layer.',
        filePath,
        line: getNodeLine(call),
        column: getNodeColumn(call),
        severity: 'critical',
        category: 'architecture',
      })
    }

    return violations
  },
}
