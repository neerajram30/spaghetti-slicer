import type { TSESTree } from '@typescript-eslint/utils'
import { parseFile, findNodes, getNodeLine, getNodeColumn } from '../../engine/parser'
import type { Rule, RuleViolation } from '../../types'

const IMAGE_TAGS = ['img', 'Image']

export const imageMissingDimensionsRule: Rule = {
  id: 'image-missing-dimensions',
  name: 'Image Missing Dimensions',
  description: '<img> elements should have width and height to prevent CLS.',
  category: 'performance',
  severity: 'warning',
  run(filePath, fileContent) {
    const ast = parseFile(fileContent, filePath)
    if (!ast) return []

    const violations: RuleViolation[] = []
    const elements = findNodes<TSESTree.JSXOpeningElement>(ast, 'JSXOpeningElement')

    for (const el of elements) {
      const name = el.name
      if (name.type !== 'JSXIdentifier') continue
      if (!IMAGE_TAGS.includes(name.name)) continue

      const attrs = el.attributes
      const hasWidth = attrs.some(
        (a) =>
          a.type === 'JSXAttribute' &&
          a.name.type === 'JSXIdentifier' &&
          a.name.name === 'width',
      )
      const hasHeight = attrs.some(
        (a) =>
          a.type === 'JSXAttribute' &&
          a.name.type === 'JSXIdentifier' &&
          a.name.name === 'height',
      )

      if (!hasWidth || !hasHeight) {
        violations.push({
          ruleId: 'image-missing-dimensions',
          message:
            '<img> element missing width/height attributes. This causes Cumulative Layout Shift (CLS).',
          filePath,
          line: getNodeLine(el),
          column: getNodeColumn(el),
          severity: 'warning',
          category: 'performance',
        })
      }
    }

    return violations
  },
}
