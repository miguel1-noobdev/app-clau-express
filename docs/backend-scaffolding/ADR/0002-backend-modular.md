# ADR 0002: Backend Modularization Progression

Status: Proposed

Context
- We are scaffolding a modular backend while keeping the current monolith operational.
- The modular pieces will be loaded via a bootstrap function when enabled.

Decision
- Continue building backend/src with folders: models, services, controllers, routes, middleware.
- Ensure the bootstrap path is resilient if modules are not yet implemented.
- Endpoints under /api/v1 will be the first to migrate.

Consequences
- Safer incremental migration; partial functionality is expected during transition.
- ADRs for each module will be added as they are implemented.
