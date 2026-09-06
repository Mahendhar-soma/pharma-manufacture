# Pharma Life Sciences Management ERP

Next.js 15 + TypeScript + Tailwind CSS + mysql2 application for pharmaceutical life sciences lifecycle management.

**Stack:** Next.js App Router (Server Components / Route Handlers) → mysql2/promise → Remote MySQL  
**Not used:** NestJS, Prisma, TypeORM, Sequelize, MongoDB, Firebase, Supabase

---

## 1. Project structure

```text
pharma-erp/
├── app/                    # Pages + API route handlers
├── components/             # Layout, UI, tables
├── lib/                    # db, auth, api helpers
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── setup.js
├── types/
├── hooks/
├── .env.example
├── .env.local              # local only (gitignored)
└── middleware.ts           # JWT session protection
```

---

## 2. Installation

```bash
cd pharma-erp
npm install
```

## 3. Required npm packages

- `next`, `react`, `react-dom`, `typescript`
- `tailwindcss`
- `mysql2`
- `server-only`
- `jose` (JWT session cookies)
- `lucide-react`, `date-fns`, `zod`

## 4–7. Database setup

Create `.env.local`:

```env
DATABASE_URL="mysql://inrisoft_user:inrisoft_user%40123@68.178.146.55:3306/erp"
JWT_SECRET="pharma-dev-secret-change-me"
JWT_EXPIRES_IN="1d"
```

> Password contains `@`, so it is URL-encoded as `%40` in `DATABASE_URL`.  
> Never use `NEXT_PUBLIC_DATABASE_URL`.

Apply schema + seed:

```bash
npm run db:setup
```

Or manually with MySQL client:

```bash
mysql -h 68.178.146.55 -P 3306 -u inrisoft_user -p erp < database/schema.sql
mysql -h 68.178.146.55 -P 3306 -u inrisoft_user -p erp < database/seed.sql
```

Health check after app start: `GET http://localhost:3000/api/health/db`

## 8. Start Next.js

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 9. Login credentials

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | ADMIN |
| production@example.com | prod123 | PRODUCTION |
| lab@example.com | lab123 | LAB |
| sales@example.com | sales123 | SALES |

Passwords are **plain text** for demo only.

---

## 10. Application routes

| Route | Module |
|-------|--------|
| `/login` | Authentication |
| `/dashboard` | KPI dashboard |
| `/drug-discovery` | R&D overview |
| `/drug-discovery/compounds` | Compounds |
| `/drug-discovery/experiments` | Experiments / docking |
| `/preclinical` | Preclinical studies |
| `/clinical-trials` | Clinical studies / sites / subjects |
| `/manufacturing/products` | Products |
| `/manufacturing/raw-materials` | Raw materials |
| `/manufacturing/suppliers` | Suppliers |
| `/manufacturing/warehouses` | Warehouses |
| `/manufacturing/formulas` | Formulas / recipes |
| `/purchases` | Purchase orders + GRN |
| `/inventory` | Inventory + transactions |
| `/manufacturing/production` | Manufacturing orders |
| `/manufacturing/batches` | Finished batches |
| `/manufacturing/sales` | Sales orders |
| `/manufacturing/traceability` | Forward / reverse trace |
| `/manufacturing/expiry` | Expiry dashboard |
| `/laboratory/*` | Samples, tests, results, equipment |
| `/quality/*` | SOP, deviations, CAPA, audits, change control |
| `/regulatory` | Submissions, registrations, licenses, documents |
| `/crm/*` | Doctors, hospitals, MRs, visits |
| `/reports` | Cross-module reports + CSV |

## 11. API routes (selected)

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/health/db
GET    /api/dashboard

GET|POST /api/products
GET|PUT|DELETE /api/products/:id
GET|POST /api/raw-materials
GET|POST /api/suppliers
GET|POST /api/warehouses
GET|POST /api/formulas
GET|POST /api/purchase-orders
GET|POST /api/goods-receipts
GET      /api/inventory
GET      /api/inventory/transactions
GET|POST /api/manufacturing-orders
POST     /api/manufacturing-orders/:id/start
POST     /api/manufacturing-orders/:id/complete
GET      /api/batches
GET      /api/batches/fefo
GET|POST /api/sales
GET      /api/traceability/batch/:batchNumber
GET      /api/traceability/raw-material/:batchNumber
GET      /api/expiry
POST     /api/expiry/mark-expired

GET|POST /api/samples
GET|POST /api/sample-tests
GET|POST /api/test-results
GET|POST /api/equipment
GET|POST /api/equipment/calibrations

GET|POST /api/sops
GET|POST /api/deviations
GET|POST /api/capa
GET|POST /api/audits
GET|POST /api/change-controls

GET|POST /api/research-projects
GET|POST /api/compounds
GET|POST /api/research-experiments
GET|POST /api/docking-experiments
GET|POST /api/preclinical-studies
GET|POST /api/clinical-studies

