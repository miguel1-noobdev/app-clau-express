# Design: tanda2-admin-panel

## Technical Approach

Extract admin functionality from `server.js` into a clean `middleware → service → controller → route` pipeline, establishing the pattern for future modularization of auth, records, and messages. The frontend extracts admin tabs from `Dashboard.tsx` into dedicated components under a new `/admin` route. All changes respect the chained-PR strategy (3 slices ≤ 400 lines each).

## Architecture Decisions

### Decision: Incremental extraction over big-bang

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Big-bang modularization | Clean final state; high risk of breaking tests and routes | Rejected |
| Frontend-only redesign | Low risk; misses architectural goal | Rejected |
| Incremental extraction | Low risk; sets pattern for future slices | **Chosen** |

**Rationale**: The chained-PR delivery strategy (400-line budget) and existing ADRs (0001/0002) mandate incremental work. Existing tests depend on the monolith's module shape.

---

### Decision: New `/api/admin/*` path with alias period

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Replace `/api/users` entirely | Clean; requires synchronized frontend update | Rejected |
| Keep monolith paths, add `/api/admin/*` parallel | Duplication during transition; safest | **Chosen** |

**Rationale**: Avoids route path drift between monolith and modular routes. During the transition window, both paths are active. The monolith paths are removed only after full migration of a domain.

---

### Decision: Test `app` instance pattern over `require.cache` manipulation

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep `require.cache` manipulation | Works with monolith; fragile, blocks modular tests | Rejected |
| Mount routes on a fresh `express()` app | Test-only app; clean isolation | **Chosen** |

**Rationale**: `require.cache` deletion is fragile and does not work when routes live in separate modules. A test-only `app` instance is the standard supertest pattern and enables isolated testing of modular routes.

---

## Data Flow

```
Admin record edit with audit logging:

Browser ──→ Express Router (/api/admin/records/:id/admin-edit)
                │
                ├── auth.middleware.js ──→ isAuthenticated()
                │                                  │
                │        isAdmin() ◄──────────────┘
                │
                ├── validation.middleware.js ──→ validate()
                │
                ├── admin.controller.js ──→ adminEditRecord(req, res)
                │           │
                │           └── admin.service.js ──→ AdminService.editRecord()
                │                                       │
                │           Record.findByIdAndUpdate() ◄─┼── ModificationLog.create()
                │                                       │
                └────────── Response { success, record, logId }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/middleware/auth.middleware.js` | Create | `isAuthenticated`, `isAdmin` |
| `src/middleware/validation.middleware.js` | Create | `validate` (express-validator wrapper) |
| `src/middleware/admin-protection.middleware.js` | Create | `protectAdminAccount` |
| `src/services/admin.service.js` | Create | Business logic for users, records, logs |
| `src/controllers/admin.controller.js` | Create | HTTP handlers delegating to service |
| `src/routes/admin.routes.js` | Create | Express Router mounting all `/api/admin/*` endpoints |
| `src/models/index.js` | Create | Centralized model exports: `{ User, Record, AccessLog, ModificationLog, Message }` |
| `server.js` | Modify | Add `app.use('/api/admin', require('./src/routes/admin.routes'))` after session middleware; keep all monolith routes |
| `frontend/src/pages/admin/AdminDashboard.tsx` | Create | Layout component with admin nav tabs |
| `frontend/src/pages/admin/UserManager.tsx` | Create | User CRUD table, create/edit modals |
| `frontend/src/pages/admin/LogViewer.tsx` | Create | Access/modification log views with pagination |
| `frontend/src/pages/admin/RecordManager.tsx` | Create | Search + admin-edit/delete records |
| `frontend/src/App.tsx` | Modify | Add `<Route path="/admin" element={<AdminDashboard />} />` inside ProtectedRoute |
| `tests/users.test.js` | Modify | Refactor to test `app` instance pattern |
| `tests/records.test.js` | Modify | Refactor to test `app` instance pattern |
| `tests/auth.test.js` | Modify | Refactor to test `app` instance pattern |

