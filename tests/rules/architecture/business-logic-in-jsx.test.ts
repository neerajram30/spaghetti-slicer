import { describe, it, expect } from 'vitest'
import { businessLogicInJSXRule } from '../../../src/rules/architecture/business-logic-in-jsx'

describe('business-logic-in-jsx rule', () => {
  it('should not flag simple variable reference in JSX', () => {
    const code = `const A = () => <div>{title}</div>`
    const violations = businessLogicInJSXRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag inline filter in JSX', () => {
    const code = `
      const A = () => (
        <ul>{items.filter(i => i.active).map(i => <li>{i.name}</li>)}</ul>
      )
    `
    const violations = businessLogicInJSXRule.run('test.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].ruleId).toBe('business-logic-in-jsx')
  })

  it('should flag inline sort in JSX', () => {
    const code = `
      const A = () => <ul>{items.sort((a, b) => a.n - b.n).map(i => <li>{i.n}</li>)}</ul>
    `
    const violations = businessLogicInJSXRule.run('test.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
  })

  it('should not flag simple map in JSX', () => {
    const code = `
      const A = () => <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
    `
    const violations = businessLogicInJSXRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })
})
