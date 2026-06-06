import { describe, it, expect } from 'vitest'
import { imageMissingDimensionsRule } from '../../../src/rules/performance/image-missing-dimensions'

describe('image-missing-dimensions rule', () => {
  it('should not flag img with width and height', () => {
    const code = `const A = () => <img src="a.jpg" alt="a" width={400} height={300} />`
    const violations = imageMissingDimensionsRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag img missing both dimensions', () => {
    const code = `const A = () => <img src="a.jpg" alt="a" />`
    const violations = imageMissingDimensionsRule.run('test.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].ruleId).toBe('image-missing-dimensions')
  })

  it('should flag img missing height', () => {
    const code = `const A = () => <img src="a.jpg" alt="a" width={400} />`
    const violations = imageMissingDimensionsRule.run('test.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
  })

  it('should flag Next.js Image missing dimensions', () => {
    const code = `const A = () => <Image src="/hero.jpg" alt="hero" />`
    const violations = imageMissingDimensionsRule.run('test.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
  })

  it('should not flag Next.js Image with dimensions', () => {
    const code = `const A = () => <Image src="/hero.jpg" alt="hero" width={800} height={600} />`
    const violations = imageMissingDimensionsRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })
})
