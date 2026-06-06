import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

const MAX_STATE_HOOKS = 5

function returnsJSX(node: TSESTree.Node): boolean {
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

function isuseStateCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee
  if (callee.type === 'Identifier' && callee.name === 'useState') {
    return true
  }
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'React' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'useState'
  ) {
    return true
  }
  return false
}

function isDirectHookInComponent(node: TSESTree.CallExpression, componentNode: TSESTree.Node): boolean {
  let current = node.parent
  while (current) {
    if (current === componentNode) return true
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression'
    ) {
      return false
    }
    current = current.parent
  }
  return false
}

export const stateBloatRule: Rule = {
  id: 'state-bloat',
  name: 'State Bloat',
  description: 'Components should not contain more than 5 useState hooks.',
  category: 'architecture',
  severity: 'warning',
  run(filePath, fileContent) {
    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    attachParents(ast)
    const violations: RuleViolation[] = []

    const checkComponent = (node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression) => {
      if (!returnsJSX(node)) return
      
      const alluseStateCalls = findNodes<TSESTree.CallExpression>(node, 'CallExpression')
        .filter(isuseStateCall)
        .filter((call) => isDirectHookInComponent(call, node))

      const count = alluseStateCalls.length
      if (count > MAX_STATE_HOOKS) {
        const name = getFunctionName(node)
        violations.push({
          ruleId: 'state-bloat',
          message: `Component '${name}' contains ${count} useState hooks. Combine them into a single useReducer or group them into custom hooks.`,
          filePath,
          line: getNodeLine(node),
          severity: 'warning',
          category: 'architecture',
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
