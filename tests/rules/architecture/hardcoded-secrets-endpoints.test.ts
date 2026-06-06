import { describe, it, expect } from 'vitest'
import { hardcodedSecretsEndpointsRule } from '../../../src/rules/architecture/hardcoded-secrets-endpoints'

describe('hardcoded-secrets-endpoints rule', () => {
  it('should not flag relative API paths or placeholders', () => {
    const code = `
      const localPath = '/api/v1/users';
      const dummyToken = 'placeholder';
      const config = {
        api_key: 'TODO',
        secret: 'your-secret-here'
      };
    `
    const violations = hardcodedSecretsEndpointsRule.run('test.ts', code)
    expect(violations).toHaveLength(0)
  })

  it('should not flag environment variable usages', () => {
    const code = `
      const apiUrl = process.env.REACT_APP_API_URL;
      const apiToken = import.meta.env.VITE_API_TOKEN;
    `
    const violations = hardcodedSecretsEndpointsRule.run('test.ts', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag absolute HTTP/HTTPS API endpoints', () => {
    const code = `
      const apiUrl = 'https://api.myapi.com/v1';
      fetch("http://mysecondapi.org/data");
      const wsUrl = \`wss://stream.myapi.io/feed\`;
    `
    const violations = hardcodedSecretsEndpointsRule.run('test.ts', code)
    expect(violations).toHaveLength(3)
    expect(violations[0].message).toContain('https://api.myapi.com/v1')
    expect(violations[1].message).toContain('http://mysecondapi.org/data')
    expect(violations[2].message).toContain('wss://stream.myapi.io/feed')
  })

  it('should flag hardcoded variables containing secrets', () => {
    const code = `
      const token = 'd87a9df87as9d8f7as9df87a';
      let adminPassword = 'superSecretAdminPass123';
      const my_api_key = "abc123key_xyz";
    `
    const violations = hardcodedSecretsEndpointsRule.run('test.ts', code)
    expect(violations).toHaveLength(3)
    expect(violations[0].message).toContain("variable 'token'")
    expect(violations[1].message).toContain("variable 'adminPassword'")
    expect(violations[2].message).toContain("variable 'my_api_key'")
  })

  it('should flag hardcoded keys in object properties', () => {
    const code = `
      const config = {
        secret: 'a718b29c3d4e5f6g7h8i9j',
        "credential": 'myPrivateCredentialString'
      };
    `
    const violations = hardcodedSecretsEndpointsRule.run('test.ts', code)
    expect(violations).toHaveLength(2)
    expect(violations[0].message).toContain("variable 'secret'")
    expect(violations[1].message).toContain("variable 'credential'")
  })
})