## Interfaces / Contracts

### Backend — `src/services/admin.service.js`

```javascript
// src/services/admin.service.js
const { User, Record, AccessLog, ModificationLog } = require('../models');

/**
 * @typedef {Object} AdminUserResult
 * @property {boolean} success
 * @property {User[]} [users]
 * @property {User} [user]
 * @property {string} [error]
 */

/**
 * @typedef {Object} AdminRecordResult
 * @property {boolean} success
 * @property {Record} [record]
 * @property {string} [logId]
 * @property {string} [error]
 */

/**
 * @typedef {Object} AdminLogResult
 * @property {boolean} success
 * @property {Object[]} logs
 * @property {number} total
 */

/**
 * @param {string} sessionUserId
 * @returns {Promise<AdminUserResult>}
 */
async function listUsers(sessionUserId) { /* ... */ }

/**
 * @param {Object} userData - { username, password, role, phone, email }
 * @param {string} sessionUsername
 * @returns {Promise<AdminUserResult>}
 */
async function createUser(userData, sessionUsername) { /* ... */ }

/**
 * @param {string} userId
 * @param {Object} updateData - { username?, password?, role? }
 * @param {string} sessionUsername
 * @returns {Promise<AdminUserResult>}
 */
async function updateUser(userId, updateData, sessionUsername) { /* ... */ }

/**
 * @param {string} userId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteUser(userId) { /* ... */ }

/**
 * @param {string} userId
 * @returns {Promise<AdminUserResult>}
 */
async function toggleUserStatus(userId) { /* ... */ }

/**
 * @param {string} userId
 * @param {string} role
 * @param {string} sessionUsername
 * @returns {Promise<AdminUserResult>}
 */
async function changeUserRole(userId, role, sessionUsername) { /* ... */ }

/**
 * @param {string} userId
 * @returns {Promise<{success: boolean, temporaryPassword?: string}>}
 */
async function resetUserPassword(userId) { /* ... */ }

/**
 * @param {string} userId
 * @returns {Promise<{success: boolean, username: string, records: Record[]}>}
 */
async function getUserRecords(userId) { /* ... */ }

/**
 * @param {string} recordId
 * @param {Object} editData - { fecha?, horaInicio?, horaFin?, parador?, notas?, reason? }
 * @param {string} adminUsername
 * @returns {Promise<AdminRecordResult>}
 */
async function editRecord(recordId, editData, adminUsername) { /* ... */ }

/**
 * @param {string} recordId
 * @param {string} reason
 * @param {string} adminUsername
 * @returns {Promise<{success: boolean, logId: string}>}
 */
async function deleteRecord(recordId, reason, adminUsername) { /* ... */ }

/**
 * @param {{ limit?: number, offset?: number, username?: string, action?: string }} query
 * @returns {Promise<AdminLogResult>}
 */
async function getAccessLogs(query) { /* ... */ }

/**
 * @param {{ limit?: number, offset?: number, adminUsername?: string, action?: string }} query
 * @returns {Promise<AdminLogResult>}
 */
async function getModificationLogs(query) { /* ... */ }

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  changeUserRole,
  resetUserPassword,
  getUserRecords,
  editRecord,
  deleteRecord,
  getAccessLogs,
  getModificationLogs,
};
```

### Backend — Middleware functions

```javascript
// src/middleware/auth.middleware.js
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function isAuthenticated(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: 'No autenticado' });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function isAdmin(req, res, next) {
  try {
    const User = require('../models').User;
    const user = await User.findById(req.session.userId);
    if (user && (user.role === 'admin' || user.role === 'supervisor')) return next();
    res.status(403).json({ error: 'Acceso denegado' });
  } catch {
    res.status(500).json({ error: 'Error al verificar permisos' });
  }
}

// src/middleware/admin-protection.middleware.js
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function protectAdminAccount(req, res, next) {
  try {
    const User = require('../models').User;
    const target = await User.findById(req.params.id);
    if (target?.username === 'admin' && req.session?.username !== 'admin') {
      return res.status(403).json({ error: 'No se puede modificar la cuenta del administrador principal' });
    }
    next();
  } catch {
    res.status(500).json({ error: 'Error al verificar protección de cuenta' });
  }
}

// src/middleware/validation.middleware.js
const { validationResult } = require('express-validator');
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array().map(e => e.msg) });
  next();
}
```

