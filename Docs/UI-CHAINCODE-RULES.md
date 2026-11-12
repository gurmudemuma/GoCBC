# UI ↔ Chaincode Rules — GoCBC `coffee` chaincode v2.3

**Source:** `chaincodes/coffee/*.go`, label `coffee_2.3` (`metadata.json`). Extracted 2026-11-11 from the Go source, not from docs or the API. Status strings and function names are quoted exactly as in the chaincode.

**How to use this file:** the UI must mirror these rules — show an action button only when the current on-chain status allows it, enforce the same required fields before calling the API, and never invent a status the chaincode never assigns. Where the UI shows a status the chaincode never writes, it is flagged **UI/API-only** below.

## Global rules (apply everywhere)

- **Shared validators** (`validation.go`): `ValidateAmount` — finite, `> 0`, `<= 100000000000` (`MaxAmount`); `ValidateQuantity` — finite, `> 0`, `<= 10000000` kg (`MaxQuantity`); `ValidatePercentage` — `0–100`; `ValidateID` — non-empty, `<= 100` chars, `^[a-zA-Z0-9_-]+$`; `ValidateExchangeRate` — `> 0`, `<= 10000`; `ValidateMoistureContent` — `8.0–13.0%`; `ValidateDefectCount` — `0–100`; `ValidateCuppingScore` — `0–100` per attribute; `ValidateBIC` — 8 or 11 chars, `^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$`; `MaxStringLen = 500`.
- **MSP names:** `ECTAMSP`, `NBEMSP`, `CustomsMSP`, `ShippingMSP`, `BanksMSP`. `isBankMSP` (`banking.go:91`) = `BanksMSP`, `BankMSP`, `CommercialBankOfEthiopiaMSP`, `AwashBankMSP`, `DashenBankMSP`.
- **Warning-only ≠ enforced:** several functions only `log.Printf("WARNING: ...")` for a wrong MSP and still proceed. The UI must not treat those as enforced gates (noted per function).
- **Generic setters bypass the machines:** `UpdateLCStatus`/`UpdateLC`, `UpdatePaymentStatus`, and `UpdateShipmentStatus`/`UpdateShipmentLocation` accept any transition the relevant table allows (or, for shipments, any value in `validShipmentStatuses`) with no from-state business check. The UI must never expose these as normal workflow buttons — they are admin/reconcile overrides.
- **Chaincode has no `metadata:` tags** on structs, so `ReadForex` (and similar reads) fail if `allocatedBy`/`allocatedByMsp` are empty — i.e. for a forex not yet allocated on-chain. The UI should treat a read failure on an unallocated forex as "not allocated yet", not as a missing record.

---

## 1. Sales contract (pre-condition for almost everything)

Chaincode: `main.go` — `SalesContract.ContractStatus`. Table enforced by `validateContractStatusTransition` (`main.go:718`).

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `REGISTERED` | `RegisterSalesContract` / `RegisterSalesContractWithPaymentMethod` | none (creator recorded) |
| `REGISTERED` → `APPROVED` | `ApproveSalesContract` | `ECTAMSP` or `AdminMSP` |
| `REGISTERED` → `REJECTED` | `RejectSalesContract` | `ECTAMSP` or `AdminMSP` |
| `REJECTED` → `REGISTERED` | `ResubmitRejectedContract` | `AdminMSP`/`ECTAMSP`, else `ExporterMSP` owning the contract |
| `REGISTERED`/`APPROVED` → `CANCELLED` | `CancelContract` | `ECTAMSP` or `AdminMSP`; non-empty `reason` (≤ 500 chars). Note: no API route calls this yet — cancel is PG-only |
| `APPROVED` → `COMPLETED` | `CompleteContract` **or** `UpdateContractStatus` | `ECTAMSP` or `AdminMSP` |

- **Terminal:** `COMPLETED`, `CANCELLED` (empty allowed-list — no exit).
- **Gates:** `RegisterSalesContract` validates quantity (`> 0`, `<= 10,000,000` kg) and price/kg (`> 0`); `TotalValue = quantity × pricePerKg`; `MinimumPriceCompliant = pricePerKg >= 5.0`.
- **UI note:** completing a contract requires only `APPROVED` — chaincode does **not** check that the shipment was delivered or the payment settled. Do not show a "delivered" prerequisite in the UI unless the API adds one.

## 2. Letter of Credit (LC)

Chaincode: `banking.go` — `LetterOfCredit.Status`. Machine: `validLCTransitions` (`banking.go:734`).

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `REQUESTED` | `RequestLC` | `ECTAMSP` only |
| `REQUESTED` → `APPROVED` | `ApproveLC` | `isBankMSP` |
| `REQUESTED` → `REJECTED` | `RejectLC` | `BanksMSP` only (stricter than `isBankMSP`) |
| `APPROVED` → `ISSUED` | `IssueLC` | `isBankMSP` |
| (none) → `ISSUED` | `CreateAndIssueLC` | `isBankMSP` (no contract/existence/duplicate checks!) |
| `ISSUED` → `AMENDED` | `AmendLC` | `isBankMSP` |
| `ISSUED`/`FOREX_ALLOCATED` → `UTILIZED` | `ExamineLCDocuments` | **none** — only if `compliant == "true"` (exact string) |
| `UTILIZED` → `PAYMENT_RELEASED` | `ReleaseLCPayment` | **none** |
| `ISSUED`/`FOREX_ALLOCATED`/`UTILIZED`/`AMENDED` → `EXPIRED` | `RejectLCDocuments` | explicit 5-bank list |
| any → any (if in table) | `UpdateLCStatus` | `BanksMSP` or `NBEMSP` |
| any → any (if in table) | `UpdateLC` | **none** (any MSP; overwrites all fields) |
| any → (record deleted) | `DeleteLC` | `BanksMSP`, `ECTAMSP`, or `NBEMSP` |

Full table (`validLCTransitions`): `REQUESTED` → `APPROVED`, `REJECTED`; `APPROVED` → `ISSUED`, `EXPIRED`; `ISSUED` → `FOREX_ALLOCATED`, `UTILIZED`, `AMENDED`, `EXPIRED`; `FOREX_ALLOCATED` → `UTILIZED`, `EXPIRED`; `AMENDED` → `ISSUED`, `FOREX_ALLOCATED`, `UTILIZED`, `EXPIRED`; `UTILIZED` → `PAYMENT_RELEASED`, `EXPIRED`; `PAYMENT_RELEASED` → `SETTLED`.

