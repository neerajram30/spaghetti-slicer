import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine, getNodeColumn } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

const URL_REGEX = /^(https?|wss?):\/\/[^\s'"`{}()]+/
const SECRET_KEY_REGEX = /(api_?key|secret|password|token|credential)/i
const PLACEHOLDER_REGEX = /^(TODO|placeholder|dummy|test|your[-_]api[-_]key|your[-_]secret|your[-_]token|your[-_]password|enter[-_]here|x+)/i

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

function getVariableName(node: TSESTree.Node): string | null {
  const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent
  if (!parent) return null

  if (parent.type === 'VariableDeclarator') {
    if (parent.id.type === 'Identifier') {
      return parent.id.name
    }
  }

  if (parent.type === 'Property') {
    if (parent.key.type === 'Identifier') {
      return parent.key.name
    }
    if (parent.key.type === 'Literal' && typeof parent.key.value === 'string') {
      return parent.key.value
    }
  }

  if (parent.type === 'AssignmentExpression') {
    if (parent.left.type === 'Identifier') {
      return parent.left.name
    }
    if (parent.left.type === 'MemberExpression') {
      const prop = parent.left.property
      if (prop.type === 'Identifier') {
        return prop.name
      }
      if (prop.type === 'Literal' && typeof prop.value === 'string') {
        return prop.value
      }
    }
  }

  return null
}

export const hardcodedSecretsEndpointsRule: Rule = {
  id: 'hardcoded-secrets-endpoints',
  name: 'Hardcoded Secrets and Endpoints',
  description: 'Do not hardcode raw URLs or secrets in the codebase.',
  category: 'architecture',
  severity: 'critical',
  run(filePath, fileContent) {
    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    attachParents(ast)
    const violations: RuleViolation[] = []

    const checkStringValue = (value: string, node: TSESTree.Node) => {
      const trimmed = value.trim()
      
      // 1. Check if it's an absolute URL / API endpoint
      if (URL_REGEX.test(trimmed)) {
        violations.push({
          ruleId: 'hardcoded-secrets-endpoints',
          message: `Hardcoded API endpoint found: '${trimmed}'. Extract to an environment variable.`,
          filePath,
          line: getNodeLine(node),
          column: getNodeColumn(node),
          severity: 'critical',
          category: 'architecture',
        })
        return
      }

      // 2. Check if it's a hardcoded secret mapped to a secret-like variable/property
      if (trimmed.length > 4 && !PLACEHOLDER_REGEX.test(trimmed)) {
        const varName = getVariableName(node)
        if (varName && SECRET_KEY_REGEX.test(varName)) {
          violations.push({
            ruleId: 'hardcoded-secrets-endpoints',
            message: `Potential hardcoded secret found in variable '${varName}'. Extract to an environment variable.`,
            filePath,
            line: getNodeLine(node),
            column: getNodeColumn(node),
            severity: 'critical',
            category: 'architecture',
          })
        }
      }
    }

    const literals = findNodes<TSESTree.Literal>(ast, 'Literal')
    for (const node of literals) {
      // Skip if this literal is the key of a property
      if (node.parent?.type === 'Property' && node.parent.key === node) {
        continue
      }
      if (typeof node.value === 'string') {
        checkStringValue(node.value, node)
      }
    }

    const templateLiterals = findNodes<TSESTree.TemplateLiteral>(ast, 'TemplateLiteral')
    for (const node of templateLiterals) {
      // Check if template literal is purely static string chunks
      if (node.quasis.length === 1) {
        const value = node.quasis[0].value.cooked ?? ''
        checkStringValue(value, node)
      }
    }

    return violations
  },
}