### Backend — Controller functions

```javascript
// src/controllers/admin.controller.js
const AdminService = require('../services/admin.service');

/**
 * GET /api/admin/users
 */
async function getUsers(req, res) {
  const result = await AdminService.listUsers(req.session.userId);
  res.json(result);
}

/**
 * POST /api/admin/users
 */
async function createUser(req, res) {
  const result = await AdminService.createUser(req.body, req.session.username);
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json({ success: true, user: result.user });
}

/**
 * PUT /api/admin/users/:id
 */
async function updateUser(req, res) {
  const result = await AdminService.updateUser(req.params.id, req.body, req.session.username);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result.user);
}

/**
 * DELETE /api/admin/users/:id
 */
async function deleteUser(req, res) {
  const result = await AdminService.deleteUser(req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ success: true, message: 'Usuario eliminado correctamente' });
}

/**
 * PUT /api/admin/users/:id/toggle-status
 */
async function toggleUserStatus(req, res) {
  const result = await AdminService.toggleUserStatus(req.params.id);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
}

/**
 * PUT /api/admin/users/:id/role
 */
async function changeUserRole(req, res) {
  const { role } = req.body;
  const result = await AdminService.changeUserRole(req.params.id, role, req.session.username);
  if (result.error) return res.status(403).json({ error: result.error });
  res.json(result);
}

/**
 * PUT /api/admin/users/:id/reset-password
 */
async function resetPassword(req, res) {
  const result = await AdminService.resetUserPassword(req.params.id);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
}

/**
 * GET /api/admin/users/:id/records
 */
async function getUserRecords(req, res) {
  const result = await AdminService.getUserRecords(req.params.id);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
}

/**
 * PUT /api/admin/records/:id/admin-edit
 */
async function editRecord(req, res) {
  const result = await AdminService.editRecord(req.params.id, req.body, req.session.username);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json({ success: true, record: result.record, logId: result.logId });
}

/**
 * DELETE /api/admin/records/:id/admin-delete
 */
async function deleteRecord(req, res) {
  const result = await AdminService.deleteRecord(req.params.id, req.body?.reason || '', req.session.username);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json({ success: true, message: 'Registro eliminado correctamente', logId: result.logId });
}

/**
 * GET /api/admin/logs/access
 */
async function getAccessLogs(req, res) {
  const result = await AdminService.getAccessLogs(req.query);
  res.json(result);
}

/**
 * GET /api/admin/logs/modifications
 */
async function getModificationLogs(req, res) {
  const result = await AdminService.getModificationLogs(req.query);
  res.json(result);
}

module.exports = {
  getUsers, createUser, updateUser, deleteUser,
  toggleUserStatus, changeUserRole, resetPassword, getUserRecords,
  editRecord, deleteRecord,
  getAccessLogs, getModificationLogs,
};
```

### Frontend — Component props and state

```typescript
// frontend/src/pages/admin/AdminDashboard.tsx
interface AdminDashboardProps {
  // Inherits role from auth context via ProtectedRoute
}

interface AdminDashboardState {
  activeSection: 'users' | 'logs' | 'records';
  isLoading: boolean;
  error: string | null;
}

// frontend/src/pages/admin/UserManager.tsx
interface UserManagerProps {
  /** Called when admin edits a user — refreshes the user list */
  onRefresh: () => void;
}

interface UserManagerState {
  users: User[];
  loading: boolean;
  error: string | null;
  showCreateModal: boolean;
  showEditModal: boolean;
  editingUser: User | null;
  createForm: CreateUserForm;
  editForm: EditUserForm;
}

interface CreateUserForm {
  username: string;
  password: string;
  role: 'user' | 'admin' | 'supervisor';
  phone: string;
  email: string;
}

// frontend/src/pages/admin/LogViewer.tsx
interface LogViewerProps {
  logType: 'access' | 'modifications';
}

interface LogViewerState {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
  loading: boolean;
  error: string | null;
}

// frontend/src/pages/admin/RecordManager.tsx
interface RecordManagerProps {
  onRefresh?: () => void; // optional, for post-edit refresh
}

interface RecordManagerState {
  records: Record[];
  userFilter: string; // username to filter by
  loading: boolean;
  error: string | null;
}
```

