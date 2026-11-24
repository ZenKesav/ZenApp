# Zenmeter Enterprise Smart Meter MES Backend API Engine

Enterprise vertical-slice manufacturing execution system (MES) backend for smart meter production lines.

## Architecture

- **Clean Vertical-Slice Architecture:** Dedicated zero-conflict modules per functional domain (`upload`, `auth`, `admin`, `supervisor`, `qc`, `analysis`, `stages`).
- **Dedicated Stage Modules:** Manufacturing Stages 01 to 11 with isolated controllers, services, models, and routes.
- **Hardware Integration:**
  - **Stage 04 (NIC Card Assembly & Print / Jig):** 8-channel hardware protocol runner, serial port connection, duplicate IMEI verification, automatic UUID allocation, and test telemetry transactions.
  - **Stage 09 (Meter Box Print):** DLMS Optical Probe reader and Laser Marking serial print session integration.
- **Realtime Gateway:** High-performance WebSocket event emitter (`/ws`) for live operator dashboards and optical tunnel communication.
- **Persistence & Caching:** PostgreSQL enterprise database engine with automated table migrations and Redis distributed caching/locking.

## API Route Endpoints

- **Authentication:** `/api/v1/auth/*`
- **Admin Management:** `/api/v1/admin/*`, `/api/v1/users/*`, `/api/v1/roles/*`, `/api/v1/shifts/*`, `/api/v1/meters/*`, `/api/v1/assignments/*`, `/api/v1/audit/*`, `/api/v1/production/*`
- **Supervisor Station:** `/api/v1/supervisor/*` (alias: `/api/v1/supervisor-test/*`)
- **QC Station:** `/api/v1/qc/*` (alias: `/api/v1/qc-test/*`)
- **Analysis & Reporting:** `/api/v1/analysis/*` (alias: `/api/v1/reports/*`)
- **Common Upload Engine:** `/api/v1/upload/*` (images, PDFs)
- **Manufacturing Stages (01-11):** `/api/v1/stages/*`
- **Jig Test Hardware Engine:** `/api/v1/jig/*` (Direct mapping to Stage 04)
- **Health Check:** `GET /api/v1/health`

## Getting Started

```bash
# Start backend server
npm start
```
