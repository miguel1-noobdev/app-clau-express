# Tasks: tanda2-admin-panel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1150 total (split across 4 PRs: ~300 + ~300 + ~350 + ~200) |
| 400-line budget risk | High (single PR would exceed budget) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Extract middleware + service layer | PR 1 | Base = `feature/admin-panel`; standalone, no routes mounted |
| 2 | Extract controller + routes + mount | PR 2 | Base = PR 1 branch; new `/api/admin/*` endpoints live |
| 3 | Frontend admin panel + routing | PR 3 | Base = PR 2 branch; `/admin` route, role-check redirect |
| 4 | Test refactor + integration tests | PR 4 | Base = PR 3 branch; `app` singleton pattern, new endpoint tests |

## Phase 1: Backend Foundation — Middleware + Service + Models (PR #1)

Branch: `feature/admin-panel-pr1-middleware-service` → base: `feature/admin-panel`

- [x] 1.1 RED: Write unit test for `AdminService.listUsers()` mocking Mongoose `User.find()`
- [x] 1.2 GREEN: Create `src/models/index.js` re-exporting `{ User, Record, AccessLog, ModificationLog, Message }`
- [x] 1.3 GREEN: Create `src/middleware/auth.middleware.js` with `isAuthenticated` and `isAdmin` functions
- [x] 1.4 GREEN: Create `src/middleware/validation.middleware.js` with `validate` (express-validator wrapper)
- [x] 1.5 GREEN: Create `src/middleware/admin-protection.middleware.js` with `protectAdminAccount`
- [x] 1.6 RED: Write unit tests for `AdminService` user operations (create, update, delete, toggle, role, reset)
- [x] 1.7 GREEN: Create `src/services/admin.service.js` with all 12 admin service functions per design interface
- [x] 1.8 REFACTOR: Verify no `console.log`, no hardcoded secrets, proper error messages in all new files
- [x] 1.9 VERIFY: Run `npm test -- --testPathPattern=services` — all AdminService unit tests pass

## Phase 2: Backend Controller + Routes + Mount (PR #2)

Branch: `feature/admin-panel-pr2-controller-routes` → base: `feature/admin-panel-pr1-middleware-service`

- [x] 2.1 RED: Write integration test for `GET /api/admin/users` returning 403 for non-admin using test `app`
- [x] 2.2 GREEN: Create `src/controllers/admin.controller.js` with all 12 HTTP handlers delegating to `AdminService`
- [x] 2.3 GREEN: Create `src/routes/admin.routes.js` mounting all `/api/admin/*` endpoints with middleware chain
- [x] 2.4 GREEN: Modify `server.js` — add `app.use('/api/admin', require('./src/routes/admin.routes'))` after session middleware
- [x] 2.5 REFACTOR: Verify mounting order (session → admin routes); confirm monolith routes remain untouched
- [x] 2.6 VERIFY: Run `npm test` — existing tests pass, new `/api/admin/*` endpoints respond correctly

## Phase 3: Frontend Admin Panel + Routing (PR #3)

Branch: `feature/admin-panel-pr3-frontend` → base: `feature/admin-panel-pr2-controller-routes`

- [ ] 3.1 RED: Write Vitest test for `AdminDashboard` redirecting non-admin to `/dashboard`
- [ ] 3.2 GREEN: Create `frontend/src/pages/admin/AdminDashboard.tsx` with nav tabs, role-check on mount, redirect logic
- [ ] 3.3 RED: Write Vitest test for `UserManager` rendering user table with username/role/status columns
- [ ] 3.4 GREEN: Create `frontend/src/pages/admin/UserManager.tsx` with CRUD table, create/edit modals, proper error display
- [ ] 3.5 GREEN: Create `frontend/src/pages/admin/LogViewer.tsx` with access/modification log views and pagination
- [ ] 3.6 GREEN: Create `frontend/src/pages/admin/RecordManager.tsx` with search, admin-edit/delete, error handling
- [ ] 3.7 GREEN: Modify `frontend/src/App.tsx` — add `<Route path="/admin" element={<AdminDashboard />} />` inside ProtectedRoute
- [ ] 3.8 REFACTOR: Fix all empty `catch { /* Silently ignore */ }` blocks in extracted admin components
- [ ] 3.9 VERIFY: Run `npm run test:frontend` — all admin component tests pass, no TypeScript errors

## Phase 4: Test Refactor + Integration Tests (PR #4)

Branch: `feature/admin-panel-pr4-tests` → base: `feature/admin-panel-pr3-frontend`

- [ ] 4.1 Refactor `tests/auth.test.js` — replace `delete require.cache[...]` with `const app = require('../../server')`
- [ ] 4.2 Refactor `tests/users.test.js` — use test `app` instance pattern, add tests for `/api/admin/users` endpoints
- [ ] 4.3 Refactor `tests/records.test.js` — use test `app` instance pattern, add tests for `/api/admin/records/*` endpoints
- [ ] 4.4 Add integration test: admin edits record → verifies `ModificationLog` created with correct adminUsername
- [ ] 4.5 Add integration test: supervisor cannot delete main admin → verifies 403 from `protectAdminAccount`
- [ ] 4.6 Add integration test: pagination on `/api/admin/logs/access` returns correct limit + total count
- [ ] 4.7 VERIFY: Run `npm test` — all backend tests pass with `app` singleton pattern, no `require.cache` manipulation
- [ ] 4.8 VERIFY: Run `npm run test:e2e` — Playwright tests pass against full admin flow
