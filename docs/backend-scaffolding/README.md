Backend Modular Scaffold for CLAUDIA Express

Overview
- This folder contains scaffolding to progressively refactor the monolithic Node.js/Express backend into a modular architecture.
- Current code remains in the root (server.js, models). The scaffolding is designed to be integrated incrementally.

Directory structure
- src/
- src/app.js           // Basic app bootstrap
- src/index.js         // Placeholder router and exports
- (future) src/models/
- (future) src/api/v1/
- (future) src/services/
- (future) src/middleware/
- README.md

How to proceed
- Start from fixing auth/session storage (connect-mongo) to ensure prod/dev parity.
- Move models into src/models and wire exports:
  export { User, Record, Message } from '../src/models'
- Create backend routes under src/api/v1 with controllers and services.
- Wire routes into Express app in src/app.js progressively.

Contribution guidelines
- Follow the same pattern: small patches, tests when possible, and update ADRs.
