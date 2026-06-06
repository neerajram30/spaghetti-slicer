import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine, getNodeColumn } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

const TRANSFORM_METHODS = ['filter', 'reduce', 'sort', 'flatMap', 'find', 'findIndex']

function isTransformCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee
  if (callee.type !== 'MemberExpression') return false
  const prop = callee.property
  return prop.type === 'Identifier' && TRANSFORM_METHODS.includes(prop.name)
}

function countTernaryNesting(node: TSESTree.ConditionalExpression): number {
  let depth = 1
  let current: TSESTree.Node = node
  while (
    current.type === 'ConditionalExpression' &&
    (current as TSESTree.ConditionalExpression).consequent.type === 'ConditionalExpression'
  ) {
    depth++
    current = (current as TSESTree.ConditionalExpression).consequent
  }
  return depth
}

export const businessLogicInJSXRule: Rule = {
  id: 'business-logic-in-jsx',
  name: 'Business Logic in JSX',
  description: 'Data transformations should be moved out of JSX expressions.',
  category: 'architecture',
  severity: 'warning',
  run(filePath, fileContent) {
    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    const violations: RuleViolation[] = []
    const containers = findNodes<TSESTree.JSXExpressionContainer>(
      ast,
      'JSXExpressionContainer',
    )

    for (const container of containers) {
      const calls = findNodes<TSESTree.CallExpression>(container, 'CallExpression')
      for (const call of calls) {
        if (isTransformCall(call)) {
          violations.push({
            ruleId: 'business-logic-in-jsx',
            message:
              'Inline data transformation found in JSX. Move to a variable or custom hook.',
            filePath,
            line: getNodeLine(call),
            column: getNodeColumn(call),
            severity: 'warning',
            category: 'architecture',
          })
          break
        }
      }

      const ternaries = findNodes<TSESTree.ConditionalExpression>(
        container,
        'ConditionalExpression',
      )
      for (const ternary of ternaries) {
        if (countTernaryNesting(ternary) > 2) {
          violations.push({
            ruleId: 'business-logic-in-jsx',
            message:
              'Inline data transformation found in JSX. Move to a variable or custom hook.',
            filePath,
            line: getNodeLine(ternary),
            column: getNodeColumn(ternary),
            severity: 'warning',
            category: 'architecture',
          })
          break
        }
      }
    }

    return violations
  },
}
