import { describe, it, expect } from 'vitest'
import { stateBloatRule } from '../../../src/rules/architecture/state-bloat'

describe('state-bloat rule', () => {
  it('should not flag component with 5 or fewer useState hooks', () => {
    const code = `
      function SmallComponent() {
        const [a, setA] = useState(1);
        const [b, setB] = useState(2);
        const [c, setC] = useState(3);
        const [d, setD] = useState(4);
        const [e, setE] = useState(5);
        return <div>{a + b + c + d + e}</div>;
      }
    `
    const violations = stateBloatRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag component with more than 5 useState hooks', () => {
    const code = `
      function BloatedComponent() {
        const [a, setA] = useState(1);
        const [b, setB] = useState(2);
        const [c, setC] = useState(3);
        const [d, setD] = useState(4);
        const [e, setE] = useState(5);
        const [f, setF] = useState(6);
        return <div>{a}</div>;
      }
    `
    const violations = stateBloatRule.run('test.tsx', code)
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('state-bloat')
    expect(violations[0].message).toContain('BloatedComponent')
    expect(violations[0].message).toContain('6 useState hooks')
  })

  it('should flag arrow function component with React.useState', () => {
    const code = `
      const BloatedArrow = () => {
        const [a, setA] = React.useState(1);
        const [b, setB] = React.useState(2);
        const [c, setC] = React.useState(3);
        const [d, setD] = React.useState(4);
        const [e, setE] = React.useState(5);
        const [f, setF] = React.useState(6);
        return <div>{a}</div>;
      }
    `
    const violations = stateBloatRule.run('test.tsx', code)
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('state-bloat')
    expect(violations[0].message).toContain('BloatedArrow')
  })

  it('should not flag non-component functions with many useState calls', () => {
    const code = `
      function helperFunction() {
        const [a, setA] = useState(1);
        const [b, setB] = useState(2);
        const [c, setC] = useState(3);
        const [d, setD] = useState(4);
        const [e, setE] = useState(5);
        const [f, setF] = useState(6);
        return 42;
      }
    `
    const violations = stateBloatRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should not double-count useState from nested helper component declarations', () => {
    const code = `
      function OuterComponent() {
        const [a, setA] = useState(1);
        const [b, setB] = useState(2);
        const [c, setC] = useState(3);
        
        function InnerComponent() {
          const [d, setD] = useState(4);
          const [e, setE] = useState(5);
          const [f, setF] = useState(6);
          const [g, setG] = useState(7);
          return <div>{d}</div>;
        }

        return <div>{a}<InnerComponent /></div>;
      }
    `
    const violations = stateBloatRule.run('test.tsx', code)
    // OuterComponent has 3 useStates directly.
    // InnerComponent has 4 useStates directly.
    // None should exceed 5, so violations should be 0.
    expect(violations).toHaveLength(0)
  })
})
