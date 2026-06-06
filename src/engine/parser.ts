import { parse } from '@typescript-eslint/parser'
import type { TSESTree } from '@typescript-eslint/utils'

export type AST = TSESTree.Program

export function parseFile(fileContent: string, filePath: string): AST | null {
  try {
    return parse(fileContent, {
      loc: true,
      range: true,
      tokens: false,
      comment: false,
      ecmaFeatures: { jsx: true },
    } as Parameters<typeof parse>[1])
  } catch {
    console.warn(`[spaghetti-slicer] Failed to parse ${filePath}, skipping.`)
    return null
  }
}

export function findNodes<T extends TSESTree.Node>(
  node: TSESTree.Node,
  type: string,
): T[] {
  const results: T[] = []

  function visit(n: TSESTree.Node): void {
    if (n.type === type) {
      results.push(n as T)
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent') continue
      const child = (n as Record<string, unknown>)[key]
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === 'object' && 'type' in item) {
              visit(item as TSESTree.Node)
            }
          }
        } else if ('type' in child) {
          visit(child as TSESTree.Node)
        }
      }
    }
  }

  visit(node)
  return results
}

export function getNodeLine(node: TSESTree.Node): number {
  return node.loc?.start.line ?? 0
}

export function getNodeColumn(node: TSESTree.Node): number {
  return node.loc?.start.column ?? 0
}
