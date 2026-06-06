import { describe, it, expect } from 'vitest'
import { fatControllerRule } from '../../../src/rules/react/fat-controller'

function makeFatComponent(logicLinesCount: number, jsxLinesCount: number): string {
  const logic = Array(logicLinesCount).fill('  console.log("doing logic step");').join('\n')
  const jsxBody = Array(jsxLinesCount - 2).fill('      <p>content</p>').join('\n')
  return `function FatComponent() {\n${logic}\n  return (\n    <div>\n${jsxBody}\n    </div>\n  );\n}`
}

describe('fat-controller rule', () => {
  it('should not flag component with balanced logic and markup', () => {
    const code = makeFatComponent(10, 15) // total lines ~25. logic ratio ~40%.
    const violations = fatControllerRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should not flag small components even with high logic ratio', () => {
    const code = `
      function SmallButLogic() {
        const [a, setA] = useState(1);
        const [b, setB] = useState(2);
        const calculateSum = () => a + b;
        return <div>{calculateSum()}</div>;
      }
    ` // total lines ~7.
    const violations = fatControllerRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag components with > 75% logic and > 20 lines total size', () => {
    const code = makeFatComponent(25, 4) // total lines ~29. logic ratio 25 / 29 = ~86%.
    const violations = fatControllerRule.run('test.tsx', code)
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('fat-controller')
    expect(violations[0].message).toContain("body has 79% JavaScript logic code")
  })
})