- **`FOREX_ALLOCATED` is written by `AllocateForex` (`forex.go:617`), not by any LC function. `SETTLED` is written by `SettlePayment` (`payment.go:818`), only when the LC is `PAYMENT_RELEASED`.**
- **Terminal:** `REJECTED`, `EXPIRED`, `SETTLED`.
- **Gates:** `RequestLC` — contract must be `APPROVED`; exporter licence must be `ACTIVE`; amount `> 0`, `<= contract.TotalValue` (auto-mapped from contract when `0` or `1`); currency must match contract currency (3 uppercase letters); issuing ≠ advising bank. `RejectLC`/`RejectLCDocuments` — reason 10–500 chars. `AmendLC` — only from `ISSUED` (an `AMENDED` LC must return to `ISSUED` via the generic setter before it can be amended again); new amount only `> 0` if supplied; new expiry strict `YYYY-MM-DD`. `ReleaseLCPayment` — `paymentAmount <= lc.Amount`; creates payment `PAY_<lcID>` with status `VERIFIED` (fails if it exists). **Nothing auto-expires an LC** — `EXPIRED` is only written explicitly.
- **Not LC statuses (UI must not show):** `SHIPPED` (explicitly removed in `LinkShipmentToLC`), `DOCUMENTS_SUBMITTED` (`SubmitLCDocuments` leaves status `ISSUED`), `DELETED` (audit-log only; the record is `DelState`d). `LinkShipmentToLC` requires LC `FOREX_ALLOCATED` or `ISSUED`; `SubmitLCDocuments` requires `ISSUED` or `FOREX_ALLOCATED`; both leave status unchanged.
- Sub-enums: `NegotiationStatus` — `NOT_STARTED`, `UNDER_NEGOTIATION`, `ACCEPTED`, `REJECTED`; `LCDiscrepancy.Status` — `OPEN`, `RESOLVED`, `WAIVED`, `REJECTED` (`ReportLCDiscrepancy` requires LC `ISSUED`/`FOREX_ALLOCATED`/`UTILIZED`/`AMENDED`, `isBankMSP`; resolve/waive require discrepancy `OPEN`).

## 3. Forex allocation

Chaincode: `forex.go` — `ForexAllocation.Status` (`REQUESTED`, `CONFIRMED`, `ALLOCATED`, `UTILIZED`, `REJECTED`; `APPROVED`/`EXPIRED` are legacy values, never assigned).

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `REQUESTED` | `RequestForex` | `ECTAMSP` or `isBankMSP` |
| `REQUESTED` → `CONFIRMED` | `ConfirmForex` | `NBEMSP` only |
| `REQUESTED`/`CONFIRMED` → `REJECTED` | `RejectForex` | `isBankMSP` |
| `REQUESTED`/`APPROVED`/`CONFIRMED` → `ALLOCATED` | `AllocateForex` | `NBEMSP` or `isBankMSP` |
| `ALLOCATED` → `UTILIZED` | `UtilizeForex` | `NBEMSP` or `isBankMSP` |
| `ALLOCATED` → `UTILIZED` | `VerifyForexUtilization` | `NBEMSP` only |
| (status unchanged) | `RecordForexRetention` | `NBEMSP` or `isBankMSP` — see §4 |
| (no status change) | `ApprovePaymentSettlement` | `NBEMSP` only; payment must be `SWIFT_RECEIVED` |

- **Terminal:** `REJECTED`, `UTILIZED` (no function moves out of either; no cancel/expire function exists).
- **Gates:** `RequestForex` — contract must be `APPROVED`, exporter/currency must match contract, amount `> 0` and `<= contract.TotalValue`. `ConfirmForex` — `officer` non-empty. `RejectForex` — reason 10–500 chars; impossible once `ALLOCATED` ("funds are committed"). `AllocateForex` — `officer` and `approvalRef` non-empty; amount `> 0`, `<= RequestedAmount` and `<= LC amount`; **submitted exchange rate must equal the active NBE mid-rate within `0.0001`**; **submitted retention rate must equal the active `COFFEE` policy rate within `0.0001`**; an active `COFFEE` retention policy and an active exchange rate are both mandatory; LC must exist and be `ISSUED` (or legacy `FOREX_REQUESTED`), same contract/exporter/currency as the forex; on success the forex stores the **ledger** mid-rate (submitted rate discarded) and the LC flips to `FOREX_ALLOCATED`. `UtilizeForex` — amount `> 0`, `<= AllocatedAmount`. `VerifyForexUtilization` — linked payment must be `SETTLED` (amount mismatch is only a `DISCREPANCY` comment, not an error).
- **Exchange rates** (`ExchangeRate.Status`: `ACTIVE`, `SUPERSEDED`; `INACTIVE` never assigned): `SetExchangeRate` — `NBEMSP` only; `buyingRate > 0`, `sellingRate > 0`, `sellingRate >= buyingRate`; `midRate = (buying + selling) / 2`; every prior `ACTIVE` rate for that currency becomes `SUPERSEDED`. `GetCurrentExchangeRate` picks latest `EffectiveDate`, tie-break highest `RateID`; errors `no active rate found for currency: %s`.

## 4. Retention (policy + record)

Chaincode: `forex.go` — `RetentionPolicy.Status` (`ACTIVE`, `INACTIVE`); `ForexAllocation.RetentionStatus` (`PENDING`, `COMPLIED`, `NON_COMPLIANT`).

- **There is no hardcoded 40%/60% in the chaincode.** The retention rate is whatever NBE sets via `SetRetentionPolicy`; the code's own comments cite `NBE FXD/01/2024: 100%` as the default. `surrenderRate = 100 - retentionRate` (`forex.go:1308`). The UI must read the active policy, never hardcode 40.
- `SetRetentionPolicy` — `NBEMSP` only; rate `0–100`; new policy → `ACTIVE`, every prior `ACTIVE` policy for that commodity → `INACTIVE`. `GetCurrentRetentionPolicy` picks latest `EffectiveDate`, tie-break highest `PolicyID`; errors `no active retention policy found for: %s`.
- `RecordForexRetention` (the chaincode name — **not** `RecordRetention`): forex must be `ALLOCATED` or `UTILIZED`; `fcyAccountNumber` non-empty; percentage `0–100`; **idempotency:** rejected if `RetentionStatus == "COMPLIED"` (`compliant retention has already been recorded`); re-recording over `PENDING`/`NON_COMPLIANT` is allowed. Result: `RetentionAmountUSD = AllocatedAmount × percentage / 100`; `RetentionStatus = COMPLIED` iff `|policy.RetentionRate − percentage| <= 0.0001`, else `NON_COMPLIANT`; if no policy exists it stays `PENDING`. `Status` itself never changes.
- **Terminal (recording):** `RetentionStatus = COMPLIED` cannot be re-recorded.

## 5. Repatriation (export proceeds)