GET|POST /api/regulatory/submissions|registrations|licenses|documents
GET|POST /api/doctors|hospitals|medical-representatives|doctor-visits
GET      /api/reports/:type
GET      /api/reports/:type/export
```

---

## 12. Database tables

roles, users, research_projects, compounds, research_experiments, docking_experiments, preclinical_studies, preclinical_experiments, clinical_studies, clinical_sites, clinical_subjects, clinical_data, products, raw_materials, raw_material_batches, suppliers, warehouses, formulas, formula_items, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, inventory, inventory_transactions, manufacturing_orders, manufacturing_order_items, batches, batch_material_consumption, customers, sales_orders, sales_order_items, samples, sample_tests, test_results, laboratory_equipment, equipment_calibrations, sops, deviations, capa, audits, audit_findings, change_controls, training_records, regulatory_submissions, product_registrations, licenses, regulatory_documents, doctors, hospitals, medical_representatives, doctor_visits

## 13. Main relationships

```text
products 1—N formulas 1—N formula_items N—1 raw_materials
suppliers 1—N purchase_orders 1—N purchase_order_items
purchase_orders 1—N goods_receipts → raw_material_batches → inventory
products 1—N manufacturing_orders N—1 formulas
manufacturing_orders 1—1 batches 1—N batch_material_consumption N—1 raw_material_batches
batches 1—N sales_order_items N—1 sales_orders N—1 customers
batches 1—N samples 1—N sample_tests 1—N test_results
```

## 14. Manufacturing workflow

1. Create / activate formula for product  
2. Create manufacturing order (scales formula materials)  
3. Start MO → stock sufficiency check  
4. Complete MO (MySQL transaction):
   - FEFO consume non-expired RM batches  
   - Write consumption + inventory transactions  
   - Create finished batch (`PRODUCT-YYYYMMDD-XXX`)  
   - Expiry = mfg date + `shelf_life_months`  
   - Add FG inventory (`QC_PENDING`)

## 15. Batch traceability

**Forward:** finished batch → MO → formula → RM batches → suppliers → PO → GRN → sales  
**Reverse:** RM batch → consumed FG batches → customers / invoices  

UI: `/manufacturing/traceability`

## 16. FEFO workflow

`GET /api/batches/fefo?product_id=` or `?raw_material_id=`  
Returns earliest-expiry `RELEASED` / `AVAILABLE` non-expired batches first. Used during sales selection and manufacturing consumption.

## 17. LIMS workflow

Receive sample → assign tests → enter results (PASS/FAIL) → track equipment + calibrations → release decision feeds batch status.

## 18. Quality workflow

SOP controlled docs → deviation reporting → CAPA linkage → audits/findings → change control approvals. Records are soft-closed via status, not hard-deleted.

## 19. R&D workflow

Research projects → compounds → research / docking experiment results (RDKit / AutoDock Vina results stored as data only) → preclinical studies.

## 20. Clinical workflow

Study registration (phase) → sites → subject codes (no PII names) → visit data JSON → reporting.

---

## Printable documents (Phase 16)

Server-rendered HTML documents with **Print / Save PDF** (`window.print()`):

| Document | URL |
|----------|-----|
| Purchase Order | `/print/purchase-orders/[id]` |
| Goods Receipt (GRN) | `/print/goods-receipts/[id]` |
| Batch Manufacturing Record (BMR) | `/print/batches/[id]` |
| Certificate of Analysis (CoA) | `/print/batches/[id]/coa` |
| Sales Invoice | `/print/sales/[id]` |

Open from Purchases, Batches, or Sales tables (Print links). Print CSS hides chrome; use browser Save as PDF.

Data helpers: `lib/print-data.ts`. Shared layout: `components/print/*`, `app/print/layout.tsx`.

RBAC: print routes map to purchases / batches / sales modules.

---

## Audit trail (Phase 17)

Append-only `audit_logs` table records who changed critical records:

- Login success / failure
- PO / GRN / MO create, MO start/complete
- Batch status change & QC release
- Sales invoice create
- Inventory transfer / adjust
- Expiry job runs

API: `GET /api/audit-logs` (filters: `action`, `entity_type`, `entity_id`, `user_id`, `search`)  
UI: **Audit Trail** in sidebar → `/audit-trail`  
Access: ADMIN (full), QUALITY & REGULATORY (read). No update/delete APIs.

```bash
npm run db:migrate:phase17
```

Table is also auto-created on first audit write/list if migration was skipped. Helper: `lib/audit.ts` → `writeAudit()` (never throws into business flows).

---

## PO item-wise receiving & transaction reports (Phase 18)

- Multi-item POs with ordered qty, unit, unit cost, line total, expected delivery date
- **Partial item-wise receiving** across multiple GRN dates (never exceeds remaining ordered qty)
- PO status auto-updates: **Pending → Partially Received → Fully Received** (or Cancelled)
- Each receipt writes `PURCHASE_RECEIVED` into `inventory_transactions` with PO, PO item, lot, cost, supplier, user, remarks

Transaction report: **Transactions** (`/reports/transactions`) — filter by date range, type, material, PO, lot, supplier; type-wise summary view.

```bash
npm run db:migrate:phase18
```

Schema columns are also auto-added on first use via `ensurePurchaseTxnSchema()`.

---

## Notifications (Phase 15)

Live operational alerts (computed from MySQL, dismissible per user):

- Low stock (below reorder level)
- Expired / expiring batches (7 & 30 days)
- Overdue / due-soon CAPA
- Overdue / due-soon equipment calibrations
- Open HIGH/CRITICAL deviations
- Batches ready for QC release

APIs:

- `GET /api/notifications`
- `POST /api/notifications/dismiss` `{ key }` or `{ all: true }`

UI: header bell + `/notifications` page.

```bash
npm run db:migrate:phase15
```

---

## Scheduled expiry job (Phase 14)

Automatically marks past-due finished and raw-material batches as `EXPIRED`.

### Options

1. **In-process scheduler** (while Next.js is running)

```env
EXPIRY_JOB_ENABLED=true
EXPIRY_JOB_INTERVAL_MS=3600000
CRON_SECRET=your_cron_secret
```

Uses `instrumentation.ts` to run on an interval after server start.

2. **HTTP cron** (Task Scheduler / curl / cron)

```bash
curl -X POST http://localhost:3000/api/cron/expiry ^
  -H "x-cron-secret: your_cron_secret"
```

3. **CLI one-shot**

```bash
npm run expiry:job
```

4. **Manual from UI** — Expiry page → **Mark Expired Now** (needs expiry write: ADMIN/WAREHOUSE)

### Migration

```bash
npm run db:migrate:phase14
```

Creates `job_runs` history table. Also auto-created on first job run.

APIs: `POST /api/expiry/mark-expired`, `POST /api/cron/expiry`, `GET /api/expiry/job-status`

---

## Stock transfer & adjustments (Phase 13)

- `POST /api/inventory/transfer` — move qty between warehouses (OUT + IN `TRANSFER` transactions)
- `POST /api/inventory/adjust` — +/- qty with required reason (`ADJUSTMENT` transaction)
- `GET /api/inventory/:id` — single stock line

Rules:

- Stock cannot go negative
- Expired batches can only transfer to **REJECTED** warehouse
- Cannot increase expired stock via adjustment
- RM `available_quantity` stays synced on adjustment
- Requires **inventory write** (ADMIN / WAREHOUSE)

UI: **Inventory** → Transfer / Adjust on each stock row; filter transactions by `TRANSFER` / `ADJUSTMENT`.

---

## Batch release / QC gate (Phase 12)

Workflow:

```text
MO Complete → Batch QC_PENDING + auto LIMS sample (Assay, Dissolution)
     ↓
Enter test results (PASS/FAIL) in Laboratory
     ↓
QC READY when all tests COMPLETED, ≥1 PASS, 0 FAIL
     ↓
QUALITY/ADMIN releases batch → RELEASED
     ↓
Sales / FEFO only allow RELEASED batches
```

APIs:

- `GET /api/batches/:id/qc` — QC summary + blockers
- `POST /api/batches/:id/release` — release only if LIMS gate passes
- `PATCH /api/batches/:id` with `RELEASED` — same LIMS checks

---

## Role-based access (Phase 11)

Permissions live in `lib/permissions.ts` and are enforced in:

- **middleware** — page + API read/write checks (403 on API, redirect to dashboard on pages)
- **`lib/rbac.ts`** — server helpers (`requireModuleWrite`, batch release = QUALITY/ADMIN only)
- **Sidebar / Header** — nav filtered by role; role shown in header
- **UI** — create/start/complete/release actions hidden when role cannot write

| Role | Write access (summary) |
|------|-------------------------|
| ADMIN | Everything |
| R_AND_D | Drug discovery, preclinical |
| CLINICAL | Clinical trials |
| PRODUCTION | Products, formulas, production, batches |
| WAREHOUSE | Warehouses, RM, suppliers, purchases, inventory, expiry |
| LAB | Laboratory / LIMS |
| QUALITY | QMS + **batch RELEASED** |
| REGULATORY | Regulatory module |
| SALES | Sales, customers, CRM |
| VIEWER | Read-only everywhere |

Demo users are in `database/seed.sql` / `database/seed-rbac-users.sql`.

---

## Business rules enforced

- Stock cannot go negative  
- Expired batches cannot be consumed or sold  
- Only `RELEASED` FG batches can be sold  
- Only `ACTIVE` formulas for new MOs  
- Unique finished batch numbers  
- Every inventory change creates `inventory_transactions`  
- Critical ops use MySQL transactions  
- Transactional records use status instead of physical delete  

---

## Security notes

- MySQL access only on the Next.js server (`lib/db.ts` + `import "server-only"`)  
- Auth session in httpOnly cookie (`pharma_session`) via JWT (`jose`)  
- Database credentials never sent to the browser  
