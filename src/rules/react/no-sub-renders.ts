import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine, getNodeColumn } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

const RENDER_NAME_REGEX = /^render([A-Z].*)?$/

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

function getEnclosingComponent(node: TSESTree.Node): TSESTree.Node | null {
  let current = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression'
    ) {
      if (returnsJSX(current)) {
        return current
      }
    }
    current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent
  }
  return null
}

function getFunctionName(node: TSESTree.Node): string | null {
  if (node.type === 'FunctionDeclaration') {
    return node.id?.name ?? null
  }
  
  const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent
  if (parent?.type === 'VariableDeclarator') {
    if (parent.id.type === 'Identifier') {
      return parent.id.name
    }
  }
  return null
}

export const noSubRendersRule: Rule = {
  id: 'no-sub-renders',
  name: 'No Sub-Renders',
  description: 'Helper rendering functions should not be defined inside a component body.',
  category: 'react',
  severity: 'warning',
  run(filePath, fileContent) {
    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    attachParents(ast)
    const violations: RuleViolation[] = []

    const checkFunctionNode = (
      node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
    ) => {
      // Must be nested inside a parent component
      const parentComp = getEnclosingComponent(node)
      if (!parentComp) return

      const name = getFunctionName(node)
      if (!name) return // Ignore anonymous helper callbacks (e.g. inline .map callback)

      const isRenderName = RENDER_NAME_REGEX.test(name)
      const doesReturnJSX = returnsJSX(node)

      if (isRenderName || doesReturnJSX) {
        violations.push({
          ruleId: 'no-sub-renders',
          message: `Helper rendering function '${name}' defined inside component body. Extract it into a standalone React component.`,
          filePath,
          line: getNodeLine(node),
          column: getNodeColumn(node),
          severity: 'warning',
          category: 'react',
        })
      }
    }

    const funcDecls = findNodes<TSESTree.FunctionDeclaration>(ast, 'FunctionDeclaration')
    for (const node of funcDecls) {
      checkFunctionNode(node)
    }

    const arrowFns = findNodes<TSESTree.ArrowFunctionExpression>(ast, 'ArrowFunctionExpression')
    for (const node of arrowFns) {
      checkFunctionNode(node)
    }

    const funcExprs = findNodes<TSESTree.FunctionExpression>(ast, 'FunctionExpression')
    for (const node of funcExprs) {
      checkFunctionNode(node)
    }

    return violations
  },
}
