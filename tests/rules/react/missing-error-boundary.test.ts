import { describe, it, expect, beforeEach } from 'vitest'
import {
  missingErrorBoundaryRule,
  finalizeErrorBoundaryViolations,
  resetErrorBoundaryState,
} from '../../../src/rules/react/missing-error-boundary'

describe('missing-error-boundary rule', () => {
  beforeEach(() => {
    resetErrorBoundaryState()
  })

  it('should detect error boundary and produce no final violation', () => {
    const code = `
      class ErrorBoundary extends React.Component {
        componentDidCatch(error, info) {}
        render() { return this.props.children }
      }
    `
    missingErrorBoundaryRule.run('test.tsx', code)
    const violations = finalizeErrorBoundaryViolations()
    expect(violations).toHaveLength(0)
  })

  it('should flag when no error boundary exists', () => {
    const code = `const App = () => <div>Hello</div>`
    missingErrorBoundaryRule.run('test.tsx', code)
    const violations = finalizeErrorBoundaryViolations()
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].ruleId).toBe('missing-error-boundary')
  })

  it('should detect getDerivedStateFromError as error boundary', () => {
    const code = `
      class ErrB extends Component {
        static getDerivedStateFromError(error) { return { hasError: true } }
        render() { return this.props.children }
      }
    `
    missingErrorBoundaryRule.run('test.tsx', code)
    const violations = finalizeErrorBoundaryViolations()
    expect(violations).toHaveLength(0)
  })
})
