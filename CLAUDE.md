# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # run CLI via tsx (no build)
npm run build            # compile with tsup → dist/index.js
npm run test:run         # run all vitest tests once
npm run test             # vitest watch mode
node dist/index.js ./src # run compiled CLI against a path
```

To run a single test file:
```bash
npx vitest run tests/rules/react/index-as-key.test.ts
```

## Architecture

The project is a Node.js CLI that audits React/TypeScript codebases for 12 rules across 5 categories.

**Data flow:** `cli/index.ts` → `engine/walker.ts` (find files) → for each file, runs each `Rule.run(filePath, content)` → collect `RuleViolation[]` → `engine/scorer.ts` → `reporter/console.ts` or `reporter/json.ts`.

### Key concepts

**Rule interface** (`src/types/index.ts`): Every rule is `{ id, name, description, category, severity, run(filePath, content) => RuleViolation[] }`. Rules are stateless except `missing-error-boundary`, which accumulates cross-file state and requires calling `resetErrorBoundaryState()` before a run and `finalizeErrorBoundaryViolations()` after.

**AST parsing** (`src/engine/parser.ts`): Uses `@typescript-eslint/parser` with `ecmaFeatures: { jsx: true }` (not `jsx: true` — that option doesn't work). `findNodes(ast, nodeType)` traverses the AST depth-first; it skips keys named `parent` to avoid circular traversal after `attachParents` has been called.

**`attachParents` pattern**: Several rules need to walk UP the AST (from a node to its ancestors). Since `@typescript-eslint/parser` doesn't populate `.parent`, rules that need ancestor traversal call a local `attachParents(ast)` helper that mutates all nodes to add `.parent`. This helper must skip the `parent` key during traversal (`if (key === 'parent') continue`) to prevent circular recursion.

**Scoring** (`src/engine/scorer.ts`): Category weights: architecture 25%, react 20%, typescript 20%, a11y 20%, performance 15%. Each violation deducts from that category (critical −10, warning −5, info −2), floored at 0. Total = weighted average.

### Adding a new rule

1. Create `src/rules/<category>/<rule-name>.ts` exporting a `Rule` object
2. Register it in `src/rules/index.ts`
3. Add tests in `tests/rules/<category>/<rule-name>.test.ts` with at least a passing and failing fixture
4. If the rule needs ancestor traversal: copy the `attachParents` helper and skip `parent` keys

### Parser quirk

`@typescript-eslint/parser` v7 requires JSX support to be enabled via `ecmaFeatures: { jsx: true }` inside the options object — the flat `jsx: true` option silently fails to parse JSX.
