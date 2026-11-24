# Zenmeter Application - Tech Stack Specification

This document details the complete technology stack, programming languages, frameworks, styling, libraries, and architecture used across the Zenmeter Application.

---

## 1. Backend Stack

| Category | Technology | Details / Version |
| :--- | :--- | :--- |
| **Language** | **JavaScript (Node.js)** | Node.js Runtime (CommonJS modules) |
| **Framework** | **Express.js** | `^4.19.2` (RESTful API & Routing) |
| **Databases** | **PostgreSQL** & **SQLite** | `pg` (`^8.23.0`) for main database, `sqlite3` (`^5.1.7`) for station/local storage |
| **Realtime Communication** | **WebSockets (`ws`)** | `^8.16.0` (Bi-directional real-time communication) |
| **Authentication & Security** | **JWT & Bcrypt** | `jsonwebtoken` (`^9.0.2`), `bcryptjs` (`^2.4.3`), `cors` (`^2.8.5`) |
| **Hardware & Protocol Communication** | **Gurux DLMS & SerialPort** | `@bubblyworld/gurux-dlms-ts` (`^1.5.1`), `serialport` (`^13.0.0`) for smart meter testing |
| **Environment Configuration** | **dotenv** | `^16.4.5` |
| **Unique Identifiers** | **UUID** | `uuid` (`^9.0.1`) |

### Key Backend Features & Modules
- Modular architecture under `Backend/src/` (Auth, Users, Roles, Permissions, Meters, Production, QC / Supervisor Testing, Hardware / Station Agent, Shifts, Audit, Realtime).
- Station agent script (`station-agent.js`) for hardware serial communication and automated meter testing.

---

## 2. Frontend Stack

| Category | Technology | Details / Version |
| :--- | :--- | :--- |
| **Language** | **JavaScript (ES Modules & JSX)** | ES6+ Modern JavaScript (`.jsx` / `.js`) |
| **UI Framework / Library** | **React** | `^18.2.0` (with `react-dom` `^18.2.0`) |
| **Build Tool / Bundler** | **Vite** | `^5.1.6` (with `@vitejs/plugin-react` `^4.2.1`) |
| **Routing** | **React Router DOM** | `^6.22.3` (Single Page Application routing) |
| **Styling & CSS Architecture** | **Custom Vanilla CSS (CSS3)** | Modular CSS with CSS Custom Properties / Variables (`variables.css`, `main.css`, `components.css`, `layout.css`, `responsive.css`) |
| **Icon Libraries** | **Lucide React & Tabler Icons** | `lucide-react` (`^0.344.0`) and Tabler Icons (`tabler-icons.min.css`) |
| **Charts & Data Visualization** | **ApexCharts & Recharts** | `apexcharts` (`^3.52.0`), `react-apexcharts` (`^1.4.1`), `recharts` (`^2.12.2`) |
| **Alerts & Modals** | **SweetAlert2** | `sweetalert2` (`^11.26.25`) |
| **Document Processing** | **PDF.js** | `pdfjs-dist` (`^6.5.438`) for reading/rendering PDF documents |

### Key Frontend Features & Structure
- Single Page Application (SPA) structured inside `Frontend/src/`.
- Clean separation of Layouts (`MainLayout`), Components, Pages/Modules, Styles, and Contexts/Hooks.
- Fully responsive design using modern CSS media queries and root design tokens.

---

## 3. Summary Overview

```
Zenmeter Application
│
├── Backend
│   ├── Runtime: Node.js
│   ├── Language: JavaScript (CommonJS)
│   ├── Framework: Express.js 4.x
│   ├── Real-Time: WebSockets (ws)
│   ├── Databases: PostgreSQL (Primary), SQLite3 (Local / Station)
│   └── Hardware: SerialPort, Gurux DLMS (Smart Meter Protocol)
│
└── Frontend
    ├── Framework: React 18
    ├── Language: JavaScript (JSX, ES6+)
    ├── Bundler: Vite 5
    ├── Routing: React Router DOM 6
    ├── Styling: Custom CSS3 (CSS Variables, Flexbox/Grid, Responsive)
    ├── Icons: Lucide React, Tabler Icons
    └── Charts: ApexCharts, Recharts
```
