# MarinaManagementOS: module plan

MarinaManagementOS is a marina management system for berth-based marinas
(first users: Westhaven, Viaduct and Silo marinas, Auckland). It covers the
work PacSoft MMS NG does today that a marina actually needs to operate, and
leaves out the rest.

How this plan was made (see [clean-room.md](clean-room.md)): from a study of
the PacSoft MMS NG 7.20.6 dev install (screen and table names, import
templates; see [pacsoft-study.md](pacsoft-study.md)), from the PacSoft schema
our own read-only reporting SQL already uses, and from our own reporting
rules. No PacSoft program code was decompiled or copied.

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
| 10 | Data migration and imports | MVP | One-off import from PacSoft; CSV imports for receipts, charges, readings |
| 15 | Utilities (power, water) | MVP | Meters per berth, readings import, usage invoicing |
| 11 | Customer portal | Phase 2 | Self-service invoices, payments, document upload, casual booking |
| 12 | Waitlist | Phase 2 | Berth applications, ranking, offers |
| 13 | Access control | Phase 2 | Gate cards and fobs linked to agreements |
| 14 | Accounting sync | Phase 2 | Live sync to Xero instead of file export |
| 16 | Card payments and direct debit | Phase 2 | Hosted card payments (Windcave), direct debit runs |
| 17 | Visual marina map | Phase 2 | Berth map coloured by status |
| 18 | Rental pool | Phase 2 | Private owners pool berths for re-letting, revenue shared |

Out of scope (PacSoft has these, but a berth marina does not need them to
operate, or other systems do them): POS and fuel sales, stock and
purchasing, boatyard jobs, haul-out and timesheets, asset maintenance,
memberships, marketing notes, Quick Query (replaced by reports with export).

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
- Berth sale/transfer: end one ownership and start the next on the same
  day, carrying any sublease over or ending it.
- Renewal: roll a licence to a new term at the new rate.

### 5. Bookings and availability
- Availability search by date range and vessel length, beam and draft.
- Calendar grid by pier and berth.
- Check-in, check-out and berth moves (vessel moves to another berth:
  end one agreement, start another, prorate both).
- Double-booking is prevented in the database (no two holding agreements
  on one berth overlap in time).

### 6. Products and pricing
- Product (PacSoft: `tmmProduct`, `tmmProductType`): berth licence,
  casual night, power, liveaboard, admin fees.
- Rate: per metre per day/month/year or flat, by berth type and season,
  with effective dates. Prices are GST-exclusive; GST 15%.
- Annual price review: apply a % increase to all rates or to selected
  agreements from a date (PacSoft "update contract new rate").
- Discount codes and credit terms per customer.

### 7. Billing and invoicing
- Billing run: for a period, create invoice lines for every active
  agreement, prorated by days (PacSoft: `tmmTransactionHeader`,
  `tmmTransactionDetail`, `tmmTransactionType`).
- Invoice schedules: monthly, quarterly, annual in advance, or seasonal.
- Owner annual charges: owners of private berths are billed an annual
  charge made of components (maintenance, insurance, rates).
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
- Operational reports kept from PacSoft's Rental menu: sites available
  for rent, expiring occupiers and agreements, owner occupiers, private
  renters, arrivals/departures and transfers, dock walk, liveaboard,
  non-standard rates/discounts.
- Finance reports kept: aged balance (summary/detail), statements,
  transaction history, unallocated credits, GL invoices/receipts/journal,
  unposted GL, invoiced in advance, sales by product and by site.
- Every report exports to CSV and Excel.

### 15. Utilities
- Meter per berth or pedestal, meter type (power, water), unit rate.
- Readings import (columns: Meter, ReadingDate, ReadingTime, UnitsUsed,
  CurrentReading), usage = this reading minus last, billed to whoever
  holds the berth on the reading date.
- Live pedestal integrations (Rolec, PULS) are Phase 2.

### 10. Data migration
- Read-only extract from PacSoft (SELECT only, run by Finance/IT, never
  from this app against production), mapped by
  [pacsoft-mapping.md](pacsoft-mapping.md).
- Import is repeatable into a clean database, with a reconciliation
  report (berth count, active agreements, debtor balance by customer).

## Build order

1. Core, berths, customers and vessels (the register).
2. Agreements, availability, check-in/out and moves (who is where).
3. Products, billing, annual charges, utilities, receivables (money).
4. Reporting, then migration and a parallel month against PacSoft.

## Tech stack

- TypeScript throughout, npm workspaces.
- `apps/api`: Node, Express, Zod validation, Prisma on PostgreSQL.
- `apps/web`: React, Vite, Tailwind, React Router.
- `packages/domain`: pure business rules (occupancy, proration, GST,
  ageing) with unit tests, shared by API and web.
- Docker Compose for local PostgreSQL.
