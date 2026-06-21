# Spec: tanda2-admin-panel

## Domain

Admin Panel — Modular backend and dedicated frontend for user management, record administration, and audit logs.

## Purpose

Extract admin functionality from the `server.js` monolith into a reproducible `middleware → service → controller → route` architecture, and extract frontend admin UI from `Dashboard.tsx` into dedicated components under `/admin`.

## Requirements

### Requirement: Modular Backend Architecture

The admin backend SHALL follow the layered pattern `middleware → service → controller → route`.

| Layer | File | Responsibility |
|-------|------|---------------|
| Middleware | `src/middleware/auth.middleware.js` | `isAuthenticated`, `isAdmin` |
| Middleware | `src/middleware/validation.middleware.js` | `validate` (express-validator wrapper) |
| Middleware | `src/middleware/admin-protection.middleware.js` | `protectAdminAccount` |
| Service | `src/services/admin.service.js` | Business logic for users, records, logs |
| Controller | `src/controllers/admin.controller.js` | HTTP request/response handling |
| Route | `src/routes/admin.routes.js` | Router mounting all admin endpoints |
| Model index | `src/models/index.js` | Centralized model exports |

#### Scenario: Layer isolation

- GIVEN a request to any admin endpoint
- WHEN the request flows through the system
- THEN it MUST pass through middleware → service → controller in that order

### Requirement: Admin API Endpoints

All admin endpoints SHALL be mounted under `/api/admin` and require `isAuthenticated` + `isAdmin`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users` | isAuth + isAdmin | List all users (no password field) |
| POST | `/api/admin/users` | isAuth + isAdmin | Create user with validation |
| PUT | `/api/admin/users/:id` | isAuth + isAdmin + protectAdmin | Update user |
| DELETE | `/api/admin/users/:id` | isAuth + isAdmin + protectAdmin | Delete user |
| PUT | `/api/admin/users/:id/toggle-status` | isAuth + isAdmin + protectAdmin | Block/unblock user |
| PUT | `/api/admin/users/:id/role` | isAuth + isAdmin + protectAdmin | Change user role |
| PUT | `/api/admin/users/:id/reset-password` | isAuth + isAdmin + protectAdmin | Reset password |
| GET | `/api/admin/users/:id/records` | isAuth + isAdmin | Get user's records |
| PUT | `/api/admin/records/:id/admin-edit` | isAuth + isAdmin | Edit any record + audit log |
| DELETE | `/api/admin/records/:id/admin-delete` | isAuth + isAdmin | Delete any record + audit log |
| GET | `/api/admin/logs/access` | isAuth + isAdmin | Access logs with filter/pagination |
| GET | `/api/admin/logs/modifications` | isAuth + isAdmin | Modification logs with filter/pagination |

#### Scenario: Admin edits a record

- GIVEN an admin is authenticated
- WHEN they PUT `/api/admin/records/:id/admin-edit` with valid data
- THEN the record is updated and a modification log is created
- AND the response includes `{ success: true, record, logId }`

#### Scenario: Non-admin access denied

- GIVEN a regular user is authenticated
- WHEN they GET `/api/admin/users`
- THEN the response MUST be 403 with `{ error: 'Acceso denegado' }`

#### Scenario: Main admin account protected

- GIVEN a non-main-admin user (e.g., supervisor) is authenticated
- WHEN they PUT `/api/admin/users/:adminId/role`
- THEN the response MUST be 403

### Requirement: Frontend Admin Panel

The frontend SHALL provide dedicated admin routes and components.

| Route | Component | Responsibility |
|-------|-----------|--------------|
| `/admin` | `AdminDashboard.tsx` | Layout, navigation between admin sections |
| `/admin/users` | `UserManager.tsx` | User CRUD table, create/edit modals |
| `/admin/logs` | `LogViewer.tsx` | Access and modification log views |
| `/admin/records` | `RecordManager.tsx` | Search and admin-edit/delete records |

#### Scenario: Admin navigates to admin panel

- GIVEN an admin user is on `/dashboard`
- WHEN they click the admin navigation link
- THEN they are routed to `/admin` and `AdminDashboard` renders

#### Scenario: Non-admin cannot access admin routes

- GIVEN a regular user is authenticated
- WHEN they navigate to `/admin`
- THEN they MUST be redirected to `/dashboard`

### Requirement: Error Handling

The frontend admin components SHALL NOT silently swallow errors. All catch blocks MUST surface meaningful error messages to the user.

#### Scenario: API error in UserManager

- GIVEN the user creation API returns 400
- WHEN `UserManager` handles the error
- THEN a meaningful error message is displayed (not silently ignored)

## Test Scenarios

### Backend Integration Tests (Jest + supertest)

| Test | Endpoint | Assertion |
|------|----------|-----------|
| Admin lists users | GET /api/admin/users | 200, array of users without passwords |
| Admin creates user | POST /api/admin/users | 201, user returned with mustChangePassword=true |
| Admin updates record | PUT /api/admin/records/:id/admin-edit | 200, record updated, ModificationLog created |
| Supervisor cannot delete main admin | DELETE /api/admin/users/:adminId | 403 |
| Non-admin access rejected | GET /api/admin/users | 403 |
| Pagination works | GET /api/admin/logs/access?limit=10&offset=0 | 10 logs returned, total count included |

**Test setup**: Tests MUST mount routes on a test `express()` app instance (not `require.cache` manipulation).

### Frontend Unit Tests (Vitest + Testing Library)

| Test | Component | Assertion |
|------|-----------|-----------|
| Renders user table | `UserManager` | Table with username, role, status columns |
| Create user modal opens | `UserManager` | Modal appears on "Nuevo" click |
| Non-admin redirect | `AdminDashboard` | Redirects when user role is not admin/supervisor |
| Error display | `UserManager` | Error message shown on failed API call |
| Log pagination | `LogViewer` | Next/prev buttons load different log pages |

## Scope Boundaries

- **In scope**: Admin backend modularization, admin frontend extraction, test refactoring
- **Out of scope**: Auth modularization, records modularization, messages modularization, `api.service.ts` changes

## Chained PR Slices

| PR | Scope | Files |
|--|-------|-------|
| #1 | Middleware + service + models index | `src/middleware/*.js`, `src/services/admin.service.js`, `src/models/index.js` |
| #2 | Controller + routes + server.js mount | `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`, `server.js` |
| #3 | Frontend + tests | `frontend/src/pages/admin/`, `frontend/src/App.tsx`, `tests/` refactor |
