# PacSoft MMS NG 7.20.6: what it contains

Study of the dev copy at `C:\Program Files\PacsoftMMS_Portable` on Chris's dev
PC, 21 Nov 2026. Sources, all read-only:

- The install folder: file names, `Version.xml`, the bundled README and the
  five Excel import templates.
- .NET metadata names only (screen class names and typed-dataset table
  names) from `PacsoftMMS NG.exe` and `PacsoftMMS NG Business Solutions.dll`.
  No method bodies were decompiled or copied.
- Our own reporting SQL against WHProd/VSProd.

- The running app's menus (21 Nov 2026, menus only, nothing saved). No
  database queries were run.

## Menu map of the running app

Boatyard, POS and Asset Management are greyed out (not licensed or not used
at Westhaven), which matches dropping them.

- **Operations**: Home (marina map), Customers, Customer Charge, Vessels,
  Vessel Charge, Lock Workstation, Send Message, Reports (Product Listing),
  Database Management, Employee/Change Password, Record Filter.
- **Accounting**: Account Management, Transaction Entry, Import Charges;
  Processing (Batch Processing, GL Processing, Import/Export Processing,
  Receipt Reconciliation, Product Sales Per Month, Auto Allocation, Auto
  Payment); Accounting Reports (Aged Balance Summary/Detailed, Statement,
  Statement Detailed, Statement Of Account, NG Statement, Transaction
  History, Transactions by Type/Customer/Product, Tax Report, Print
  Transactions, Unallocated Credits and Receipts, GL Invoices and Credits,
  GL Receipts and Refunds, GL Journal, Unposted GL Transactions, GL Future
  Income, GL Account Codes, Invoiced In Advance, Product Sales, Invoice/Credit
  Note Totals by Product, Sales Reports, Sales By Site); Prepay (Prepay By
  Customer).
- **Rental**: Wait List, Rental Bookings, Business Agreement; Vessel
  Movements (Grid, Form); Process (Rental Occupancy, Season Rental Renewal);
  Reports (Occupancy Standard, Occupancy Statistics, Sites Available For
  Rent, Expiring Occupiers, Expiring Rental Management Agreements, Owner
  Occupiers, Private Renters, Rental Arrivals & Transfers, Rental Departures
  & Transfers, Dock Walk, Vessel Movements, Liveaboard, Non-Standard
  Rates/Discounts, RMA List, RMA List By Credit Plan); Rental Pool (Pool
  Distribution, Customer Report); Site Inventory (Pier Inventory Check, Pier
  Inventory Viewer, Reports); Utilities (Meter Reading Entry, Preview
  Utility Invoicing, Auto Read Meters, Report).
- **Inventory**: Manual Stock In/Out, Internal Inventory Usage, Stock Take,
  Re-Order Report, Reports.
- **Lease/Ownership**: Lease Ownership Wizard.
- **User Reporting**: Quick Query, Smart Notes, Manage Views, Daily, Weekly,
  Monthly, Annual, Ad Hoc.
- **Administrator**: Admin Toolbar; Maintenance (Account, Vessel, Site,
  Product, Smart Note, Messaging lookups); Setup (User, Workstation, Marina,
  Invoice, Billing Agent, System, NG Usages, Parameter Setup); System
  Administration (Event Viewer, Health Check, Setup Import, System
  Processes); Discounts (Discount Codes, Discount Matrix).

The account (customer) screen's toolbar: New, Save, Account, Print, Smart
Note, Delete, Search, Transaction Entry, Marketing, CheckList, Send Message,
Customer Change.

Note: on start-up this copy showed "PacsoftMMS NG is not licensed. Please
contact Pacsoft Support", and its status bar labels MMS_WH_P as
"(Production)". Worth confirming both with Pacsoft and IT.

## Modules found, and what we do with them

"Keep" = in the MVP. "Later" = Phase 2. "Drop" = not needed to run a berth
marina, or done better elsewhere.

