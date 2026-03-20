# Agent: frontend-react-phase2

Summary:
- Implement Phase 2: Migrating the frontend to React with a login and a basic dashboard.
- Prepare TS scaffolding for future migration to TypeScript (as requested).

What this agent will do:
- Create a clean Phase 2 implementation plan for React (already started in Phase 1).
- Add a small TS scaffold (tsconfig.json) and set up TS-friendly structure without breaking current JS React code.
- Add a simple Login page (TypeScript-friendly) that calls /api/auth/login.
- Add a basic Dashboard page to show after login.
- Ensure routing is prepared for future TS components (.tsx) and TSX-based pages.
- Document the approach in a small ADR (0003) if needed.

How to verify:
- In Phase 2 branch, ensure the frontend builds with TypeScript scaffolding (tsconfig.json present) but continues to run with the existing JS code.
- Check that /login routes render via React Router, and the login flow calls /api/auth/login successfully.
- Confirm that the TS scaffolding does not break the existing JS build.

Notes:
- TypeScript will be introduced progressively (not a breaking change yet).
- You can migrate individual components to TSX one by one.
