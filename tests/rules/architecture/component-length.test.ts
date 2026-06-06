import { describe, it, expect } from 'vitest'
import { componentLengthRule } from '../../../src/rules/architecture/component-length'

function makeComponentWithLines(n: number): string {
  const body = Array(n).fill('  const x = 1').join('\n')
  return `function BigComponent() {\n${body}\n  return <div />\n}`
}

describe('component-length rule', () => {
  it('should not flag short component', () => {
    const code = `function Card() { return <div>hello</div> }`
    const violations = componentLengthRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag component exceeding 200 lines', () => {
    const code = makeComponentWithLines(205)
    const violations = componentLengthRule.run('test.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].ruleId).toBe('component-length')
    expect(violations[0].message).toContain('BigComponent')
  })

  it('should not flag non-component function', () => {
    const body = Array(210).fill('  const x = 1').join('\n')
    const code = `function processData() {\n${body}\n  return 42\n}`
    const violations = componentLengthRule.run('test.ts', code)
    expect(violations).toHaveLength(0)
  })
})
