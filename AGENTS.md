# CLAUDIA — Code Review Rules

Full-stack hour-tracking app: Node.js + Express + MongoDB backend, React 18 + TypeScript + Vite frontend.

## ALL FILES

REJECT if:
- Hardcoded secrets, credentials, or API keys
- `console.log`, `console.warn`, or `console.error` in production code
- Empty catch/except blocks (silent error swallowing)
- Unused imports or dead code left in production files
- Non-descriptive variable/function names

REQUIRE:
- Meaningful error messages that help debugging
- Environment-sensitive config via `.env` (never committed)

---

## Backend (Node.js / Express / MongoDB)

REJECT if:
- `var` is used → use `const` or `let`
- Synchronous MongoDB operations in request handlers
- Missing input validation on route handlers
- Plaintext password storage → use bcrypt
- `process.env` accessed without fallback where it breaks startup
- `res.send` without proper status code

REQUIRE:
- Async errors handled (try/catch or async error wrapper)
- Mongoose schemas define required fields and sensible defaults
- Route handlers return after sending a response
- Session secret comes from environment variable

PREFER:
- Separate controllers from route definitions
- Named exports over default exports for utilities
- Centralized error handling middleware

---

## Frontend (React / TypeScript / Vite)

REJECT if:
- `any` type without `// @ts-expect-error` justification
- Missing return types on exported functions/components
- `import React` → use named imports (`import { useState }`)
- Inline styles in JSX → use CSS modules or consistent styling approach
- Magic strings/numbers without constants

REQUIRE:
- Components declare explicit prop interfaces/types
- Hooks follow Rules of Hooks (no conditional calls)
- API calls centralized in `services/`

PREFER:
- Named exports over default exports
- Functional components with hooks
- Colocated tests (`Component.test.tsx` or `__tests__`)

---

## Tests

REJECT if:
- Tests depend on external services (database, network) without mocks
- Tests assert implementation details instead of behavior
- Tests have no assertions

REQUIRE:
- Backend tests clean up created data
- Frontend component tests use `@testing-library/react`
- E2E tests use Playwright selectors resilient to change

---

## Response Format

FIRST LINE must be exactly:
STATUS: PASSED
or
STATUS: FAILED

If FAILED, list each issue as:
`file:line - rule violated - issue`
