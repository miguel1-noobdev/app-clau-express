# Proposal: tanda2-admin-panel

## Intent

The backend is a single 1,255-line `server.js` monolith. Admin functionality (user management, record edits, logs) is embedded inline alongside all other routes. This change extracts **only the admin backend** into a clean `middleware → service → controller → route` architecture—establishing the pattern that will guide gradual modularization of auth, records, and messages in future changes. The frontend admin UI (currently tangled in `Dashboard.tsx` tab conditionals) is also extracted into dedicated components and routes.

## Scope

### In Scope
- Extract admin middleware (`isAuthenticated`, `isAdmin`, `protectAdminAccount`, `validate`) to `src/middleware/`
- Extract admin business logic to `src/services/admin.service.js`
- Extract admin HTTP handlers to `src/controllers/admin.controller.js`
- Extract admin routes to `src/routes/admin.routes.js`
- Mount modular admin routes in `server.js` via `app.use('/api/admin', require('./src/routes/admin.routes'))`
- Create `src/models/index.js` for centralized model exports
- Extract frontend admin tabs from `Dashboard.tsx` → `frontend/src/pages/admin/AdminDashboard.tsx`
- New admin sub-components: `UserManager.tsx`, `LogViewer.tsx`, `RecordManager.tsx`
- Add `/admin` route in `App.tsx`
- Update backend tests to mount routes on a test `app` instance (not `require.cache` manipulation)

### Out of Scope
- Modularizing auth, records, or messages domains (future changes)
- Refactoring non-admin routes in `server.js`
- Changes to `api.service.ts` (admin endpoints already exist; no new grouping needed)

## Capabilities

### New Capabilities
- `admin-panel`: Full admin panel backend + frontend. Covers user CRUD, record admin-edit/delete, access and modification logs with filtering/pagination, and admin-account protection.

### Modified Capabilities
- None (this change does not alter existing requirements; it restructures implementation only)

## Approach

**Incremental Extraction** — extract admin backend into modular files while leaving all other `server.js` routes untouched. Then extract frontend admin UI.

Chained PRs (respecting 400-line budget):

| PR | Scope | Key Files |
|----|-------|-----------|
| #1 | Backend middleware + service layer | `src/middleware/auth.middleware.js`, `src/middleware/validation.middleware.js`, `src/middleware/admin-protection.middleware.js`, `src/services/admin.service.js`, `src/models/index.js` |
| #2 | Backend controller + routes + server.js mount | `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`, `server.js` (mount only) |
| #3 | Frontend admin components + routing | `frontend/src/pages/admin/`, `frontend/src/App.tsx`, backend tests refactor |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `server.js` | Modified | Mount admin router; keep all other routes untouched |
| `src/middleware/` | New | `auth.middleware.js`, `validation.middleware.js`, `admin-protection.middleware.js` |
| `src/services/admin.service.js` | New | Admin business logic (users, records, logs) |
| `src/controllers/admin.controller.js` | New | Admin HTTP handlers |
| `src/routes/admin.routes.js` | New | Router mounting all admin endpoints |
| `src/models/index.js` | New | Centralized model exports |
| `frontend/src/pages/admin/` | New | `AdminDashboard.tsx`, `UserManager.tsx`, `LogViewer.tsx`, `RecordManager.tsx` |
| `frontend/src/App.tsx` | Modified | New `/admin` route |
| `tests/` | Modified | Refactor to use test `app` instance instead of `require.cache` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test breakage from `require.cache` manipulation | High | PR #3 explicitly refactors backend tests to mount routes on a test `app` instance |
| Session middleware ordering regression | Low | Admin router mounted after `app.use(session(...))`; verify in PR #2 |
| Route path drift (aliases during transition) | Low | Keep existing `/api/users` and `/api/logs` paths active alongside new `/api/admin/*` during transition |
| Review budget overflow | High | Mitigated by chained PR strategy (3 slices under 400 lines each) |
| Silent error swallowing in frontend | Medium | Fix empty `catch { /* Silently ignore */ }` blocks when extracting admin components |

## Rollback Plan

- **PR #1 (middleware + service)**: Delete `src/middleware/` and `src/services/admin.service.js`. Revert `server.js` mount line. Tests still pass against monolith.
- **PR #2 (controller + routes)**: Delete `src/controllers/`, `src/routes/admin.routes.js`. Remove mount line from `server.js`. All admin functionality reverts to inline `server.js` handlers.
- **PR #3 (frontend + tests)**: Revert `Dashboard.tsx` tab extraction. Delete `frontend/src/pages/admin/`. Remove `/admin` route from `App.tsx`. Restore test `require.cache` manipulation.

## Dependencies

- `docs/backend-scaffolding/` ADR 0001/0002 must be reviewed and aligned (existing scaffold uses same `routes/`, `controllers/`, `services/` naming)
- MongoDB memory server available for integration tests (already in `package.json`)

## Success Criteria

- [ ] Admin routes respond correctly under modular architecture (users CRUD, record admin-edit/delete, logs)
- [ ] Existing non-admin routes in `server.js` are unaffected (no regressions)
- [ ] All 3 chained PRs stay under 400 changed lines each
- [ ] Backend integration tests pass using test `app` instance pattern
- [ ] Frontend `/admin` route renders dedicated admin components
- [ ] Rollback of any PR slice leaves the system in a valid state