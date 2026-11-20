# MarinaManagementOS: module plan

MarinaManagementOS is a marina management system for berth-based marinas
(first users: Westhaven, Viaduct and Silo marinas, Auckland). It covers the
work PacSoft MMS NG does today that a marina actually needs to operate, and
leaves out the rest.

How this plan was made (see [clean-room.md](clean-room.md)): from the
PacSoft database schema that our own read-only reporting SQL already uses,
from the screens and workflows staff use every day, and from our own
reporting rules. No PacSoft program code was decompiled or copied.

## Scope rule

A module is in the MVP only if the marina cannot run a normal month without
it: know who is on which berth, bill them, collect the money, and report
occupancy. Everything else is Phase 2 or out of scope.

## Modules

| # | Module | MVP? | What it does |
|---|--------|------|--------------|
| 1 | Core and admin | MVP | Marinas, piers, users, roles, settings, audit log |
| 2 | Berths (resources) | MVP | Berth register, types, dimensions, status, decommissioning |
| 3 | Customers and vessels | MVP | Customers, contacts, vessels, vessel compliance documents |
| 4 | Agreements | MVP | Licences, casual stays, berth ownership/leases, subleases |
| 5 | Bookings and availability | MVP | Availability search, booking calendar, arrivals and departures |
| 6 | Products and pricing | MVP | Product catalogue, rates, seasons, GST |
| 7 | Billing and invoicing | MVP | Billing runs, invoices, credit notes, GL export |
| 8 | Receivables | MVP | Receipts, allocation, aged trial balance, statements, debtor letters |
| 9 | Reporting | MVP | Occupancy, utilisation, berth status, compliance, ATB |
| 10 | Data migration | MVP | One-off read-only import from PacSoft |
| 11 | Customer portal | Phase 2 | Self-service invoices, payments, document upload, casual booking |
| 12 | Waitlist | Phase 2 | Berth applications, ranking, offers |
| 13 | Access control | Phase 2 | Gate cards and fobs linked to agreements |
| 14 | Accounting sync | Phase 2 | Live sync to the accounting system instead of file export |

Out of scope (not needed to operate a berth marina, or done by other
systems): fuel and retail POS, boatyard work orders and haul-out
scheduling, marketing/CRM campaigns, payroll, generic document management.

### 1. Core and admin
- Marina, Pier (PacSoft: `tmmMarina`, `mmbePier`).
- Users, roles (Admin, Berth Office, Finance, Read-only), permissions per module.
- Settings: GST rate, billing day, financial year, letter templates.
- Audit log of every change to agreements, invoices and receipts.

### 2. Berths (resources)
- Berth: name, marina, pier, type, nominal and actual length/width/depth,
  status (Active, Inactive, Decommissioned), decommissioned date
  (PacSoft: `tmmBerth`, `tmmBerthType`).
- Berth types: Marina Berth, Pile, Swing Mooring, Hardstand, Dinghy rack.
- Rule: a berth is available on a day if it is Active, not decommissioned,
  and not blocked for maintenance. That day counts as one available day.

### 3. Customers and vessels
- Customer: person or company, postal address, email, mobile, statement
  preference (PacSoft: `tmmCustomer`).
- Vessel: name, length, beam, draft, shore power need, owner customer
  (PacSoft: `tmmVessel`).
- Compliance documents with expiry: insurance policy, electrical WOF,
  tag-and-test. Expiring and expired lists feed the compliance report.

### 4. Agreements
One agreement table with a type, replacing PacSoft service headers and
lines (`ngServiceHeader`, `ngServiceDetail`).

| Type | PacSoft line type (observed) | Meaning |
|------|------------------------------|---------|
| Licence | `Resource` | A customer rents a berth (annual, monthly) |
| Casual | `Resource` (short) | Nightly or weekly visitor stay |
| Ownership | `Resource_OW` / `Resource_OLR` | Berth owned or long-leased (Panuku or private owner) |
| Sublease | `Resource_Sub` | Owner lets their berth to someone else |
| Private occupancy | `Resource_PVT` | Owner uses their own berth |
| Availability | `Resource_RMA` | Days the berth is available to rent |

- Status lifecycle: Quote, Booked, Rented (active), Completed, Cancelled.
  Only Booked and Rented hold the berth.
- Ownership records the owner and ownership category (Panuku or Private)
  with start and end dates. An ownership with no end date is current.
- Rule from our reporting: the ownership in force on the 1st of a month
  applies to that month.
- Rule: a private berth with a current ownership counts as 100% occupied.

### 5. Bookings and availability
- Availability search by date range and vessel length, beam and draft.
- Calendar grid by pier and berth.
- Arrival and departure (check-in/out) with actual dates.
- Double-booking is prevented in the database (no two holding agreements
  on one berth overlap in time).

### 6. Products and pricing
- Product (PacSoft: `tmmProduct`, `tmmProductType`): berth licence,
  casual night, power, liveaboard, admin fees.
- Rate: per metre per day/month/year or flat, by berth type and season,
  with effective dates. Prices are GST-exclusive; GST 15%.

### 7. Billing and invoicing
- Billing run: for a period, create invoice lines for every active
  agreement, prorated by days (PacSoft: `tmmTransactionHeader`,
  `tmmTransactionDetail`, `tmmTransactionType`).
- Invoice, credit note, adjustment. Invoices are never edited once posted;
  corrections are credit notes.
- GL export: a posted-transactions file by GL code and period
  (PacSoft: `tmmGLExplodedTransactionArchive`).

### 8. Receivables
- Receipts and allocation to invoices (oldest first by default).
- Aged trial balance as at any date: Current, 30, 60, 90+ days
  (PacSoft: `fnvw_TransactionDetailAsAtDateATB`).
- Statements, and debtor letters by level, following the SOP
  "Debtor Letters Processing" (PacSoft: `tmmHistory` for letters sent).

### 9. Reporting
- Occupancy: paid days (capped at available days per berth) divided by
  available days, by marina, pier, berth type, ownership. Same definition
  as the current Excel report (InvoicedUnits / RMADays).
- Utilisation: vessel length over berth length.
- Berth status today, future availability, vessel compliance, ATB.
- Every report exports to CSV and Excel.

### 10. Data migration
- Read-only extract from PacSoft (SELECT only, run by Finance/IT, never
  from this app against production), mapped by
  [pacsoft-mapping.md](pacsoft-mapping.md).
- Import is repeatable into a clean database, with a reconciliation
  report (berth count, active agreements, debtor balance by customer).

## Build order

1. Core, berths, customers and vessels (the register).
2. Agreements and availability (who is where).
3. Products, billing, receivables (money).
4. Reporting, then migration and a parallel month against PacSoft.

## Tech stack

- TypeScript throughout, npm workspaces.
- `apps/api`: Node, Express, Zod validation, Prisma on PostgreSQL.
- `apps/web`: React, Vite, Tailwind, React Router.
- `packages/domain`: pure business rules (occupancy, proration, GST,
  ageing) with unit tests, shared by API and web.
- Docker Compose for local PostgreSQL.
