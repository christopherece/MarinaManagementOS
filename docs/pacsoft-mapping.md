# PacSoft to MarinaManagementOS data mapping

Built from the columns our existing read-only reporting SQL reads
(occupancy, berth status, debtor letters). Use it to write the migration
extract. Confirm each mapping against a real extract before relying on it.

| PacSoft table | Columns we read | MarinaManagementOS model |
|---------------|-----------------|--------------------------|
| `tmmMarina` | `mmmaID`, `mmmaMarinaName` | `Marina` |
| `tmmBerth` | `mmbeID`, `mmbeName`, `mmbeMarinaPtr`, `mmbePier`, `mmbeTypePtr`, `mmbeNominalLength/Width/Depth`, `mmbeActualLength/Width/Depth`, `mmbeStatus`, `mmbeActive`, `mmbeDecommissionedDate` | `Pier`, `Berth` |
| `tmmBerthType` | `mmbtID`, `mmbtBerthType` | `BerthType` |
| `tmmCustomer` | `mmcuID`, `mmcuFirstName`, `mmcuSurname`, `mmcuLongName`, `mmcuAddressLine1-5`, `mmcuPostCodePtr`, `mmcuCountryCode`, `mmcuEmail`, `mmcuEmailStatement`, `mmcuMobileNo` | `Customer` |
| `tmmVessel` | `mmveID`, `mmveVesselName`, `mmveLength`, `mmveBeam`, `mmveDraft`, `mmveShorePowerReq`, `mmveInsured`, `mmveInsurer`, `mmvePolicy`, `mmvePolicyExpiryDate`, `mmveElectricalWOF*`, `mmveTagTested*` | `Vessel`, `ComplianceDocument` |
| `ngServiceHeader` | `shID`, `shCustomerID`, `shLineType` | `Agreement` (header fields) |
| `ngServiceDetail` | `sdID`, `sdServiceHeaderID`, `sdLineType`, `sdStatus`, `sdLocationType`, `sdLocationID`, `sdProductID`, `sdVesselID`, `sdStartDate`, `sdEndDate`, `sdEnteredDate`, `sdOwnershipAgreementD`, `sdOLR_OwnershipTypeD`, `sdRMA_RentalLinkID`, `sdRMA_SubLease` | `Agreement` |
| `tmmOwnershipType` | `mmotID`, `mmotDescription` | `Agreement.ownershipCategory` |
| `tmmProduct`, `tmmProductType` | product id, name, type | `Product` |
| `tmmTransactionHeader` | `mmthID`, `mmthTransactionTypePtr`, `mmthSubTypePtr` | `Invoice`, `Receipt` |
| `tmmTransactionDetail` | `mmtdID`, `mmtdTransactionHeaderPtr`, `mmtdBerthPtr`, `mmtdProductPtr`, `mmtdStartDate`, `mmtdEndDate`, `mmtdRate`, `mmtdGST`, `mmtdAllocationOnlyFlag` | `InvoiceLine`, `Allocation` |
| `tmmTransactionType` | type ids (debit, DMC, DSC) | `Invoice.kind` |
| `tmmHistory` | `mmhyReferencePtr`, `mmhyPrintedDate` | `DebtorLetter` |

## Line types and statuses (values seen in our SQL)

- `sdLineType`: `Resource` -> Licence or Casual; `Resource_OW`, `Resource_OLR`
  -> Ownership; `Resource_Sub` -> Sublease; `Resource_PVT` -> Private
  occupancy; `Resource_RMA` -> availability record (used for available days).
- `sdStatus`: `Booked`, `Rented`, `Contract Completed`, plus cancelled
  values. Only `Booked` and `Rented` hold a berth.

## Known data issues to clean on import

- Westhaven service rows duplicated from May 2026 (the reversion of private
  berths to Panuku was loaded early). Import the ownership in force on each
  date, not every row.
- Some berths have invoiced days above available days. Cap per berth per
  month in reporting; do not import as-is into billing.
