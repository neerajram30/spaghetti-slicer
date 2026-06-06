import { describe, it, expect } from 'vitest'
import { indexAsKeyRule } from '../../../src/rules/react/index-as-key'

describe('index-as-key rule', () => {
  it('should not flag stable key', () => {
    const code = `
      const List = () => items.map((item) => <li key={item.id}>{item.name}</li>)
    `
    const violations = indexAsKeyRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag index as key', () => {
    const code = `
      const List = () => items.map((item, index) => <li key={index}>{item.name}</li>)
    `
    const violations = indexAsKeyRule.run('test.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].ruleId).toBe('index-as-key')
  })

  it('should flag short-named index variable', () => {
    const code = `
      const List = () => items.map((item, i) => <li key={i}>{item.name}</li>)
    `
    const violations = indexAsKeyRule.run('test.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
  })

  it('should not flag map without key', () => {
    const code = `
      const List = () => items.map((item) => <li>{item.name}</li>)
    `
    const violations = indexAsKeyRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })
})
