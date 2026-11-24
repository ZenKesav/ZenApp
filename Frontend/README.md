# Zenmeter Smart MES Frontend 2.0

Enterprise Smart Meter Manufacturing Execution System (MES) Frontend.

## Architectural Highlights
- **Hardware Abstraction Layer (HAL):** Low-level drivers isolated in `src/hardware/drivers/` and device protocols in `src/hardware/devices/`.
- **Zero-Conflict Stage Isolation:** Each manufacturing stage has an isolated module across hardware, UI components, hooks, services, and pages.
- **Dynamic Routing:** `src/core/routes/routeRegistry.js` auto-discovers all `*.routes.jsx` across pages without centralized merge conflicts.
