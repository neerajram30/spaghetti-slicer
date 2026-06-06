import { describe, it, expect } from 'vitest'
import { directFetchInComponentRule } from '../../../src/rules/architecture/direct-fetch-in-component'

describe('direct-fetch-in-component rule', () => {
  it('should not flag fetch inside a custom hook', () => {
    const code = `
      function usePosts() {
        useEffect(() => { fetch('/api/posts') }, [])
      }
    `
    const violations = directFetchInComponentRule.run('src/hooks/usePosts.ts', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag direct fetch in a component', () => {
    const code = `
      function UserList() {
        useEffect(() => { fetch('/api/users') }, [])
        return <div />
      }
    `
    const violations = directFetchInComponentRule.run('src/components/UserList.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].ruleId).toBe('direct-fetch-in-component')
  })

  it('should flag axios call in component', () => {
    const code = `
      function Dashboard() {
        useEffect(() => { axios.get('/api/data') }, [])
        return <div />
      }
    `
    const violations = directFetchInComponentRule.run('src/pages/Dashboard.tsx', code)
    expect(violations.length).toBeGreaterThan(0)
  })

  it('should not flag fetch in a service file', () => {
    const code = `
      function ApiService() {
        return fetch('/api/data')
      }
    `
    const violations = directFetchInComponentRule.run('src/services/api.ts', code)
    expect(violations).toHaveLength(0)
  })
})
