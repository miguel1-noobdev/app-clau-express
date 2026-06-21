## Exploration: tanda2-admin-panel

### Current State

The backend is a single monolithic `server.js` (1,255 lines) containing all Express routes, middleware, and business logic inline. Models live under `src/models/` (`User.js`, `Record.js`, `Logs.js`, `Message.js`).

Admin functionality **already exists** in the monolith:
- **User management**: CRUD users, toggle status, reset password, change role, protect main admin account (`/api/users/*`)
- **Record management**: Admin can edit/delete any user's record with audit logging (`/api/records/:id/admin-edit`, `/api/records/:id/admin-delete`)
- **Logs**: Access logs (`/api/logs/access`) and modification logs (`/api/logs/modifications`) with filtering and pagination
- **Middleware**: `isAuthenticated`, `isAdmin`, `protectAdminAccount`, and `validate` are all defined inline in `server.js`

The frontend has a monolithic `Dashboard.tsx` (690 lines) that embeds admin UI inside tab conditionals (`usuarios` tab with user table, create/edit modals; `logs` tab with basic access log list). There is no dedicated admin route or component separation.

A modular scaffold exists under `docs/backend-scaffolding/` (ADR 0001/0002, placeholder `routes/`, `controllers/`, `services/`, `middleware/`) but is **not wired into the running application**.

Tests:
- Backend: Jest integration tests for `auth`, `users`, `records` (all depend on the monolithic `server.js` require cache manipulation)
- Frontend: Vitest unit tests for `Dashboard` and `ProtectedRoute`
- E2E: Playwright tests for login and protected routes

### Affected Areas

- `server.js` — Admin routes (~400 lines: users, logs, admin record edits) must be extracted without breaking existing monolith routes during transition
- `src/models/` — Needs a centralized `index.js` for clean imports in modular architecture
- `frontend/src/pages/Dashboard.tsx` — Admin UI (tabs `usuarios`, `logs`, modals) must be extracted into dedicated admin components/pages
- `frontend/src/App.tsx` — Needs new route(s) for admin panel (e.g., `/admin/*`)
- `frontend/src/services/api.service.ts` — May need admin-specific endpoints grouping or no change
- `tests/` — Backend tests currently `delete require.cache[require.resolve('../server')]`; modular structure changes how `app` is instantiated in tests
- New backend files: `src/routes/admin.routes.js`, `src/controllers/admin.controller.js`, `src/services/admin.service.js`, `src/middleware/auth.middleware.js`, `src/middleware/validation.middleware.js`, `src/middleware/admin-protection.middleware.js`
- New frontend files: `frontend/src/pages/admin/AdminDashboard.tsx`, `frontend/src/components/admin/UserManager.tsx`, `frontend/src/components/admin/LogViewer.tsx`, `frontend/src/components/admin/RecordManager.tsx`

### Approaches

1. **Incremental Extraction (Recommended)**
   - Create real `src/routes/`, `src/controllers/`, `src/services/`, `src/middleware/` directories in the project root (parallel to `src/models/`)
   - Extract **only admin backend functionality** into modular files first; keep all other monolith routes untouched in `server.js`
   - Mount modular admin routes in `server.js` (e.g., `app.use('/api/admin', require('./src/routes/admin.routes'))`)
   - Gradually redirect or alias existing `/api/users` and `/api/logs` to modular equivalents, or keep both during transition
   - Extract frontend admin tabs from `Dashboard.tsx` into `frontend/src/pages/admin/` with dedicated routes
   - Pros: Low risk, sets the pattern for future modularization (auth, records, messages), tests can be added incrementally, existing functionality never breaks
   - Cons: Temporary duplication between monolith and modular routes, requires discipline to complete the migration later
   - Effort: Medium

2. **Big Bang Backend Modularization**
   - Move ALL backend domains (auth, users, records, messages, logs) to modular structure in one change
   - Refactor `server.js` to a thin bootstrap that only configures express, middleware, and mounts routers
   - Pros: Clean final architecture, no duplicated code
   - Cons: High risk of breaking existing tests and routes, massive PR far exceeding 400-line review budget, hard to debug if something fails
   - Effort: High

3. **Frontend-Only Redesign**
   - Keep `server.js` monolith entirely
   - Only redesign the frontend admin UI with better components and routing
   - Pros: Very low risk, quick visual improvement
   - Cons: Does NOT meet the stated requirement of introducing modular backend architecture, misses the opportunity to establish the pattern
   - Effort: Low

### Recommendation

**Approach 1: Incremental Extraction.**

Why: The project's ADRs (0001, 0002) explicitly call for incremental modularization. The requirement states admin modularization should be "a pattern to gradually modularize the rest of the backend." A big bang would violate the delivery strategy (`chained-pr`, 400-line budget) and risk stability. Frontend-only misses the architectural goal.

The incremental approach:
1. Extract shared middleware (`isAuthenticated`, `isAdmin`, `validate`) to `src/middleware/`
2. Extract admin business logic to `src/services/admin.service.js`
3. Extract admin HTTP handlers to `src/controllers/admin.controller.js`
4. Extract admin routes to `src/routes/admin.routes.js`
5. Mount in `server.js`
6. Extract frontend admin UI to dedicated components under `frontend/src/pages/admin/`
7. Add route `/admin` in `App.tsx`
8. Write tests for the new modular backend endpoints

This creates a reproducible pattern: `middleware → service → controller → route` that can be replicated for `auth`, `records`, and `messages` in future changes.

### Risks

- **Test breakage**: Backend tests manipulate `require.cache` for `server.js`. Modular extraction changes the module graph; tests may need refactoring to mount routes on a test `app` instance instead of requiring the full server.
- **Session middleware ordering**: Modular routes rely on `req.session` set by `express-session`. The mounting order in `server.js` must remain correct (session before modular routes).
- **Route path drift**: If modular routes use different paths (e.g., `/api/admin/users` vs `/api/users`), the frontend `api.service.ts` calls must be updated in sync. Keeping aliases during transition mitigates this.
- **Review budget overflow**: Extracting middleware + service + controller + routes + frontend components + tests can easily exceed 400 lines. The work MUST be split into chained PRs (e.g., PR 1: backend middleware extraction, PR 2: admin backend modularization, PR 3: frontend admin redesign).
- **Silent error swallowing in frontend**: Current `Dashboard.tsx` has empty catch blocks (`catch { /* Silently ignore */ }`). The redesign should fix this pattern.
- **Model import coupling**: `server.js` currently imports models directly. Modular services will also need them; a `src/models/index.js` exporter should be introduced.

### Ready for Proposal

**Yes.** The current admin functionality is well-understood, the modular scaffold exists as prior art, and the incremental approach is clearly the right fit. The orchestrator should proceed to `sdd-propose` with the understanding that this change will be delivered as **chained PRs** to respect the 400-line review budget.