| PacSoft area | Evidence (screens / tables) | Decision |
|---|---|---|
| Marina setup, piers, berths ("sites") | `frmSetupMarina`, `frmSites`, `frmSiteType`, Site/Berth/Pier/BerthStatus/SiteFeature tables | Keep (module 2) |
| Customers | `frmCustomer`, `frmCustomerType`, `frmCustomerNationality`, CustomerAddress, CustomerLink, CustomerCategory | Keep (module 3) |
| Vessels | `frmVessel`, `frmVesselType`, `frmVesselModel`, `frmVesselConstruction`, `frmVesselOwnship`, VesselPolicyAdditions | Keep (module 3); construction/engine detail dropped |
| Rentals (licences, casuals) | `frmRentalBooking`, `frmRentalGrid`, `frmRentalConfirmation`, `frmRentalRenew`, `frmRentalDetailFull`, tmmRentalAgreement, tmmRentalLink, RMA | Keep (module 4) |
| Ownership and sublease | `frmRentalOwnershipDetailFull`, `frmOwnershipAgreementUpdate`, `frmOwnershipType`, `frmSublease`, `frmBerthSalesWizard`, tmmOwnershipAgreement, OWN_PVT | Keep (module 4), including berth sale/transfer |
| Owner annual charges | tmmAnnualChargePlan, tmmAnnualChargeComponent(Set/Rate), tmmOwnershipAgreementAnnualChargePlan | Keep (module 7): owners are billed annual charges |
| Check-in / check-out / moves | `frmCheckInWizard`, `frmCheckOutWizard`, `frmVesselMoveWizard`, `frmDepartDate` | Keep (module 5) |
| Wait list | tmmWaitList, RentalWaitList | Later (module 12) |
| Products, rates, tax | `frmProduct`, `frmProductType`, `frmCompositeProduct`, `frmTaxType`, ProductRate, tmmTaxTypeEffective, `frmUnit` | Keep (module 6) |
| Discounts, credit plans | `frmDiscountCode`, `frmDiscountMatrix`, `frmCreditPlan`, `frmCreditPlanMatrix`, `frmCreditTerms` | Keep discounts and credit terms; credit plans later |
| Rate increases | `frmUpdateContractNewRate`, `frmDefaultInflation` | Keep (module 6): annual price review |
| Invoicing | `frmInvoiceSelection`, `frmBatchInvoiceSelection`, `frmInvoiceSchedule(Plan)`, `frmInvoiceSeason`, `frmInvoiceToDate`, Seasonal Invoicing DLL | Keep (module 7) |
| Transactions, allocation | `frmTransactionEntry`, `frmTransactionAllocation`, `frmAutoAllocationProcess`, `frmRefund`, `frmBulkPayment`, tmmTransactionHeader/Detail | Keep (module 8) |
| Account enquiry, statements, ATB | `frmAccountEnquiry`, `frmAccountStatus`, Statement*, NG_AgedBalance, vw_TransactionOutstandingAsAtDate | Keep (module 8) |
| Debtor letters / notes | `frmSmartNote*`, `frmMailMerge`, `frmTemplate`, tmmHistory | Keep notes and letters (module 8); marketing notes dropped |
| Direct debit / auto payment | `frmAutoPaymentReview`, `frmChangeAutoPaymentMethod`, DirectDebitRegister | Later |
| Card payments | Credit Card Service, PaymentGateway, Windcave/Pyxis/MarinaPay request types, `frmCreditCardToken` | Later (use the payment provider's hosted page; never store card data) |
| Bank lodgement | `frmBankLodgementProcess`, LodgementSlip | Keep as a report |
| GL and accounting export | `frmGLCodes`, `frmGLAnalysisCode`, `frmGLPeriodDefinition`, `frmGLProcess`, GL explode tables, Xero API, Sage/NAV/iScala/Encore exports | Keep GL export file (module 7); Xero sync later |
| Prepayments | `frmPrepayCutover`, tmmCustomerPrePayHeader/Detail | Keep as customer credit balance |
| Power and water meters | `frmMeter*`, `frmMeterReadingEntry`, `frmMeterReadingInvoicing`, `frmAutoReadMeter`, Rolec Communicator, PULS meters, Utility Readings template | Keep readings import and invoicing (new module 15); live pedestal links later |
| Occupancy | `frmOccupancyProcess`, OccupancyStatsStandard, OccupancyFI, ngOccupancyMonthSummary, NG_RMA_Reports | Keep (module 9) |
| Reports | Dock walk, liveaboard, owner occupiers, private renters, expiring RMA/occupier, rental statistics, site sales, unallocated credits | Keep the operational ones (module 9) |
| Visual marina map | `frmVisualMarinaMap`, `frmSetupVMMap`, `frmVMMovingVessel`, MapSites | Later; reuse WH_Dashboard map work |
| Gate cards / security | `frmSecuritySystemArea`, `frmTransponder`, SecuritySystem, ngSecurityCardMapping; Inner Range installed on the PC | Later (module 13) |
| Customer portal, SMS | `frmCustomerPortalNotification`, `frmPortalApprovalRequest`, `frmTextMessage*` | Later (module 11) |
| Rental pool | `frmRentalPool`, `frmRentalPoolDistribution`, RentalPool* | Later: only if private owners pool berths for re-letting |
| Documents | `frmDocumentLibrary`, tmmDocumentLibrary, tmmAgreementPrintedDocument | Keep as attachments on customer/vessel/agreement |
| Users and security | `frmSetupUser`, `frmUserGroupSecurity`, `frmSecuirtyMenuControl`, tmmAuditEvent | Keep (module 1) |
| Imports | `frmExcelImport`, `frmRentalImportWizard`, `frmImportExportProcess`, 5 templates | Keep CSV imports for receipts, charges, meter readings |
| Quick Query | `frmQuickQuery*` | Drop; replaced by reports with CSV/Excel export |
| POS, stock, purchasing | `frmPOS*`, `frmProductWarehouse`, `frmManualStockInOut`, Stock*, PurchaseManagement*, `frmSupplierInvoiceEntry`, fiscal printer | Drop |
| Boatyard / jobs / haul-out | `frmJobManagement`, `frmJobType`, `frmServiceEntry`, `frmTaskView`, Haulout, timesheets | Drop for now (Phase 3 if a yard is added) |
| Asset maintenance | `frmAssetManagement`, `frmAssetMaintenance` | Drop |
| Memberships | `frmMembershipType`, `frmMembershipStatus` | Drop (club feature) |

## Import template columns (observable file layouts)

| Template | Columns |
|---|---|
| Rental import | MarinaID, FamilyName, Name, CustomerID, VesselID, SiteName, InvoicePeriod, Product, SurchargeProductName, StartDate, DepartureDate, PeriodOverRideRate, CutOverDate |
| Receipt import | Transaction Type, Marina ID, Customer ID, Account Code, Receipt Date, Receipt Amount, Tender Type, Description |
| Customer charges | CustomerID, AccountCode, SecurityTagNo, FamilyName, Name, Date, ProductName, InvoiceNotes, TotalAmount, Quantity, Rate |
| Vessel charges | Date, VesselName, VesselID, SecurityTagNo, ProductName, InvoiceNotes, Quantity, Rate, TotalAmount |
| Utility readings | Meter, ReadingDate, ReadingTime, UnitsUsed, CurrentReading |

Our importers accept the same columns, so staff can reuse existing sheets.
