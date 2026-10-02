# ServiceFlow - ITSM Service Request Management System

An enterprise-grade, full-stack **ITSM (Information Technology Service Management) Service Request Management System** built with **React (Vite)**, **Node.js + Express**, and **SQLite**.

The system simulates a complete ITIL-aligned service request lifecycle with multi-tier approval workflows, dynamic SLA deadline calculations, real-time ticking countdown timers, fulfillment queues, and an executive KPI dashboard with interactive filters.

---

## 🌟 Key Features

- **Service Catalog**: Browse and submit requests across 5 distinct IT offerings (Hardware, Software, Security, HR, Identity).
- **Automated Workflow State Machine**:
  - `New` ➔ `Pending Approval` ➔ `Approved` ➔ `In Progress` ➔ `Fulfilled` ➔ `Closed` (or `Rejected`).
  - **Zero-approval items**: Password Reset auto-approves instantly.
  - **Single-level approval**: VPN Access and Onboarding require Manager endorsement.
  - **Two-level approval**: Laptop and Software requests require Manager (Level 1) then IT Security (Level 2).
  - Terminal rejection path with mandatory auditor reason notes.
- **Real-Time SLA Engine & Live Timers**:
  - Priority standards: **High** (4 Hours), **Medium** (24 Hours), **Low** (72 Hours).
  - Ticking live countdown timer with sub-second precision.
  - **At-Risk Warning**: Tickets with < 20% SLA remaining pulse in amber.
  - **Breached Alert**: Requests past due date turn red.
  - Automated breach scanner runs on every read and every 60 seconds in the background.
- **Executive KPI Dashboard (Recharts)**:
  1. **Request Volume**: Daily intake velocity chart & breakdown by catalog service.
  2. **Active Backlog**: Open request queues segmented by status.
  3. **SLA Compliance %**: Donut chart of Met vs. Breached and per-priority compliance bars.
  4. **Average Resolution Time**: Turnaround time in hours across catalog categories.
  - Interactive Date Range (7d, 14d, 30d, All) and Priority filters.
- **Role Switcher Dropdown**:
  - Instantly switch personas without passwords to test every perspective:
    - **Alice Johnson** (*Requester*)
    - **Bob Smith** (*Manager / Level 1 Approver*)
    - **Charlie Davis** (*IT Approver / Level 2 Approver*)
    - **Diana Prince** (*IT Fulfiller / Engineer*)
- **Complete Audit Trail**: Immutable history log recording every state transition, actor, timestamp, and audit note.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **Backend** | Node.js (v20+ / v24), Express, CORS |
| **Database** | SQLite3 (`better-sqlite3` with `node:sqlite` fallback) |
| **Dev Tools** | `concurrently` for unified local execution |

---

## 🚀 Quick Start & Installation

No external paid services or database installations are needed. Everything runs locally out of the box.

### Prerequisites
- Node.js (v18, v20, v22, or v24)
- npm (v9+)

### 1. Clone & Install Dependencies
Run the following command from the project root:
```bash
npm run install:all
```
*(Or install packages in root, `/server`, and `/client` individually with `npm install`)*

### 2. Seed Database with Realistic Sample Data
Populate 5 catalog services, 5 users covering all roles, and 25 realistic sample requests spread over the last 14 days with ~5 SLA breaches:
```bash
npm run seed
```

### 3. Start the Full Application
Launch both backend (`http://localhost:5000`) and frontend (`http://localhost:5173`) with a single command:
```bash
npm run dev
```

Open your browser to:
👉 **`http://localhost:5173`**

---

## 🧭 How to Test & Demo Roles

Use the **Role Switcher** in the top navigation bar to test each persona's permissions and queues:

1. **Submit a Request (Alice Johnson - Requester)**:
   - Navigate to **Service Catalog**.
   - Click **Request Service** on *Laptop Request*.
   - Select **High Priority (4h SLA)**, enter business justification, and submit.
2. **Manager Approval (Bob Smith - Manager)**:
   - Switch role to **Bob Smith**.
   - Navigate to **Approvals Queue** (notice the red badge counter).
   - Click **Approve** and add comments ("Budget approved").
   - Notice the ticket moves to Level 2 (IT Approver).
