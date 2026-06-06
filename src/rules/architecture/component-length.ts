import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

const COMPONENT_MAX_LINES = 200

function returnsJSX(node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression): boolean {
  const returns = findNodes<TSESTree.ReturnStatement>(node, 'ReturnStatement')
  return returns.some((r) => {
    if (!r.argument) return false
    const arg = r.argument
    return (
      arg.type === 'JSXElement' ||
      arg.type === 'JSXFragment' ||
      (arg.type === 'ParenthesizedExpression' &&
        ((arg as TSESTree.Node & { expression: TSESTree.Node }).expression.type === 'JSXElement' ||
          (arg as TSESTree.Node & { expression: TSESTree.Node }).expression.type === 'JSXFragment'))
    )
  })
}

function getFunctionName(
  node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression,
): string {
  if (node.type === 'FunctionDeclaration') return node.id?.name ?? 'Anonymous'
  const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent
  if (parent?.type === 'VariableDeclarator') {
    const id = (parent as TSESTree.VariableDeclarator).id
    if (id.type === 'Identifier') return id.name
  }
  return 'Anonymous'
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

export const componentLengthRule: Rule = {
  id: 'component-length',
  name: 'Component Length',
  description: 'React components should not exceed 200 lines.',
  category: 'architecture',
  severity: 'critical',
  run(filePath, fileContent) {
    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    attachParents(ast)
    const violations: RuleViolation[] = []

    const funcDecls = findNodes<TSESTree.FunctionDeclaration>(ast, 'FunctionDeclaration')
    for (const node of funcDecls) {
      if (!returnsJSX(node)) continue
      const start = node.loc?.start.line ?? 0
      const end = node.loc?.end.line ?? 0
      const lines = end - start + 1
      if (lines > COMPONENT_MAX_LINES) {
        const name = getFunctionName(node)
        violations.push({
          ruleId: 'component-length',
          message: `Component '${name}' is ${lines} lines. Break it into smaller components.`,
          filePath,
          line: getNodeLine(node),
          severity: 'critical',
          category: 'architecture',
        })
      }
    }

    const arrowFns = findNodes<TSESTree.ArrowFunctionExpression>(ast, 'ArrowFunctionExpression')
    for (const node of arrowFns) {
      if (!returnsJSX(node)) continue
      const start = node.loc?.start.line ?? 0
      const end = node.loc?.end.line ?? 0
      const lines = end - start + 1
      if (lines > COMPONENT_MAX_LINES) {
        const name = getFunctionName(node)
        violations.push({
          ruleId: 'component-length',
          message: `Component '${name}' is ${lines} lines. Break it into smaller components.`,
          filePath,
          line: getNodeLine(node),
          severity: 'critical',
          category: 'architecture',
        })
      }
    }

    return violations
  },
}
