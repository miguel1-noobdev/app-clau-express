# Tests - CLAUDIA Express

Guidelines for unit/integration tests during refactor.

- Use Jest for unit tests of services and models.
- Use Supertest for API integration tests.
- Organize tests under backend/tests/ with subfolders unit/integration/fixtures.
- Ensure CI runs tests on PRs.
- Start with a small set of tests for critical paths (auth, records).