Chaincode: `repatriation.go` — `ExportProceedsRepatriation.Status`: `PENDING`, `PARTIAL`, `READY_FOR_VERIFICATION`, `COMPLIED`, `NON_COMPLIANT`, `OVERDUE`, `WAIVED` (enforced by `isRepatriationStatus`).

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `PENDING` | `InitiateRepatriation` | `isBankMSP` only (despite the comment, NBE is rejected) |
| `PENDING`/`PARTIAL` → `PARTIAL` or `READY_FOR_VERIFICATION` | `RecordRepatriation` | `isBankMSP` only |
| `READY_FOR_VERIFICATION`/`OVERDUE` → `COMPLIED` or `NON_COMPLIANT` | `VerifyRepatriation` | `NBEMSP` only |
| `NON_COMPLIANT`/`OVERDUE` → `NON_COMPLIANT` | `ApplyNonCompliancePenalty` | `NBEMSP` only |
| (no change; sets `WaiverRequested`) | `RequestWaiver` | `ECTAMSP` only |
| any (if waiver requested) → `WAIVED` (if approved) | `ApproveWaiver` | `NBEMSP` only |

- **Terminal for recording:** `COMPLIED`, `NON_COMPLIANT`, `WAIVED` (guard in `RecordRepatriation`). `OVERDUE` is **derived, not stored**: `updateRepatriationDeadline` flips `PENDING`/`PARTIAL`/`READY_FOR_VERIFICATION` to `OVERDUE` on read/write once past the deadline; `COMPLIED`/`WAIVED` are exempt.
- **Gates:** `InitiateRepatriation` — payment must be `SETTLED` and match contract/exporter/currency; one repatriation per payment; export amount `> 0`, `<= payment.Amount`; shipment must exist and match; shipment date must equal the ledger date (`DepartureFromAddis` or `BillOfLadingDate`, `YYYY-MM-DD`) and not be in the future; active `COFFEE` policy mandatory, retention + surrender must total 100 (±`0.0001`); deadline = shipment date + **120 days**; `requiredRetention = exportAmount × retention%`, `requiredConversion = exportAmount × surrender%`. `RecordRepatriation` — amounts non-negative, at least one positive; cumulative repatriated `<= RequiredRetention + 0.0001`, cumulative converted `<= RequiredConversion + 0.0001`, total `<= ExportAmount + 0.0001`; submitted exchange rate must equal the active mid-rate (±`0.0001`); SWIFT reference + bank certificate required; `READY_FOR_VERIFICATION` only when both required amounts are met. `VerifyRepatriation` — `verificationRef` non-empty; an `OVERDUE` record that meets the amounts still verifies to `NON_COMPLIANT` (deadline missed). `ApproveWaiver` — `approved` must be exactly `"true"`/`"false"`.

## 6. ECX lot

Chaincode: `ecx.go` — `ECXLot.Status`: `WAREHOUSED`, `GRADED`, `ASSIGNED`, `RELEASED`, `REJECTED`.

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `WAREHOUSED` | `RegisterECXLot` (there is **no** `CreateECXLot`) | none (registrar recorded) |
| `WAREHOUSED` → `GRADED` | `GradeECXLot` (moisture `<= 12.0`) | none |
| `WAREHOUSED` → `REJECTED` | `GradeECXLot` (moisture `> 12.0`) — succeeds, sets `REJECTED` + reason, does **not** error | none |
| `WAREHOUSED` → `REJECTED` | `RejectECXLot` (non-moisture causes) | none; `rejectionReason` required |
| `GRADED` → `ASSIGNED` | `AssignECXLot` | none |
| `ASSIGNED` → `RELEASED` | `ReleaseECXLot` | none |
| `ASSIGNED` → `RELEASED` | `ReleaseECXLotForShipment` | none; shipment must be `CUSTOMS_CLEARED` |

- **Terminal:** `REJECTED` (no re-entry/re-grade path) and `RELEASED`.
- **Numeric rules:** moisture `> 12.0` → `REJECTED` (`Moisture content %.1f%% exceeds 12%% export limit`); `12.0` itself passes. `AssignECXLot` — price `>= $5.00/kg` (`price $%.2f/kg is below NBE minimum of $5.00/kg`); contract must exist on-chain. `RegisterECXLot` — quantity must parse as float; `bags` defaults to `int(quantity/60) + 1` when `0`. **No function in `ecx.go`/`quality.go`/`inspection.go` checks any MSP** — ECX role enforcement lives in the API routes, not the chaincode.
- **UI note:** the grade dialog must not block moisture `> 12%` client-side — the chaincode accepts it and returns a `REJECTED` outcome. Show the rejection reason in lot detail.

## 7. Shipment

Chaincode: `main.go` — `CoffeeShipment.Status`. Closed set `validShipmentStatuses` (`main.go:2088`): `CREATED`, `FREIGHT_BOOKED`, `PERMIT_ISSUED`, `CUSTOMS_DECLARED`, `CUSTOMS_CLEARED`, `CUSTOMS_REJECTED`, `INSPECTION_PENDING`, `LAND_TRANSPORT`, `PORT_ARRIVED`, `CONTAINER_STUFFED`, `VESSEL_LOADED`, `DEPARTED`, `IN_TRANSIT`, `DESTINATION_ARRIVED`, `DELIVERED`, `LOADED`, `CANCELLED`, `ARRIVED`. (`LandTransportStatus` is a separate field: `NOT_STARTED`, `IN_TRANSIT`, `ARRIVED`.)

