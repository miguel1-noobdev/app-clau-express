# ADR 0001: Modular Backend Bootstrap

Status: Proposed

Context
- The current backend is monolithic (single server.js) with embedded routes and models.
- We want to progressively refactor to modular architecture to improve maintainability and learning.

Decision
- Introduce a modular bootstrap scaffold under backend/src with folders: models, services, controllers, routes, middleware.
- Load modular routes conditionally via environment flag MODULAR_BACKEND (default: off).
- Expose a minimal health endpoint to verify bootstrap, and keep legacy endpoints active.

Consequences
- Safer incremental migration; can start with minimal changes and grow.
- Requires disciplined documentation and ADRs for each module.
- Potential for duplicated functionality if not carefully wired; ensure proper wiring order.