3. **IT Security Approval (Charlie Davis - IT Approver)**:
   - Switch role to **Charlie Davis**.
   - Go to **Approvals Queue**.
   - Click **Approve** on the Level 2 approval. The request transitions to `Approved`.
4. **Fulfillment (Diana Prince - Fulfiller)**:
   - Switch role to **Diana Prince**.
   - Open **Fulfillment Queue**.
   - Click **Start Progress** (moves to `In Progress`).
   - Click **Mark Fulfilled**, enter serial numbers/provisioning notes, and confirm.
5. **Verify and Close (Alice Johnson - Requester)**:
   - Switch role back to **Alice Johnson**.
   - Open **My Requests**, view the live SLA result, and click **Close Ticket**.
   - Click the eye icon to view the complete chronological audit trail!

---

## 📡 REST API Reference

All routes are served from `http://localhost:5000/api`.

### Catalog & Users
- `GET /api/catalog`: Retrieve all service catalog items.
- `GET /api/users`: List users and roles for the demo switcher.

### Requests
- `GET /api/requests`: List requests. Supports `requester_id`, `status`, `priority`, `search`, and `sla_breached` query parameters.
- `GET /api/requests/:id`: Retrieve request details, approval gateway records, and full audit history.
- `POST /api/requests`: Submit a new request.
  ```json
  {
    "catalog_item_id": 1,
    "requester_id": 1,
    "description": "MacBook Pro replacement for mobile engineer",
    "priority": "High"
  }
  ```
- `PATCH /api/requests/:id/progress`: Move approved request to `In Progress`.
- `PATCH /api/requests/:id/fulfill`: Mark request as `Fulfilled` (records resolution time & calculates SLA).
- `PATCH /api/requests/:id/close`: Requester closes ticket.

### Approvals
- `GET /api/approvals`: List pending approvals. Supports `level` (1 or 2) and `role` (`manager` or `it_approver`).
- `POST /api/approvals/:id/decide`: Approve or reject a pending approval step.
  ```json
  {
    "approver_id": 2,
    "decision": "approved",
    "comments": "Endorsed for Q4 project budget"
  }
  ```

### Dashboard Analytics
- `GET /api/dashboard`: Aggregates the 4 KPI widgets. Supports `days` (`7`, `14`, `30`, `all`) and `priority` (`High`, `Medium`, `Low`, `all`).

---

## 📸 Checklist of Screenshots to Take for README

When creating your project portfolio or presentation, capture these key screenshots and save them in `/docs/screenshots/`:

- [ ] **1. Executive KPI Dashboard**: Full dashboard view showing all 4 Recharts widgets, summary metric cards, and date/priority filters.
- [ ] **2. Service Catalog Grid**: Catalog page displaying cards for Laptop, Software, VPN, Onboarding, and Password Reset with category pills and approval badges.
- [ ] **3. Service Request Modal**: The interactive submission dialog with Priority and SLA target selection buttons.
- [ ] **4. Approvals Queue (Manager / IT)**: Approvals gateway displaying pending approval cards, SLA countdowns, and Approve/Reject buttons.
- [ ] **5. Approval Decision Modal**: Dialog showing decision note input for approval or rejection.
- [ ] **6. Fulfillment Queue**: IT engineer queue showing `Approved` and `In Progress` workorders with SLA urgency badges.
- [ ] **7. Live SLA Indicators**: Highlighting Healthy (green), At-Risk (pulsing amber), and Breached (red) badges.
- [ ] **8. Audit Trail Modal**: The chronological timeline view with approval cards and full history event list.
- [ ] **9. Role Switcher**: Expanded dropdown menu displaying all 4 personas.

---

## 📚 Process & Workflow Documentation

For complete ITIL request lifecycle flowcharts, RACI matrices, SLA computation formulas, and KPI definitions, see:
👉 **[docs/process.md](docs/process.md)**

---

## 📄 License
MIT License. Created for ITSM Service Request Management simulation.
