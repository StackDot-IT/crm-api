# 📘 StackDot CRM — Complete Technical Architecture & System Handover Documentation

> **Document Version**: `2.0.0 (Production Handover Edition)`  
> **Target Audience**: Incoming Lead Developers, Full-Stack Engineers, DevOps Engineers, Product Owners, and Technical Support Leads.  
> **Purpose**: This document serves as the single source of truth for the entire StackDot CRM codebase. It details the design philosophy, database schemas, role hierarchies, business logic flows, API specifications, real-time WebSocket architecture, deployment guidelines, and gotchas so that the team can independently maintain, extend, and deploy the system without external assistance.

---

## 📑 Table of Contents

1. [Executive Overview & Product Scope](#1-executive-overview--product-scope)
2. [Monorepo Architecture & Directory Structure](#2-monorepo-architecture--directory-structure)
3. [Technology Stack & Dependency Matrix](#3-technology-stack--dependency-matrix)
4. [Database Architecture & The Ironclad Rules](#4-database-architecture--the-ironclad-rules)
5. [Multi-Tenant Hierarchy & RBAC Scoping Engine](#5-multi-tenant-hierarchy--rbac-scoping-engine)
6. [Core Business Modules & End-to-End Flows](#6-core-business-modules--end-to-end-flows)
   - [6.1 Authentication, Tokens & Security](#61-authentication-tokens--security)
   - [6.2 Company & Branch Management](#62-company--branch-management)
   - [6.3 Lead Management, Qualification & Auto-Assignment Engine](#63-lead-management-qualification--auto-assignment-engine)
   - [6.4 Communication Logs & Follow-up Scheduling Engine](#64-communication-logs--follow-up-scheduling-engine)
   - [6.5 Opportunities, Pipelines & Deal Conversions](#65-opportunities-pipelines--deal-conversions)
   - [6.6 Proposals, Versioning & Quotations](#66-proposals-versioning--quotations)
   - [6.7 Customer Onboarding & Revenue Tracking](#67-customer-onboarding--revenue-tracking)
   - [6.8 KPI, Targets & Performance Analytics](#68-kpi-targets--performance-analytics)
   - [6.9 Real-Time Notifications & WebSocket Infrastructure](#69-real-time-notifications--websocket-infrastructure)
   - [6.10 Central Audit Logging System](#610-central-audit-logging-system)
   - [6.11 Reports, Analytics & Export Engine](#611-reports-analytics--export-engine)
7. [Frontend Architecture & UI Design System](#7-frontend-architecture--ui-design-system)
   - [Dynamic Theme Engine (Multi-Tenant Branding)](#dynamic-theme-engine-multi-tenant-branding)
   - [Modal, Drawer & Stacking Context Guidelines](#modal-drawer--stacking-context-guidelines)
   - [Toast Notification & Deduplication Rules](#toast-notification--deduplication-rules)
8. [Local Development Setup & Seeding](#8-local-development-setup--seeding)
9. [Production Deployment & DevOps Operations](#9-production-deployment--devops-operations)
10. [Critical Gotchas, Troubleshooting & Maintenance FAQ](#10-critical-gotchas-troubleshooting--maintenance-faq)

---

## 1. Executive Overview & Product Scope

**StackDot CRM** is a cloud-ready, enterprise-grade Customer Relationship Management system custom-tailored for multi-branch educational organizations, technical institutes, and B2B/B2C sales organizations.

### Key Capabilities:
- **True Multi-Tenancy**: Complete company-level data isolation with sub-tier branch management.
- **Role-Ranked Access Control (RBAC)**: Fine-grained permissions governed by rank integers (`20` to `100`), ensuring strict vertical and horizontal data fencing.
- **Automated Lead Ingestion & Distribution**: Round-robin and capacity-aware lead assignment algorithms.
- **Omnichannel Follow-up & Reminder System**: Real-time cron jobs checking follow-ups every 60 seconds with WebSocket notifications delivered 15 minutes before scheduled interactions.
- **Unified Communication & Follow-up Micro-Banner**: Sales reps can review call history and reschedule or book upcoming interactions from a single drawer without switching context.
- **Full Sales Pipeline to Revenue Journey**: Lead → Opportunity → Proposal (with PDF export) → Deal Won → Customer → Revenue Recognition.
- **Dynamic White-Label Branding**: Companies can customize logos, favicons, primary brand colors, and navigation styling on the fly via CSS variable injections.

---

## 2. Monorepo Architecture & Directory Structure

The project is structured into two autonomous, highly decoupled subsystems:

```
crm/
├── crm-api/                 # Node.js + Express backend service
│   ├── prisma/             # Prisma schema, migrations, and seed scripts
│   │   ├── migrations/     # Strictly tracked SQL migration history
│   │   ├── schema.prisma   # 63 database models
│   │   ├── seed.js         # Initial system roles and permissions seeder
│   │   └── seedDemoData.js # 1-click demo pipeline, leads, and follow-ups seeder
│   └── src/
│       ├── config/         # Database client, system initializer (initSystem.js)
│       ├── jobs/           # Scheduled background tasks (reminderJob.js)
│       ├── middleware/     # Auth guard, RBAC permission checker, error handlers
│       ├── modules/        # Domain-driven feature modules (28 modules)
│       ├── sockets/        # Socket.io connection manager and user room emitters
│       └── utils/          # AppError class, standardized API response formatters
│
├── crm-web/                 # React 19 + Vite frontend Single Page Application (SPA)
│   ├── public/             # Static brand assets (logos, favicons, illustrations)
│   │   └── logos/          # SVG, PNG, and ICO brand marks
│   └── src/
│       ├── api/            # Axios HTTP client with interceptors
│       ├── app/            # Application shell, routing table, root providers
│       │   ├── providers/  # AuthProvider, SocketProvider, ThemeProvider
│       │   └── routes/     # Protected route guards and RBAC route definitions
│       ├── features/       # 30+ modular feature domains (leads, deals, kpi, etc.)
│       ├── lib/            # React Query client, permissions catalog
│       └── shared/         # Reusable design system primitives
│           ├── components/ # Drawer, Modal, Button, TextField, Toaster, Topbar, Sidebar
│           ├── context/    # Global loader context
│           ├── hooks/      # useExport, useSocket, useRouteLoader
│           └── styles/     # Tailwind CSS configuration and theme variables
```

---

## 3. Technology Stack & Dependency Matrix

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime (Backend)** | Node.js (ESM) | `20.x` / `24.x` | High-throughput asynchronous backend service |
| **API Framework** | Express | `^5.2.1` | REST API routing and middleware pipeline |
| **ORM & Database** | Prisma ORM | `^6.19.3` | Type-safe schema definition and query generation |
| **Database Engine** | PostgreSQL | `14+` / `16+` | ACID-compliant relational persistence store |
| **Real-time WebSockets** | Socket.io | `^4.8.3` | Bidirectional real-time event distribution |
| **Security Suite** | Helmet & RateLimit | `^8.1.0` / `^8.5.2` | HTTP header hardening & IP rate limiting (1000 req/15m) |
| **Auth Tokens** | jsonwebtoken | `^9.0.3` | Dual-token authentication (Access + Refresh tokens) |
| **Frontend Framework** | React | `^19.0.0` | Declarative component UI library |
| **Build Tool** | Vite | `^6.4.2` | Lightning-fast HMR and Rollup-based production bundler |
| **Styling & Theme** | Tailwind CSS & MUI | `^4.2.2` / `^9.1.2` | Utility-first styling combined with specialized MUI components |
| **Server State** | TanStack React Query| `^5.101.2` | Client caching, automatic background refetching |
| **Toast Notifications**| Sonner | `^2.0.7` | Headless, modern toast notification engine |
| **Reporting & Export** | xlsx & html2pdf.js | `^0.18.5` / `^0.14.0`| Client-side Excel spreadsheet and PDF report generation |

---

## 4. Database Architecture & The Ironclad Rules

### ⚠️ THE IRONCLAD RULE: DATABASE MIGRATIONS
> [!CAUTION]
> **NEVER, UNDER ANY CIRCUMSTANCES, RUN `npx prisma db push` IN THIS CODEBASE.**  
> Running `db push` will bypass the migration history, desynchronize existing production databases, break team staging environments, and potentially cause catastrophic schema drop failures.
>
> **The ONLY allowed way to update the database schema:**
> ```bash
> cd crm-api
> npx prisma migrate dev --name <descriptive_migration_name>
> npx prisma generate
> ```

### Database Model Subsystems (63 Models Total):
1. **Tenancy & Organization**: `Company`, `Branch`, `CompanySettings`, `GlobalSystemSetting`
2. **Identity & Security**: `User`, `Role`, `UserRole`, `Permission`, `RefreshToken`, `PasswordReset`, `PasswordHistory`, `LoginAttemptLog`
3. **Leads & Pipeline**: `Lead`, `LeadSource`, `LeadStatus`, `LeadNote`, `LeadComment`, `LeadImportLog`, `LeadActivity`, `LeadAssignment`, `Pipeline`, `Stage`, `PipelineStage`, `PipelineHistory`
4. **Qualification Engine**: `LeadQualification`, `LeadQualificationHistory`, `CompanyQualificationCriteria`, `CompanyQualificationSettings`
5. **Interactions & Follow-ups**: `Followup`, `CommunicationLog`, `Course`, `Team`, `TeamMember`, `DailyBranchReport`
6. **Deals & Opportunities**: `Opportunity`, `OpportunityStage`, `OpportunityStageHistory`, `Deal`, `DealHistory`, `WinLossReason`
7. **Proposals & Revenue**: `Proposal`, `ProposalVersion`, `Customer`, `RevenueLog`
8. **KPI & Targets**: `KpiTarget`, `KpiAchievementLog`, `AnalyticsSnapshot`
9. **Notifications & Auditing**: `Notification`, `NotificationEventConfig`, `AuditLog`, `Feedback`, `BackupLog`, `RestoreLog`, `SystemHealthMetric`
10. **Reporting Engine**: `Report`, `UserFavoriteReport`, `ReportViewLog`, `ReportFilter`, `DashboardWidget`, `UserDashboardConfig`, `ExportLog`

---

## 5. Multi-Tenant Hierarchy & RBAC Scoping Engine

Access control in StackDot CRM is governed by **Role Rank Integers** (`0` to `100`). Rank determines hierarchical dominance and scoping across queries:

```mermaid
graph TD
    SA["SUPER_ADMIN (Rank 100)<br/>Global cross-company visibility"]
    CA["COMPANY_ADMIN (Rank 80)<br/>Company-wide visibility"]
    BM["BRANCH_MANAGER (Rank 60)<br/>Branch-wide visibility"]
    BDE["BDE / Team Leader (Rank 40)<br/>Assigned Sales Team visibility"]
    ISE["ISE / Sales Exec (Rank 20)<br/>Own Assigned Records only"]

    SA --> CA
    CA --> BM
    BM --> BDE
    BDE --> ISE
```

### Detailed Scoping Matrix:

| Role Name | Rank | Scope Boundary | Follow-up Permissions | Lead Permissions | Notes |
|---|---|---|---|---|---|
| **`SUPER_ADMIN`** | `100` | Entire System (Cross-Company) | Full Access (Create, Edit, Cancel, Delete) | Full Access | Platform owner account |
| **`COMPANY_ADMIN`** | `80` | Own Company (`companyId`) | Read-Only (Dashboard review) | Full Access across all branches | Tenant owner |
| **`BRANCH_MANAGER`** | `60` | Own Branch (`branchId`) | Read-Only (Branch oversight) | Full Access within branch | Branch supervisor |
| **`BDE`** (Business Dev Exec) | `40` | Assigned Team (`teamId`) | Full Access (Create, Reschedule, Complete, Cancel) | Full Access within sales team | Can lead and assign to ISEs |
| **`ISE`** (Inside Sales Exec) | `20` | Assigned Records (`assignedToId`) | Manage assigned only (No Delete) | Edit own assigned records | Frontline callers / SDRs |

### Core Backend Scope Guard (`assertFollowupScope` & `buildScopeWhere`):
Located in `crm-api/src/modules/followup/followup.repository.js` and `crm-api/src/modules/lead/lead.repository.js`:
- Ranks `80+`: `where.companyId = actor.companyId`
- Ranks `41-60`: `where.companyId = actor.companyId AND where.branchId = actor.branchId`
- Rank `40` (BDE): Dynamically fetches all team member IDs under the BDE via `findBdeTeamMemberIds(actor.id)` and sets `where.assignedToId = { in: teamMemberIds }`
- Rank `<=20` (ISE): Enforces `where.assignedToId = actor.id`

---

## 6. Core Business Modules & End-to-End Flows

### 6.1 Authentication, Tokens & Security
- **Dual-Token Architecture**:
  - **Access Token**: Short-lived (`15m`), sent via standard `Authorization: Bearer <token>` header. Contains `{ id, email, companyId, branchId, primaryRole, primaryRoleRank }`.
  - **Refresh Token**: Long-lived (`7d`), stored in an `HttpOnly`, `SameSite: Lax` secure cookie. Stored as a hashed SHA-256 record in `RefreshToken` table.
- **Token Rotation**: Each call to `/api/auth/refresh` invalidates the old refresh token and issues a brand-new token pair to prevent replay attacks.
- **Rate Limiting**: `express-rate-limit` enforces a strict 1000 requests per 15-minute window per IP address on all routes.
- **Forced Password Reset**: Users created by an admin are flagged with `mustChangePassword: true`. On first login, frontend intercepts with `<ForcedChangePasswordModal />`, barring route access until a new password satisfying length and complexity checks is provided.

---

### 6.2 Company & Branch Management
- Located in `crm-api/src/modules/company` and `crm-api/src/modules/branch`.
- Companies have isolated `CompanySettings` for timezone, currency, date formatting, and notification settings.
- Branches hold independent configuration for `autoAssignmentEnabled`, `assignmentAlgorithm` (e.g. `ROUND_ROBIN`), and `maxDailyLeadsPerUser`.

---

### 6.3 Lead Management, Qualification & Auto-Assignment Engine
- **Lead Intake**:
  - Single lead creation via UI Drawer (`POST /api/leads`).
  - Bulk lead ingestion via Excel import (`POST /api/leads/import`) with column mapping validation and import logs (`LeadImportLog`).
- **Auto-Assignment Engine (`assignmentEngine.js`)**:
  - When a lead is ingested with auto-assignment enabled:
    1. Checks branch-level algorithm (`ROUND_ROBIN` or `LEAST_LOADED`).
    2. Identifies active eligible sales reps (`status: ACTIVE`) matching the resolution level (`PERSON` vs `TEAM`).
    3. Evaluates daily capacity guard (`maxDailyLeadsPerUser`).
    4. Assigns the lead, writes a `LeadAssignment` record, logs a `LeadActivity`, and dispatches a high-priority WebSocket alert to the assigned rep.
- **Qualification Scoring Engine (`qualification.service.js`)**:
  - Leads are scored against tenant-defined criteria (`CompanyQualificationCriteria`) such as budget, authority, need, and timeline (BANT).
  - Score >= `thresholdScore` auto-flags the lead as `QUALIFIED` and unlocks 1-click Opportunity conversion.

---

### 6.4 Communication Logs & Follow-up Scheduling Engine

This is one of the most heavily used subsystems in the CRM.

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Representative
    participant UI as Communication Tab (Drawer)
    participant API as Followup Service (Backend)
    participant DB as PostgreSQL Database
    participant Cron as Reminder Cron Job (1m)
    participant WS as Socket.io Server

    Rep->>UI: Logs Call Outcome (Received / Not Received)
    UI->>API: POST /api/leads/:id/communications
    API->>DB: Saves CommunicationLog

    alt Schedules Next Action
        Rep->>UI: Submits Next Follow-up (e.g. Call Friday 4 PM)
        UI->>API: POST /api/followups
        API->>DB: Creates Followup record (status: PENDING)
        API->>WS: Emits notification:new (senderId: Rep.id)
        WS-->>UI: Socket ignores self-triggered toast; shows clean green Sonner toast
    end

    loop Every 60 seconds
        Cron->>DB: Queries PENDING follow-ups where scheduledAt <= now + 15m
        Cron->>WS: Emits notification:new (Reminder: Upcoming CALL in 15m)
        WS-->>Rep: Displays High Priority toast reminder on rep screen
    end
```

#### Key Components:
- **Unified Micro-Banner (`CommunicationsTab.jsx`)**:
  - Located at the top of the Communication tab inside the lead drawer.
  - Dynamically fetches upcoming follow-ups via `useFollowupsByLeadQuery(leadId)`.
  - **State A (Upcoming follow-up exists)**: Shows a compact banner with interaction type, date/time, and a **"Reschedule"** button opening the edit modal.
  - **State B (No upcoming follow-up)**: Shows a warning notice with a **"Schedule Follow-up"** button opening the creation modal.
  - **Zero context switching**: Reps never need to switch to the "Follow-ups" tab just to see when the lead needs to be called next.
- **Background Cron Engine (`reminderJob.js`)**:
  - Initialized on server launch (`startReminderJob()`).
  - Runs every minute:
    - Queries follow-ups due in `[now, now + 15m]` that have not received an alert.
    - Sends `FOLLOWUP_REMINDER` notifications to the assigned rep.
    - Flags follow-ups past due as `MISSED` and fires an urgent alert to the rep and supervisor.

---

### 6.5 Opportunities, Pipelines & Deal Conversions
- **Pipelines & Stage Customization (`pipeline.service.js`)**:
  - Multi-pipeline support (e.g. Standard Sales, Enterprise Training, Partner Onboarding).
  - Drag-and-drop stage reordering with customizable probabilities (`winProbability: 0-100`).
- **Opportunity Lifecycle (`opportunity.services.js`)**:
  - Tracks expected value, closing date, stage advancement history, and sales rep ownership.
  - Advancing to the final stage prompts the **Won/Lost modal**.
  - **Won**: Triggers deal creation, updates revenue logs, and creates the client account in the `Customer` table.
  - **Lost**: Requires mandatory `WinLossReason` selection for audit and conversion analytics.

---

### 6.6 Proposals, Versioning & Quotations
- Located in `crm-api/src/modules/proposal`.
- Supports multi-revision proposals (`ProposalVersion`). Reps can revise terms or discounts without losing historical quotation snapshots.
- In-browser PDF generation (`html2pdf.js`) allows 1-click client quotation downloading.

---

### 6.7 Customer Onboarding & Revenue Tracking
- Located in `crm-api/src/modules/customer` and `crm-api/src/modules/revenueReport`.
- Automatically tracks cumulative customer Lifetime Value (LTV), transaction milestones, and payments against won deals.

---

### 6.8 KPI, Targets & Performance Analytics
- Located in `crm-api/src/modules/kpi`.
- Targets can be allocated monthly or quarterly across 3 metrics: `REVENUE`, `LEADS_CONVERTED`, or `CALLS_COMPLETED`.
- When an interaction or deal satisfies a target:
  - System increments progress.
  - Fires `TARGET_ACHIEVED` celebration socket events with confettis on frontend.
  - Triggers `KPI_BELOW_TARGET` warnings when pace is behind schedule.

---

### 6.9 Real-Time Notifications & WebSocket Infrastructure
- **Connection**: Managed via `SocketProvider.jsx` connecting to backend root with JWT handshake auth.
- **Rooms**: On connection, each user joins a personal room: `user:<userId>`. Company and branch rooms (`company:<id>`, `branch:<id>`) allow broadcast scoping.
- **Central Event Dispatcher (`notification.dispatcher.js`)**:
  - Any module can trigger an alert via `dispatchNotification({ eventType, recipientIds, senderId, title, message, actionUrl })`.
  - Automatically records notifications in database for persistence.
  - Updates unread badge counts in real time.
- **Deduplication Engine (`useNotificationSocket.js`)**:
  - Prevents annoying duplicate toasts.
  - Checks `isSelfTriggered = notification.senderId === user.id`. If the user performed the action, the socket popup toast is suppressed because the local UI mutation already provides direct feedback.
  - Routine lifecycle events (`[SCHEDULED]`, `[COMPLETED]`, `[CANCELLED]`) are quietly routed to the bell icon dropdown without popping up across the screen.

---

### 6.10 Central Audit Logging System
- Located in `crm-api/src/modules/auditLog`.
- Every sensitive mutation (User deleted, Role modified, Lead reassigned, Stage updated) calls:
  ```javascript
  await recordAuditLog({
    companyId, branchId, userId: actor.id,
    action: 'UPDATE', module: 'LEAD',
    recordId: lead.id, oldValue, newValue,
    ipAddress: req.ip, userAgent: req.headers['user-agent']
  });
  ```
- Super Admins and Company Admins can search and export audit logs from `/audit`.

---

### 6.11 Reports, Analytics & Export Engine
- Located in `crm-api/src/modules/report` and `crm-web/src/features/reports`.
- Built-in report types: Lead Source ROI, Rep Conversion Velocity, Follow-up Adherence, Stage Duration, Branch Revenue.
- Exports support multi-sheet Excel (`xlsx`) and formatted PDF output via the reusable `useExport` hook.

---

## 7. Frontend Architecture & UI Design System

### Dynamic Theme Engine (Multi-Tenant Branding)
- Implemented in `crm-web/src/app/providers/ThemeProvider.jsx`.
- When an authenticated user logs in, the app loads `company.branding` (Primary Color, Secondary Color, Logo URL, Favicon URL).
- Injects dynamic CSS variables directly into `:root`:
  ```css
  --color-primary: #0059E7;
  --color-primary-hover: #0046B8;
  --color-primary-light: #EFF6FF;
  ```
- Tailwind CSS and MUI dynamically reference these CSS variables, ensuring the CRM adopts the client's corporate identity without hardcoded stylesheets.

### Modal, Drawer & Stacking Context Guidelines

> [!IMPORTANT]
> **Stacking Context Hierarchy Rules:**
> To prevent z-index collision bugs where confirmation modals render behind sidebars:
> 1. **Sidebar / Slide-over Drawers (`DynamicFormSlideover.jsx`, `Drawer.jsx`)**: Render at `z-index: 1300`.
> 2. **Confirmation Modals (`CompleteFollowupModal.jsx`, `ConfirmModal.jsx`)**: **MUST ALWAYS** be rendered via `ReactDOM.createPortal(modal, document.body)` with `z-index: 1500`.
> 3. **Notification Center (`NotificationPanel.jsx`)**: Backdrop `9990`, Panel `9991`.
> 4. **Sonner Toasts**: Float at the top layer: `z-index: 9999`.

### Toast Notification & Deduplication Rules
- **Direct User Mutations**: Always use `toast.success('Clean professional message')` inside the React Query `onSuccess` handler.
- **WebSocket Alerts**: Managed exclusively inside `useNotificationSocket.js`. Only external alerts from other users or background cron triggers fire floating toasts.

---

## 8. Local Development Setup & Seeding

Follow these steps to spin up the entire application locally on any developer machine:

### Prerequisites:
- **Node.js**: `v20.x` or `v24.x`
- **PostgreSQL**: `v14` or higher running locally (or via Docker)
- **Git**

### Step 1: Clone and Configure Environment Files

1. **Backend Environment** (`crm-api/.env`):
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/crm"
   DIRECT_URL="postgresql://postgres:your_password@localhost:5432/crm"
   JWT_ACCESS_SECRET="generate_a_random_64_char_hex_secret_here"
   JWT_REFRESH_SECRET="generate_another_random_64_char_hex_secret_here"
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   PORT=5000
   CLIENT_URL="http://localhost:5173"
   ```

2. **Frontend Environment** (`crm-web/.env`):
   ```env
   VITE_API_BASE_URL=/api
   ```

### Step 2: Initialize Database and Seed

Open a terminal in `crm-api`:
```bash
cd crm-api
npm install

# Run database migrations (NEVER use db push!)
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed baseline roles, permissions, default company & admin accounts
node prisma/seed.js

# (Optional) Seed 1-click rich demo pipeline, sample leads, and follow-ups
node prisma/seedDemoData.js

# Start backend dev server
npm run dev
```

### Step 3: Start Frontend Client

Open a second terminal in `crm-web`:
```bash
cd crm-web
npm install
npm run dev
```
Open your browser at: **`http://localhost:5173`**

---

### Default Test Accounts Reference Table:

| Role Name | Rank | Email / Username | Password | Full Name | Organization Scope |
|---|---|---|---|---|---|
| **SUPER_ADMIN** | `100` | `superadmin@gmail.com` | `superadmin123` | Super Admin | Cross-Company / Global |
| **COMPANY_ADMIN** | `80` | `admin@stackdot.in` | `password123` | Dinesh Baraiya | StackDot Company Wide |
| **BRANCH_MANAGER** | `60` | `manager@stackdot.in` | `password123` | Jeet Jagani | Headquarters Branch |
| **BDE** (Team Owner) | `40` | `bde@stackdot.in` | `password123` | Vivek Godhani | Alpha Sales Team Scope |
| **ISE** (Sales Rep) | `20` | `ise@stackdot.in` | `password123` | Pratik Vaghela | Own Assigned Leads Scope |

---

## 9. Production Deployment & DevOps Operations

### Architecture in Production:
- **Frontend**: Built to static assets (`npm run build` in `crm-web`), served via Nginx or CDN.
- **Backend**: Managed via Node process manager (PM2) or Docker container, listening on port `5000`.
- **Nginx Reverse Proxy**: Terminates SSL and routes `/api` and `/socket.io` to the Node.js process.

### Production Nginx Virtual Host Configuration:
```nginx
server {
    listen 80;
    server_name crm.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/crm.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.yourcompany.com/privkey.pem;

    # 1. Frontend static files
    root /var/www/crm/crm-web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. WebSocket Real-time Gateway (CRITICAL)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Production PM2 Ecosystem (`ecosystem.config.cjs`):
```javascript
module.exports = {
  apps: [
    {
      name: 'stackdot-crm-api',
      script: 'src/index.js',
      cwd: '/var/www/crm/crm-api',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
```

---

## 10. Critical Gotchas, Troubleshooting & Maintenance FAQ

### Q1: A developer added a field to `schema.prisma`. What is the exact deployment procedure?
**Answer**:
1. Run `npx prisma migrate dev --name add_field_name` locally.
2. Commit the new migration folder inside `crm-api/prisma/migrations/`.
3. On the production/staging server, run:
   ```bash
   git pull origin main
   npx prisma migrate deploy
   npx prisma generate
   pm2 restart stackdot-crm-api
   ```
*(Never use `prisma db push` in production).*

---

### Q2: Why is the WebSocket connection failing with 400 Bad Request on production?
**Answer**:
Nginx is missing the upgrade headers for `/socket.io/`. Ensure your Nginx configuration contains:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```
Without these, Socket.io cannot upgrade HTTP long-polling requests into full duplex WebSockets.

---

### Q3: When clicking a modal from inside a sidebar or drawer, why did it appear behind the backdrop?
**Answer**:
CSS stacking context issue. Any modal component nested inside a drawer or slide-over with `overflow: hidden` or `z-index` will be trapped in that element's stacking tree.  
**Solution**: Always wrap the modal markup in `ReactDOM.createPortal(modalElement, document.body)` and set its `z-index: 1500` (Drawers sit at `1300`).

---

### Q4: Why were two duplicate toasts showing when scheduling or completing a follow-up?
**Answer**:
One was the green UI toast from the React Query mutation, and the other was the dark in-app socket notification toast.  
**Solution**:
1. In backend `followup.service.js`, `fanOutFollowupNotification` must pass `senderId: createdById ?? null`.
2. In frontend `useNotificationSocket.js`, the listener suppresses toasts when `notification.senderId === user.id` and for routine lifecycle events (`Follow-up Scheduled`, `Follow-up Completed`, `Follow-up Cancelled`). The notification still quietly increments the topbar bell icon counter without interrupting the user.

---

### Q5: In audit logs, why was the IP address showing as `127.0.0.1` or the proxy IP instead of the client IP?
**Answer**:
In `crm-api/src/index.js`, `app.set('trust proxy', 1)` is configured. If your deployment uses multiple reverse proxies (e.g. Cloudflare + Nginx), increase the hop count (`app.set('trust proxy', 2)`) so Express inspects the true origin client IP from `X-Forwarded-For`.

---

### Q6: How do I change the default company branding, favicon, or logo?
**Answer**:
1. Brand logos are stored in `crm-web/public/logos/`:
   - `tab_logo.png` (512x512 transparent PNG)
   - `favicon.svg` (crisp vector icon)
   - `favicon.ico` (multi-resolution fallback)
2. In the database, the `Company` record has a `branding` JSON column. Modifying `primaryColor` or `logoUrl` in `Company` updates the entire application dynamically on next login via `DynamicThemeProvider`.

---

### Q7: What is the pattern for adding a brand-new module to the API?
**Answer**:
Always follow the established 5-layer Clean Architecture:
1. **Validation**: `src/modules/<name>/<name>.validation.js` (using Zod or Joi schemas)
2. **Repository**: `src/modules/<name>/<name>.repository.js` (isolated Prisma DB queries)
3. **Service**: `src/modules/<name>/<name>.service.js` (business logic, RBAC assertions, audit logging)
4. **Controller**: `src/modules/<name>/<name>.controller.js` (HTTP request parsing, `sendSuccess` calls)
5. **Routes**: `src/modules/<name>/<name>.routes.js` (mounted in `src/index.js` under `/api/<name>`)

---

*(End of Documentation — Created for StackDot CRM Project Handover)*