Canonical chain (each step's guard verified):

| From → To | Function | Gate |
|---|---|---|
| (none) → `CREATED` | `CreateShipment` (`main.go:1760`) | LC for the contract must be `FOREX_ALLOCATED`, `UTILIZED`, or `PAYMENT_RELEASED` (first LC found only); contract must exist; exporter/buyer/origin/grade/icoNumber non-empty; quantity `> 0`; valueUSD `> 0`. No MSP check. Auto-maps empty/`AUTO`/`0`/`1` fields from contract/forex (forex rate fallback `120.0`). Side effect: auto-creates a `QualityInspection` `PENDING` under `INSPECTION_<shipmentID>`. |
| `CREATED` → `PERMIT_ISSUED` | `IssueCBEExportPermit` cascade (`permit.go:228`) | **CREATED-only** — later statuses are skipped, never regressed |
| any → `INSPECTION_PENDING` | `RequestInspection` (`quality.go:103`) | **no from-state gate** (best-effort; failure only logged) |
| `PERMIT_ISSUED` → `CUSTOMS_DECLARED` | `SubmitCustomsDeclaration` cascade (`customs.go:351`) | shipment must be `PERMIT_ISSUED` (re-submit while `CUSTOMS_DECLARED` allowed) |
| → `CUSTOMS_CLEARED` | `ClearDeclaration` / `ClearCustomsDeclaration` cascade | declaration must be `UNDER_REVIEW` (see §10) |
| → `CUSTOMS_REJECTED` | `RejectDeclaration` / `RejectCustomsDeclaration` cascade | declaration not `CLEARED` (see §10) |
| → `FREIGHT_BOOKED` | **no chaincode function** — set from the API via generic `UpdateShipmentStatus` (`api/src/routes/shipments.ts`) | no gate at all |
| `CUSTOMS_CLEARED` → `LAND_TRANSPORT` | `StartLandTransport` | strictly `CUSTOMS_CLEARED`; sets `LandTransportStatus = IN_TRANSIT`, `DepartureFromAddis` |
| `LAND_TRANSPORT` → `PORT_ARRIVED` | `ArriveAtPort` | sets `LandTransportStatus = ARRIVED`, `ArrivalAtDjibouti` |
| `PORT_ARRIVED` → `CONTAINER_STUFFED` | `StuffContainer` | defaults port `Djibouti`, vessel `Maersk Eindhoven`, voyage `V<year>W<nn>`, B/L `BL<unix>` if empty |
| `CONTAINER_STUFFED` → `VESSEL_LOADED` | `LoadOnVessel` (alias `RecordVesselLoading`) | — |
| `VESSEL_LOADED` → `DEPARTED` | `DepartFromPort` (alias `RecordVesselDeparture`) | — |
| `DEPARTED` → `IN_TRANSIT` | `UpdateToInTransit` | — |
| `IN_TRANSIT` → `DESTINATION_ARRIVED` | `ArriveAtDestination` (alias `RecordDestinationArrival`) | — |
| `DESTINATION_ARRIVED` → `DELIVERED` | `CompleteDelivery` | sets `ActualArrival` |
| `IN_TRANSIT` → `DELIVERED` | `ConfirmDelivery` (alternate delivery path) | — |

- **Shortcuts / loopholes the UI must not present as normal flow:** `PickupShipment` accepts `CUSTOMS_CLEARED` **or** `PERMIT_ISSUED` → `IN_TRANSIT` (skips customs clearance; its error text omits the `PERMIT_ISSUED` alternative). `RecordBillOfLading` / `RecordAirwayBill` / `RecordShippingDetails` set `LOADED` from **any** status. `UpdateShipmentStatus` / `UpdateShipmentLocation` move any valid status → any valid status with no from-state guard and no MSP check.
- **No terminal state is enforced for shipments:** `DELIVERED` can be moved away by the generic setters; `CANCELLED` exists in the valid set but no chaincode function ever assigns it.
- **No MSP check** on `CreateShipment` or any transport lifecycle function (`StartLandTransport` … `CompleteDelivery`, `PickupShipment`, `ConfirmDelivery`) — any org identity can invoke them; enforcement is API-only.
- **Rejection map** (`RecordShipmentActionRejection`, `main.go:2179`, `ShippingMSP` only, audit/event only — changes no status): `START_LAND_TRANSPORT` expects `CUSTOMS_CLEARED`; `RECORD_PORT_ARRIVAL` → `LAND_TRANSPORT`; `CONTAINER_STUFFING` → `PORT_ARRIVED`; `VESSEL_LOADING` → `CONTAINER_STUFFED`; `VESSEL_DEPARTURE` → `VESSEL_LOADED`; `IN_TRANSIT_UPDATE` → `DEPARTED`; `DESTINATION_ARRIVAL` → `IN_TRANSIT`; `DELIVERY_COMPLETE` → `DESTINATION_ARRIVED`.
- **UI ordering consequence:** freight booking mirrors `FREIGHT_BOOKED` onto the shipment, which breaks both the `PERMIT_ISSUED` gate (customs submit) and the `CUSTOMS_CLEARED` gate (`StartLandTransport`). The UI must therefore offer booking only after delivery (or at least after customs clearance), and issue the permit while the shipment is still `CREATED`.

## 8. Quality inspection (ECTA)

Chaincode: `quality.go` — `QualityInspection.Status`: `PENDING`, `INSPECTED`, `APPROVED`, `REJECTED` (`REWORK` appears only in the struct comment, never assigned).

| From → To | Function | Gate |
|---|---|---|
| (none) → `PENDING` | `RequestInspection` | `inspectionID` validated; contract/exporter IDs validated if non-empty; shipment optional — missing shipment only logs `creating inspection without shipment linkage` and the inspection is still created; if the shipment exists it is moved to `INSPECTION_PENDING` (best-effort) |
| `PENDING` → `INSPECTED` | `PerformInspection` | sample size `> 0` (`ValidateQuantity`); moisture `8.0–13.0%` (`ValidateMoistureContent`); defects `0–100`; each of 10 cupping scores `0–100` (despite struct comments saying `/10`); inspector name non-empty (≤ 500 chars) |
| `INSPECTED` → `APPROVED` | `ApproveQualityInspection` | — |
| `INSPECTED` → `REJECTED` | `RejectQualityInspection` | no empty-check on `reason` |

- **Terminal:** `APPROVED`, `REJECTED`.
- **Derived grades** (`quality.go:528`): `TotalScore` = sum of the 10 cupping attributes. Grade 1: defects `0–3`, cupping `>= 80`, moisture `<= 12`; Grade 2: defects `4–12`, cupping `>= 80`, moisture `<= 12`; Grade 3: defects `13–25`, cupping `75–80`, moisture `<= 12`; Grade 4: defects `26–45`, cupping `70–75`, moisture `<= 13`; Grade 5: defects `46–100`, cupping `60–70`, moisture `<= 13`; moisture `> 13` → Grade 9. (Grades 6–8 need defects 101–300, unreachable through `PerformInspection` because defects are capped at 100.) Cupping grade: total `>= 90` `Specialty (90+)`; `>= 85` `Premium (85-89)`; `>= 80` `Q-Grade (80-84)`; `>= 75` `Exchange Grade (75-79)`; else `Below Standard (<75)`.
- **No `CollectSample`, `RecordLabResults`, or `CompleteInspection` function exists** in the chaincode — lab results exist only as the comment-only `LaboratoryTestResults` struct (moisture max 12.5%, water activity max 0.70, ochratoxin max 5 ppb, aflatoxin max 10 ppb — unenforced). Any sample/lab UI steps are API/PG-only.
- **No MSP check** in `quality.go` (identity only recorded).

## 9. Pre-shipment inspection

Chaincode: `inspection.go` — `PreShipmentInspection.Status` (ledger key `PREINSPECTION_`): `REQUESTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `APPROVED`, `REJECTED` (`IN_PROGRESS` appears only in the comment, never assigned).

| From → To | Function | Gate |
|---|---|---|
| (none) → `REQUESTED` | `RequestPreShipmentInspection` | only `ValidateID(inspectionID)` + `contractQuantity` must parse; **no duplicate check** (re-request silently overwrites); no shipment/contract check |
| `REQUESTED` → `SCHEDULED` | `ScheduleInspection` | no validation of date/name/licence strings |
| any → `COMPLETED` | `RecordInspectionResults` | **no prior-status guard** — can regress `APPROVED`/`REJECTED` back to `COMPLETED`; bad numbers silently become `0` |
| (no change) | `IssueCertificate` | **no prior-status guard**; sets certificate number, issued date, expiry = +90 days |
| `COMPLETED` → `APPROVED` | `ApproveInspection` | — |
| `COMPLETED` → `REJECTED` | `RejectInspection` | sets `ReInspectionRequired = true`; no empty-check on reason |

- **Derived acceptability** (`inspection.go:300`): `QuantityVariance = inspected − contract`; `QuantityAcceptable = variance >= -5.0` (5 kg shortfall tolerance; any surplus passes); `QualityAcceptable = (actualGrade == contractGrade) && cuppingScore >= 80.0`; `PackagingAcceptable = NEW / GOOD / ACCEPTABLE` (`POOR` fails). Every outcome sets `COMPLETED`; only `ReInspectionRequired` differs (`true` unless `PASS`/`CONDITIONAL_PASS`).
- **Terminal (intended):** `APPROVED`, `REJECTED` — but the `RecordInspectionResults` loophole above can reopen them. The UI must disable re-recording results on an `APPROVED`/`REJECTED` inspection.
- **No MSP check** in `inspection.go`.

## 10. Customs declaration

Chaincode: `customs.go` — `CustomsDeclaration.Status`: `SUBMITTED`, `UNDER_INSPECTION`, `UNDER_REVIEW`, `CLEARED`, `HELD`, `REJECTED` (`HELD` appears only in the comment, never assigned).

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `SUBMITTED` | `SubmitDeclaration` (legacy, no shipment) | none; quantity `> 0`, total value `> 0`, currency 3-letter if given; LC and forex must exist |
| (none) → `SUBMITTED` | `SubmitCustomsDeclaration` | none enforced; shipment must be `PERMIT_ISSUED` (or already `CUSTOMS_DECLARED`); **no quantity/value/LC/forex validation** (parse-only); cascades shipment → `CUSTOMS_DECLARED` |
| `SUBMITTED` → `UNDER_INSPECTION` | `ReviewDeclaration` / `ReviewCustomsDeclaration` | none / warning-only for non-`CustomsMSP` |
| `UNDER_INSPECTION` → `UNDER_REVIEW` | `CompleteInspection` / `CompleteCustomsInspection` | none / warning-only for non-`CustomsMSP` |
| `UNDER_REVIEW` → `CLEARED` | `ClearDeclaration` | none; `clearanceNumber` required; duties `>= 0`; cascades shipment → `CUSTOMS_CLEARED` |
| `UNDER_REVIEW` → `CLEARED` | `ClearCustomsDeclaration` | **`CustomsMSP` only** (`only Customs can clear declarations`); no duties `< 0` check here |
| any except `CLEARED` → `REJECTED` | `RejectDeclaration` / `RejectCustomsDeclaration` | **`CustomsMSP` only**; cascades shipment → `CUSTOMS_REJECTED` |

- **Terminal:** `CLEARED` (reject explicitly blocked: `cannot reject cleared declaration`) and `REJECTED`.
- **No duty/tariff calculation in chaincode.** `DutyAssessment` is a passive struct (`CustomsDuty`/`VAT`/`ExciseTax`/`OtherCharges`/`TotalDue`, all ETB, comments say usually 0 for coffee exports). Duty/VAT are computed by the API (`api/src/routes/customs.ts`) against Postgres tariff tables — the UI must get them from the API, not from chaincode. Sub-enums (comment-only): `ASYCUDAStatus` — `PENDING`, `REGISTERED`, `CLEARED`; `RiskProfile` — `LOW`, `MEDIUM`, `HIGH`; `InspectionType` — `DOCUMENTARY`, `PHYSICAL`, `BOTH`, `NONE`; `DutyAssessment.PaymentStatus` — `UNPAID`, `PAID`, `WAIVED` (never set in chaincode).
- **Twin-function asymmetry:** `ClearDeclaration` has no MSP check while `ClearCustomsDeclaration` requires `CustomsMSP`; `SubmitCustomsDeclaration` validates far less than `SubmitDeclaration`. The UI should call the stricter twin and show the same `CustomsMSP`-only restriction for both.

## 11. Export permit

Chaincode: `permit.go` — `ExportPermit.Status`: `ISSUED`, `UTILIZED`, `EXPIRED`, `CANCELLED`, `SETTLED` (`EXPIRED`/`CANCELLED` appear only in the comment, never assigned).

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `ISSUED` | `IssueCBEExportPermit` | `BanksMSP` only |
| `ISSUED` → `UTILIZED` | `UtilizeExportPermit` | `BanksMSP` or `CustomsMSP` |
| `UTILIZED` → `SETTLED` | `SettleExportPermit` | `BanksMSP` only |

- **Terminal:** `SETTLED`. Expiry never sets a status — it only blocks `UtilizeExportPermit` (`permit has expired on %s`).
- **Gates:** `IssueCBEExportPermit` — amount `> 0`; `paymentMethod` ∈ `LC`, `CAD`, `ADVANCE`, `CONSIGNMENT`; exporter licence `ACTIVE`; contract (if given) must be `APPROVED`; for `LC` with an LC id, LC must be `ISSUED` or `APPROVED`. Expiry = end of current month. Cascade: every `CREATED` shipment under the contract → `PERMIT_ISSUED` (later statuses skipped). `SettleExportPermit` — `repatriatedAmount` parsed, no positivity check; sets `Outstanding = false`; amount mismatch only writes a `Remarks` note. `GetOutstandingPermitAmount` sums only `outstanding == true` **and** `PaymentMethod == "CAD"`.
- **CAD approval levels** (`permit.go:97`): amount `<= 100,000` → `STANDARD`; `<= 500,000` → `BRANCH_MANAGER` (caller cert `role` attribute `BRANCH_MANAGER` or `MANAGER`); `> 500,000` → `NBE` (attribute `NBE_OFFICER`); `totalExposure (outstanding CAD permits + new amount) > 500,000` without `NBE` level → rejected. LC/`ADVANCE`/`CONSIGNMENT` always `STANDARD`.
- **Related (separate entities, same permit object):** consignment — `IssueConsignmentPermit` (`BanksMSP` only; commodity ∈ `FRUITS`, `FLOWERS`, `MEAT`; amount `> 0`; licence `ACTIVE`) creates an `ExportPermit` `ISSUED`/`CONSIGNMENT`; consignment status `PERMIT_ISSUED` → `SHIPPED` (`RecordConsignmentShipment`) → `PARTIAL`/`SETTLED` (`RecordPartialPayment`, settles when outstanding `<= 0.01`). Advance — `RecordAdvancePayment` (`BanksMSP` only; contract `APPROVED`, licence `ACTIVE`) → `RECEIVED`; `IssuePermitForAdvance` → `PERMIT_ISSUED`; `LinkShipmentToAdvance` → `SHIPPED`; `SettleAdvancePayment` → `SETTLED`. Both `SETTLED` states are terminal in practice.

## 12. Phytosanitary certificate

Chaincode: `phytosanitary.go` — `PhytosanitaryCertificate.Status`: `PENDING`, `INSPECTED`, `ISSUED`, `EXPIRED`, `REVOKED` (`EXPIRED` appears only in the comment, never assigned). `InspectionResult`: `PASSED`, `FAILED`.

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `PENDING` | `RequestPhytosanitaryCertificate` | **none** — no `GetMSPID` call anywhere in the file |
| `PENDING` → `INSPECTED` | `InspectPhytosanitaryCertificate` | none; inspector name non-empty; inspection date valid; pests/disease flags must be `"true"`/`"false"` strings |
| (none) → `ISSUED` | `IssuePhytosanitaryCertificate` (direct path) | none; shipment must exist |
| `INSPECTED` → `ISSUED` | `IssuePhytosanitaryCertificate` (bridge path) | none; `InspectionResult` must not be `FAILED` |
| any except `REVOKED` → `REVOKED` | `RevokePhytosanitaryCertificate` | none |

- **Terminal:** `REVOKED` (re-revoke blocked) and `ISSUED` (no outgoing transition except revoke).
- **Gates:** request — quantity must be `> 0` (`ValidateQuantity` — **the API must send a real quantity; the route default `'0'` fails here with `quantity must be positive, got: 0.00`**); shipment must exist (`ShipmentExists`) — **no shipment-status requirement at all**; defaults: plant `Coffee beans (Coffea arabica)`, treatment `Fumigation`. Inspect — `FAILED` if pests or disease detected, else `PASSED`; a `FAILED` certificate **stays `INSPECTED`** (no rejected state) and can never be issued, only revoked. Issue — certificate number `PHYTO-ET-<yyyymmdd>-<nnnnn>`; validity **14 days**; direct path defaults botanical name `Coffea arabica`, `InspectionResult = PASSED`, pests-free list `[Coffee Berry Borer, Coffee Leaf Rust, Nematodes]`.
- **UI note:** the request form must require quantity; the inspect step must show the `PASSED`/`FAILED` outcome and disable "Issue" on `FAILED`.

## 13. Payment & SWIFT

Chaincode: `payment.go` — `PaymentSettlement.Status`: `PENDING`, `DOCUMENTS_SUBMITTED`, `VERIFIED`, `SWIFT_INITIATED`, `SWIFT_RECEIVED`, `SETTLED`, `CONFIRMED`. Machine: `validateStatusTransition` (`payment.go:129`), one table per payment method.

### LC method (the implemented path)
`PENDING` → `DOCUMENTS_SUBMITTED` → `VERIFIED` → `SWIFT_INITIATED` → `SWIFT_RECEIVED` → `SETTLED` → `CONFIRMED` (and `SETTLED` → `DOCUMENTS_RELEASED`; `CONFIRMED` → `DOCUMENTS_RELEASED`). `DOCUMENTS_SUBMITTED` → `REJECTED`; `SWIFT_INITIATED` → `REJECTED`.

### Other methods (tables only — most states reachable only via generic `UpdatePaymentStatus`)
- **CAD:** `PENDING` → `GOODS_SHIPPED` → `DOCUMENTS_SENT_TO_BANK` → `DOCUMENTS_FORWARDED` → `BUYER_NOTIFIED` → `PAYMENT_RECEIVED`/`REJECTED` → `DOCUMENTS_RELEASED` → `SETTLED`.
- **TT_ADVANCE:** `PENDING` → `ADVANCE_REQUESTED` → `ADVANCE_RECEIVED` → `GOODS_SHIPPED` → `BALANCE_REQUESTED`/`SETTLED` (100% advance) → `BALANCE_RECEIVED` → `SETTLED`.
- **TT_POST:** `PENDING` → `GOODS_SHIPPED` → `DOCUMENTS_SENT_DIRECTLY` → `PAYMENT_AWAITED` → `PAYMENT_RECEIVED` → `SETTLED`.
- **ADVANCE:** `PENDING` → `PROFORMA_ISSUED` → `ADVANCE_RECEIVED` → `CONTRACT_REGISTERED` → `COFFEE_SOURCING` → `QUALITY_INSPECTION` → `GOODS_SHIPPED` → `BALANCE_REQUESTED`/`SETTLED` → `BALANCE_RECEIVED` → `SETTLED`.

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `PENDING` | `InitiatePayment` (there is **no** `CreatePayment`) | none; method ∈ `LC`, `CAD`, `TT_ADVANCE`, `TT_POST`, `ADVANCE`; amount `> 0`; currency 3-letter; receiving bank + BIC + beneficiary account non-empty; LC method requires LC `ISSUED`, `FOREX_ALLOCATED`, or `UTILIZED` |
| `PENDING` → `DOCUMENTS_SUBMITTED` | `SubmitPaymentDocuments` | none; no check that `documents` is non-empty |
| `DOCUMENTS_SUBMITTED` → `VERIFIED` | `VerifyPaymentDocuments` | warning-only for non-`BanksMSP` |
| `VERIFIED` **or** `DOCUMENTS_SUBMITTED` → `SWIFT_INITIATED` | `InitiateSWIFTTransfer` | none; sets embedded SWIFT leg `SENT` |
| `SWIFT_INITIATED` → `SWIFT_RECEIVED` | `ConfirmSWIFTReceipt` (there is **no** `ConfirmSWIFTTransfer`) | none; sets SWIFT leg `RECEIVED` |
| `VERIFIED` **or** `SWIFT_RECEIVED` → `SETTLED` | `SettlePayment` | **`BanksMSP` only**; `payingBank`, valid BIC, `swiftReference` required; `nbeApprovalRef` not validated |
| `SETTLED` → `CONFIRMED` | `ConfirmSettlement` | `NBE_APPROVAL` type requires `NBEMSP`; other types require a bank MSP; `confirmationType` ∈ `BANK_VERIFICATION`, `NBE_APPROVAL`, `FOREX_REPATRIATION` |
| (no status change) | `RecordForexRepatriation` | `NBEMSP` only; payment must be `SETTLED` or `CONFIRMED`; amount `> 0`; currency + exchange rate validated |
| (no status change) | `RejectSWIFTPayment` | none; only sets SWIFT leg `REJECTED`; blocked if payment `SETTLED`/`CONFIRMED`/`DOCUMENTS_RELEASED` or leg already `SETTLED`/`REJECTED` |
| (no status change — sets `DocumentsHeldBy = RELEASED` only) | `ReleaseDocumentsToBuyer` | method `CAD`/`LC`; status `PAYMENT_RECEIVED` (CAD), `SETTLED`, `CONFIRMED`, or `VERIFIED` (LC) |
| `PENDING`/`ADVANCE_REQUESTED`/`PROFORMA_ISSUED` → `ADVANCE_RECEIVED` | `ReceiveAdvancePayment` | method `ADVANCE`/`TT_ADVANCE`; `0 < advancePercentage <= 100`; retention hard-coded `100.0` (so converted amount is 0) |
| `ADVANCE_RECEIVED` → `BALANCE_RECEIVED` | `ReceiveBalancePayment` | `PaymentStage` must be `ADVANCE` |
| any → any (if in method table) | `UpdatePaymentStatus` | none — **the only way to reach `REJECTED`, `DOCUMENTS_RELEASED`, `GOODS_SHIPPED`, `ADVANCE_REQUESTED`, `PROFORMA_ISSUED`, `BALANCE_REQUESTED`, `PAYMENT_RECEIVED`** |

- **SWIFT is optional on a payment:** `InitiateSWIFTTransfer` accepts `DOCUMENTS_SUBMITTED` (pre-verification) and `SettlePayment` accepts `VERIFIED` without any SWIFT leg. The UI must not force the SWIFT steps before settle.
- **Settle math** (`payment.go:771`): `RetainedAmount = Amount × (retentionRate/100)`; `ConvertedAmount = Amount − RetainedAmount`; `AmountBirr = ConvertedAmount × exchangeRate`. Rate/retention default from the forex allocation when `0`/unparseable, else fallbacks `exchangeRate = 120.0`, `retentionRate = 100.0` (`NBE FXD/01/2024`). LC cascade: LC moves to `SETTLED` only if it is `PAYMENT_RELEASED`.
- **Terminal:** `REJECTED` (all methods), `DOCUMENTS_RELEASED` (LC), `SETTLED` (CAD/TT/ADVANCE — LC `SETTLED` → `CONFIRMED`/`DOCUMENTS_RELEASED`).
- **Embedded SWIFT leg** (`PaymentSettlement.SWIFTDetails.Status`): `PENDING`, `SENT`, `IN_TRANSIT`, `RECEIVED`, `SETTLED`, `REJECTED`.
- **SWIFT messages** (`swift.go`, `SWIFTMessageEnhanced.Status`): `DRAFT` → `APPROVED` (`ApproveSWIFTMessage`; also `NBE_APPROVED` → `APPROVED`) → `SENT` (`SendSWIFTMessage`) → `RECEIVED` (`ReceiveSWIFTMessage`; also from `IN_TRANSIT`, which nothing ever sets) → `PROCESSING` (`ProcessSWIFTMessage`) → `SETTLED` (`SettleSWIFTMessage`); `DRAFT` → `NBE_APPROVED` (`NBEApproveSWIFTMessage`, `NBEMSP` only, AML + sanctions screening must each be `PASS`/`FAIL`, either `FAIL` blocks); any non-terminal → `REJECTED` (`RejectSWIFTMessage`). Terminal: `SETTLED`, `REJECTED`, `CANCELLED`, `FAILED` (`PENDING_APPROVAL`, `CANCELLED`, `FAILED`, `IN_TRANSIT` are declared but never assigned). Create functions (all → `DRAFT`, no MSP gate): `CreateSWIFTMessage`, `CreateMT700_IssueLC`, `CreateMT707_AmendLC`, `CreateMT103_Payment`, `CreateMT750_Discrepancy`, `CreateMT752_AuthPayment`; message types `MT103`, `MT202`, `MT300`, `MT700`, `MT701`, `MT707`, `MT710`, `MT730`, `MT740`, `MT750`, `MT752`, `MT754`, `MT756`, `MT400`, `MT910`, `MT940`, `MT999`; SWIFT reference ≤ 16 alphanumeric; charge codes `OUR`, `SHA`, `BEN`; `MaxRetries: 3`. `UpdateSWIFTMessageField` is `DRAFT`-only.
- **Documentary collection (CAD)** (`DocumentaryCollection.Status`, `collection.go:32`): `SENT` → `FORWARDED`/`PRESENTED`/`REJECTED`; `FORWARDED` → `PRESENTED`/`REJECTED`; `PRESENTED` → `ACCEPTED`/`PAID`/`REJECTED`; `ACCEPTED` → `PAID`/`REJECTED` (`UpdateCADStatus`; `PAID` terminal). `RegisterDocumentaryCollection` → `SENT` (term `SIGHT` or `ACCEPTANCE`; `ACCEPTANCE` needs `acceptanceDays > 0`). `RecordCADPayment` — `PRESENTED`/`ACCEPTED` → `PAID`, **`BanksMSP` only**; `amountReceived` is parsed but never stored or compared to the collection amount.

## 14. Border crossing

Chaincode: `bordercrossing.go` — `BorderCrossing.Status`: `PENDING`, `CLEARED_EXIT`, `IN_TRANSIT`, `CROSSED`, `ARRIVED`, `CLEARED`, `DETAINED`, `INSPECTED`, `INSPECTION_FAILED`. `ComplianceStatus`: `COMPLIANT`, `NON_COMPLIANT`, `UNDER_REVIEW`.

| From → To | Function | MSP gate |
|---|---|---|
| (none) → `PENDING` | `InitiateBorderCrossing` | none; no shipment/contract check |
| `PENDING` → `CLEARED_EXIT` | `ClearForExit` | `CustomsMSP` only |
| `PENDING`/`CLEARED_EXIT` → `IN_TRANSIT` | `RecordDeparture` | none (exit clearance is optional) |
| `IN_TRANSIT` → `CROSSED` | `RecordBorderCrossing` | none; `TransitDuration` = whole days |
| `PENDING`/`INSPECTION_FAILED` → `INSPECTED` (passed) or `INSPECTION_FAILED` | `RecordBorderInspection` | none; sets `ComplianceStatus` `COMPLIANT`/`NON_COMPLIANT` |
| `PENDING`/`INSPECTED`/`INSPECTION_FAILED` → `DETAINED` | `DetainBorderCrossing` | none; sets `ComplianceStatus = UNDER_REVIEW` |
| `CROSSED` → `ARRIVED` | `RecordArrival` | none |
| `CROSSED`/`ARRIVED`/`INSPECTED` → `CLEARED` | `ClearBorderCrossing` | none; sets `ComplianceStatus = COMPLIANT` |
| (ComplianceStatus only) | `VerifyCompliance` | none; cannot verify `COMPLIANT` if `DETAINED` or `INSPECTION_FAILED` |

- **No exit from `DETAINED`.** `CLEARED` and `ARRIVED` have no outgoing transition.
- **Border crossings are not gated on shipment status** — no function checks the shipment, and no shipment function touches a `BorderCrossing`. The UI must not imply a shipment-status prerequisite here. `UpdateLocation` and `ReportDelay` change no status.

## 15. Post-delivery / contract close

- **There is no `CloseContract`, `PostDelivery*`, or `RecordDelivery` function in the chaincode.** The close flow lives in the API (`api/src/services/postDeliveryWorkflowService.ts`, `api/src/routes/postDeliveryWorkflow.ts`) and calls chaincode `UpdateContractStatus(contractID, "COMPLETED")` (`main.go:947`, `ECTAMSP`/`AdminMSP` only). The alternative `CompleteContract` (`main.go:1112`) does the same `APPROVED` → `COMPLETED` move; no API route calls it yet.
- Delivery confirmation on-chain is `ConfirmDelivery` (`IN_TRANSIT` → `DELIVERED`) or `CompleteDelivery` (`DESTINATION_ARRIVED` → `DELIVERED`) — see §7.
- **UI note:** the close button must be enabled only on an `APPROVED` contract (the only chaincode gate). Do not show shipment-delivered or payment-settled prerequisites as chaincode rules — if the API enforces them, label them API rules.

## 16. Certificate of origin

- **No certificate-of-origin function, struct, or status exists anywhere in `chaincodes/coffee/*.go`** (zero hits for `CertificateOfOrigin`/`OriginCertificate`/`COO_`). Issuance, status, and verification are API/PG-only (`api/src/routes/certificates.ts`). The UI cannot mirror a chaincode rule here because there is none — any COO status shown is an API-defined status, and the UI must label it as such.

## 17. Exporter licence (referenced by many gates above)

Chaincode: `main.go` — `Exporter.LicenseStatus`: `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED`. `UpdateExporterStatus` allows only `ACTIVE`/`EXPIRED` and refuses changes on a `REVOKED` licence; `SuspendExporter` → `SUSPENDED`; `RevokeExporterLicense` → `REVOKED`; `RenewExporterLicense` → `ACTIVE`. New exporters register `ACTIVE`. Gates that require `ACTIVE`: `RequestLC`, `IssueCBEExportPermit`, `IssueConsignmentPermit`, `RecordAdvancePayment`.

---

## Cross-entity order the UI must enforce (chaincode gates, in workflow order)

1. Contract `REGISTERED` → `APPROVED` (ECTA) — required before LC request, forex request, permit, advance payment.
2. LC `REQUESTED` → `APPROVED` → `ISSUED` (Banks) — required before permit (LC method) and payment initiation.
3. Forex `REQUESTED` → `CONFIRMED` (NBE) → `ALLOCATED` (NBE/Banks, rate + retention must match active NBE values ±`0.0001`) — LC flips to `FOREX_ALLOCATED`.
4. Shipment `CREATED` (requires LC `FOREX_ALLOCATED`/`UTILIZED`/`PAYMENT_RELEASED`) → permit while `CREATED` → `PERMIT_ISSUED` → customs submit → `CUSTOMS_DECLARED` → review → `UNDER_INSPECTION` → `UNDER_REVIEW` → clear → `CUSTOMS_CLEARED`.
5. Freight booking (`FREIGHT_BOOKED`) is API-only — offer it only after customs clearance/delivery, never before the permit/customs steps, or the shipment status will break their gates.
6. Land transport `CUSTOMS_CLEARED` → `LAND_TRANSPORT` → `PORT_ARRIVED` → `CONTAINER_STUFFED` → `VESSEL_LOADED` → `DEPARTED` → `IN_TRANSIT` → `DESTINATION_ARRIVED` → `DELIVERED`.
7. Payment (LC): documents → `DOCUMENTS_SUBMITTED` → verify → `VERIFIED` → (optional SWIFT) → settle (`BanksMSP` only) → `SETTLED` → confirm → `CONFIRMED`; LC `PAYMENT_RELEASED` → `SETTLED` on settle.
8. Retention record on `ALLOCATED`/`UTILIZED` forex (once `COMPLIED`, cannot re-record); repatriation after `SETTLED` payment, deadline shipment + 120 days.
9. Contract close: `APPROVED` → `COMPLETED` via `UpdateContractStatus` (API post-delivery flow).

## Known chaincode gaps the UI must work around (do not "fix" by inventing statuses)

- Statuses declared in struct comments but **never assigned**: LC `DOCUMENTS_SUBMITTED`/`SHIPPED`; forex `APPROVED`/`EXPIRED` (legacy); quality `REWORK`; pre-shipment `IN_PROGRESS`; customs `HELD`; permit `EXPIRED`/`CANCELLED`; phyto `EXPIRED`; SWIFT `PENDING_APPROVAL`/`CANCELLED`/`FAILED`/`IN_TRANSIT`; CAD `UNPAID`/`RETURNED`; exchange-rate `INACTIVE`; forex `SanctionScreeningStatus` values.
- `RecordInspectionResults` / `IssueCertificate` (pre-shipment) and the generic setters have no from-state guard — the UI must disable those actions on `APPROVED`/`REJECTED`/`DELIVERED` records itself.
- `CreateAndIssueLC`, `UpdateLC`, `UpdatePaymentStatus`, `UpdateShipmentStatus` accept weak/unchecked input — the UI must validate before calling (amount, currency, IDs) and must not expose them as ordinary workflow actions.
- `VerifyPaymentDocuments` and customs review/inspection are warning-only for wrong MSPs; `ExamineLCDocuments`, `ReleaseLCPayment`, `CreateShipment`, and all transport lifecycle functions have no MSP check at all — role enforcement for those is API-only.
- `PickupShipment` can skip customs clearance (`PERMIT_ISSUED` → `IN_TRANSIT`); the UI should route transport through `StartLandTransport`, not pickup, for the normal flow.
- Retention 40% is a **policy value, not a chaincode constant** — the UI must fetch `GET /forex/retention-policy/coffee` (active policy) and use its rate.
