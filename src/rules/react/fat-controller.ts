import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

const MIN_COMPONENT_LINES = 20
const MAX_LOGIC_RATIO = 0.75

function isJSXReturn(r: TSESTree.ReturnStatement): boolean {
  if (!r.argument) return false
  const arg = r.argument
  return (
    arg.type === 'JSXElement' ||
    arg.type === 'JSXFragment' ||
    (arg.type === 'ParenthesizedExpression' &&
      ((arg as TSESTree.Node & { expression: TSESTree.Node }).expression.type === 'JSXElement' ||
        (arg as TSESTree.Node & { expression: TSESTree.Node }).expression.type === 'JSXFragment'))
  )
}

function returnsJSX(node: TSESTree.Node): boolean {
  const returns = findNodes<TSESTree.ReturnStatement>(node, 'ReturnStatement')
  return returns.some(isJSXReturn)
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

function isDirectReturnOf(node: TSESTree.ReturnStatement, componentNode: TSESTree.Node): boolean {
  let current = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent
  while (current) {
    if (current === componentNode) return true
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression'
    ) {
      return false
    }
    current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent
  }
  return false
}

export const fatControllerRule: Rule = {
  id: 'fat-controller',
  name: 'Fat Controller',
  description: 'Component body logic should not exceed 75% of the total component size.',
  category: 'react',
  severity: 'warning',
  run(filePath, fileContent) {
    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    attachParents(ast)
    const violations: RuleViolation[] = []

    const checkComponent = (node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression) => {
      if (!returnsJSX(node)) return

      const start = node.loc?.start.line ?? 0
      const end = node.loc?.end.line ?? 0
      const totalLines = end - start + 1

      if (totalLines <= MIN_COMPONENT_LINES) return

      const directReturns = findNodes<TSESTree.ReturnStatement>(node, 'ReturnStatement')
        .filter((r) => isDirectReturnOf(r, node))
        .filter(isJSXReturn)

      if (directReturns.length === 0) return

      // Find the first/earliest JSX return statement
      const earliestReturnLine = Math.min(...directReturns.map((r) => r.loc?.start.line ?? 0))
      
      const logicLines = earliestReturnLine - start
      const ratio = logicLines / totalLines

      if (ratio > MAX_LOGIC_RATIO) {
        const name = getFunctionName(node)
        violations.push({
          ruleId: 'fat-controller',
          message: `Component '${name}' body has ${Math.round(ratio * 100)}% JavaScript logic code and less than 25% JSX return markup. Extract logic into a custom hook.`,
          filePath,
          line: getNodeLine(node),
          severity: 'warning',
          category: 'react',
        })
      }
    }

    const funcDecls = findNodes<TSESTree.FunctionDeclaration>(ast, 'FunctionDeclaration')
    for (const node of funcDecls) {
      checkComponent(node)
    }

    const arrowFns = findNodes<TSESTree.ArrowFunctionExpression>(ast, 'ArrowFunctionExpression')
    for (const node of arrowFns) {
      checkComponent(node)
    }

    return violations
  },
}
