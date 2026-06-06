import { describe, it, expect } from 'vitest'
import { noSubRendersRule } from '../../../src/rules/react/no-sub-renders'

describe('no-sub-renders rule', () => {
  it('should not flag top-level components or event handlers', () => {
    const code = `
      function ListItem({ item }) {
        return <li>{item}</li>;
      }

      function ListComponent() {
        const handleClick = () => console.log('clicked');
        const items = [1, 2, 3];
        return (
          <ul onClick={handleClick}>
            {items.map((item) => <ListItem key={item} item={item} />)}
          </ul>
        );
      }
    `
    const violations = noSubRendersRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should not flag helper functions returning primitive values', () => {
    const code = `
      function MyComponent() {
        const calculateSum = (a, b) => a + b;
        return <div>{calculateSum(1, 2)}</div>;
      }
    `
    const violations = noSubRendersRule.run('test.tsx', code)
    expect(violations).toHaveLength(0)
  })

  it('should flag helper rendering functions named renderSomething', () => {
    const code = `
      function MyComponent() {
        const renderHeader = () => {
          return <h1>My Header</h1>;
        };

        return (
          <div>
            {renderHeader()}
            <p>Content</p>
          </div>
        );
      }
    `
    const violations = noSubRendersRule.run('test.tsx', code)
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('no-sub-renders')
    expect(violations[0].message).toContain("Helper rendering function 'renderHeader'")
  })

  it('should flag nested component declarations returning JSX', () => {
    const code = `
      function MyComponent() {
        function NestedItem() {
          return <span>item</span>;
        }

        return <div><NestedItem /></div>;
      }
    `
    const violations = noSubRendersRule.run('test.tsx', code)
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('no-sub-renders')
    expect(violations[0].message).toContain("Helper rendering function 'NestedItem'")
  })

  it('should flag named function expression starting with render', () => {
    const code = `
      const MyComponent = () => {
        const renderList = function() {
          return <ul><li>1</li></ul>;
        };
        return <div>{renderList()}</div>;
      };
    `
    const violations = noSubRendersRule.run('test.tsx', code)
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('no-sub-renders')
    expect(violations[0].message).toContain("Helper rendering function 'renderList'")
  })
})