### Test — `app` singleton pattern

```javascript
// Pattern used in all backend integration tests
// server.js exports the Express app singleton (module.exports = app).
// No require.cache manipulation is needed because modular route files
// are loaded once and reused; the singleton already mounts them.
const app = require('../../server');

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.SESSION_SECRET = 'test-secret-key';
  process.env.ADMIN_PASSWORD = 'AdminPass123';

  await app.dbConnectPromise;

  await User.deleteMany({});
  const admin = new User({ username: 'admin', password: process.env.ADMIN_PASSWORD, role: 'admin' });
  await admin.save();
});
```

## Chained PR Strategy

### PR #1 — Middleware + Service + Models Index (~300 lines)
Files: `src/middleware/auth.middleware.js`, `src/middleware/validation.middleware.js`, `src/middleware/admin-protection.middleware.js`, `src/services/admin.service.js`, `src/models/index.js`

- No routes mounted yet; no behavior change visible to tests
- `AdminService` functions are standalone (no router dependency)
- Existing `server.js` and tests unaffected

### PR #2 — Controller + Routes + server.js mount (~300 lines)
Files: `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`, `server.js` (mount only)

- Mount: `app.use('/api/admin', require('./src/routes/admin.routes'))` after session middleware
- Old monolith admin routes remain active (alias period)
- New `/api/admin/*` endpoints fully functional

### PR #3 — Frontend admin panel (~350 lines)
Files: `frontend/src/pages/admin/`, `frontend/src/App.tsx`

- Extract admin tabs from `Dashboard.tsx` → `AdminDashboard`, `UserManager`, `LogViewer`, `RecordManager`
- Add `/admin` route in `App.tsx` inside `ProtectedRoute`
- `AdminDashboard` performs role check on mount and redirects non-admin users to `/dashboard`
- Fix all empty `catch { /* Silently ignore */ }` blocks

### PR #4 — Test refactor (~200 lines)
Files: `tests/*.test.js`

- Refactor all 3 test files: replace `delete require.cache[...]` with direct `app` assignment
- Add integration tests for new `/api/admin/*` endpoints

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (backend) | `AdminService` functions in isolation | Direct function calls with mocked Mongoose models |
| Integration (backend) | Full request/response on test `app` | supertest agent, authenticated as admin and non-admin |
| Integration (backend) | Role guard + admin-account protection | supertest with supervisor agent attempting admin actions |
| Unit (frontend) | `UserManager` renders table, modals open | Vitest + Testing Library |
| Unit (frontend) | `AdminDashboard` redirects non-admin | Vitest + Testing Library |
| E2E | Full admin flow: login → users → edit → logs | Playwright with existing test infrastructure |

## Migration / Rollout

No database migration required. No feature flags needed — the modular admin endpoints coexist with monolith endpoints during the transition window.

## Open Questions

- [ ] Should PR #3 also remove the admin-specific tab conditionals from `Dashboard.tsx`, or leave them as aliases pointing to the new `/admin` route during the transition?
- [x] Should the `src/models/index.js` re-export include the `Message` model even though messages are not in scope, to establish a complete pattern for future modules? **Decision: yes.**
- [x] Does the frontend `ProtectedRoute` component have a role-check prop, or does `AdminDashboard` perform its own redirect? **Decision: `AdminDashboard` performs the role check on mount and redirects non-admin users to `/dashboard`.**
