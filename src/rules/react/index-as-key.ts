import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine, getNodeColumn } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

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

function getMapIndexParam(callExpr: TSESTree.CallExpression): string | null {
  const callee = callExpr.callee
  if (callee.type !== 'MemberExpression') return null
  const prop = callee.property
  if (prop.type !== 'Identifier' || prop.name !== 'map') return null

  const args = callExpr.arguments
  if (!args.length) return null
  const callback = args[0]
  if (
    callback.type !== 'ArrowFunctionExpression' &&
    callback.type !== 'FunctionExpression'
  )
    return null

  if (callback.params.length < 2) return null
  const indexParam = callback.params[1]
  if (indexParam.type === 'Identifier') return indexParam.name
  return null
}

export const indexAsKeyRule: Rule = {
  id: 'index-as-key',
  name: 'Index as Key',
  description: 'Array index should not be used as a React key prop.',
  category: 'react',
  severity: 'critical',
  run(filePath, fileContent) {
    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    attachParents(ast)
    const violations: RuleViolation[] = []

    const callExprs = findNodes<TSESTree.CallExpression>(ast, 'CallExpression')

    for (const call of callExprs) {
      const indexParam = getMapIndexParam(call)
      if (!indexParam) continue

      const jsxAttrs = findNodes<TSESTree.JSXAttribute>(call, 'JSXAttribute')
      for (const attr of jsxAttrs) {
        if (attr.name.type !== 'JSXIdentifier' || attr.name.name !== 'key') continue

        const val = attr.value
        if (
          val?.type === 'JSXExpressionContainer' &&
          val.expression.type === 'Identifier' &&
          val.expression.name === indexParam
        ) {
          violations.push({
            ruleId: 'index-as-key',
            message: 'Array index used as key prop. Use a stable unique identifier instead.',
            filePath,
            line: getNodeLine(attr),
            column: getNodeColumn(attr),
            severity: 'critical',
            category: 'react',
          })
        }
      }
    }

    return violations
  },
}
