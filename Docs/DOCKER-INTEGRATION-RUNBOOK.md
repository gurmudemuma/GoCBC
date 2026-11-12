# Docker integration runbook — GoCBC full licence → settlement test

Prepared 2026-11-09 ~12:41 UTC (15:41 Addis) by Muse research, branch
`fix/auth-chaincode-audit` at `d534a6b`. Do NOT run the Docker steps until
Tailscale is approved — see §0. Fix §1 first, or the integration run will
stall on-chain part-way through.

## §0 — Access status at preparation time (re-check at delivery)

- `tailscale status` → **Not connected**; approval link still
  `https://login.tailscale.com/a/1b34cd5201a43a` (same link sent 12:40 UTC).
- `coffeex.cbe.com.et` → curl 000 (timeout); `10.3.15.7` → unreachable.
- This VM cannot run the stack instead: `free -m` shows 129 MB free /
  343 MB available; compose needs orderer + 6 peers + 6 CouchDB +
  chaincode + Postgres + API (several GB).
- Local (non-Fabric) stack is still healthy: API `http://localhost:3001/health`
  → healthy, `blockchain: false`; UI `http://localhost:3000/login` → 200;
  Postgres 16 running locally; 44 migrations applied.
- Portal browser test still NOT RUN (0/7 in a browser). `apt-cache policy
  chromium` → no candidate in this VM's sources, so apt is not a route.
  Only remaining routes: retry `npx playwright install chromium` in
  `/tmp/cecbs-ui-test` (permission for that download was declined earlier —
  needs the user's say-so) or run the portals in the user's own browser.

## §1 — Fix BEFORE the Docker run: 9 chaincode functions the API calls do not exist

Re-verified just now on `d534a6b`: `grep` over `chaincodes/coffee/*.go`
returns zero hits for each name below (chaincode has 302 `CoffeeContract`
functions; the API makes 205 distinct invoke/query calls). The workflow map
(``TEST-WORKFLOW-MAP.md`` §12-I6, §5, §6.4) already flagged most of these;
this re-check confirms they are still missing after the `d534a6b` fix round.
Each will fail at endorsement (400/500), except the two SWIFT ones whose
failures are swallowed — those silently leave the ledger unchanged.

| # | Missing function | API call site (fix branch) | Args passed | Nearest existing analogue / note |
|---|---|---|---|---|
| 1 | `RejectForex` | `api/src/routes/banking.ts:686` POST `/banking/forex/:forexID/reject` | forexID, rejectionReason, user.org | `RejectLC` (`banking.go:437`) — model on it; no PG fallback, so forex rejection is impossible on-chain today |
| 2 | `ConfirmSettlement` | `api/src/routes/payments.ts:908` PUT `/payments/:paymentID/confirm` | paymentID, confirmedBy, confirmationType, remarks | No analogue; this is the settlement-confirmation step itself. `confirmationType` enum in Swagger (`BANK_VERIFICATION, NBE_APPROVAL, FOREX_REPATRIATION`) is not enforced by the validator |
| 3 | `RecordForexRepatriation` | `api/src/routes/payments.ts:1359` POST `/payments/:paymentID/forex-repatriation` | paymentID, repatriationAmount, repatriationCurrency, exchangeRate, swiftReference, nbeApprovalRef | Do NOT confuse with `RecordForexRetention` (`forex.go:655`, exists). The NBE route (`nbe.ts:114`) records repatriation in PG only, with no chaincode call at all |
| 4 | `NBEApproveSWIFTMessage` | `api/src/routes/swift.ts:611` POST `/swift/messages/:messageID/nbe-approve` | messageID, approvedBy, amlCheck, sanctionScreening, comments, timestamp | `ApproveSWIFTMessage` exists but requires `DRAFT`; the NBE step's place before/after `APPROVED` is undefined — decide the ordering when writing it, or the returned `NBE_APPROVED` status stays unpersisted |
| 5 | `AddSWIFTDocuments` | `api/src/routes/swift.ts:129` (fire-and-forget, failure swallowed) | messageID, JSON(documents) | — |
| 6 | `LinkSWIFTMessageToPayment` | `api/src/routes/swift.ts:205` (fire-and-forget, failure swallowed) | messageID, linkedPaymentId | `LinkSWIFTMessageToLC` (`swift.go:1406`, exists) — model on it |
| 7 | `RequestPhytosanitaryCertificate` | `api/src/routes/phytosanitary.ts:65` POST `/phytosanitary/request` | certificateID, shipmentID, exporterID, plantDescription, quantity, treatmentApplied | `phytosanitary.go` has issue/revoke-style functions but no request step; the whole phyto request → inspect → issue chain starts here |
| 8 | `InspectPhytosanitaryCertificate` | `api/src/routes/phytosanitary.ts:146` POST `/phytosanitary/:certificateID/inspect` | certificateID, inspectorName, inspectionDate, pestsDetected, diseaseDetected, inspectionNotes | Same file as #7; note the route checks `role !== 'ECTA'`, which rejects `ECTA_ADMIN` |
| 9 | `RecordContainerStuffing` | `api/src/routes/shipments.ts:2730` POST `/shipments/:shipmentId/container/stuff` (duplicate of S12) | shipmentId, containerNumber, containerType, stuffingDate, stuffingLocation, stuffedBy, containerCondition, sealNumber | 8 args; check whether the existing shipment/container functions already cover stuffing under another name before adding a new one |

Other known blockers on the same path (from `TEST-WORKFLOW-MAP.md` §12,
not re-verified line-by-line in this pass — treat as checklist, not new proof):
- **Settle route rejects `VERIFIED → SETTLED`** (I3): `POST /:paymentID/settle`
  validates via `statusManager`, while chaincode `SettlePayment`
  (`payment.go:690`) accepts it. Align the two tables or the settlement step
  fails at the route before reaching the ledger.
- **Wrong arity:** `ClearCustomsDeclaration` called with 7 args, chaincode
  takes 4 (`customs.go:682`); `IssueCertificate` 5 args vs 3, wrong order;
  `RejectInspection` 3 vs 2 (I4, §5.2).
- **Release re-runs settlement** (I8): `PaymentService.releasePayment`
  calls `SettlePayment` again on an already-`SETTLED` payment and the
  chaincode guard rejects it.
- Broader signal, NOT yet triaged: a mechanical cross-check of all 205 API
  invoke/query names against the 302 chaincode functions found 34 names
  with no exact match (38 call sites), including EUDR, insurance and
  consignment names. Some may be near-duplicates of existing functions
  (e.g. `IssueExportPermit` vs permit functions) — triage before counting
  them as missing. The 9 above are the verified, on-path ones.

After adding the functions: rebuild the chaincode image
(`coffee-chaincode:2.2`), re-package and re-commit as the next version /
sequence (deploy scripts were already rewritten for CCAAS in `12d5a8d`;
do not use the old golang `package-and-deploy.sh` path), then re-run the
live API checks that were blocked.

## §2 — Once Tailscale is approved: Docker host checks (in order)

The read-only host check is already prepared as
`~/workspace/GoCBC/docker-host-check.sh` (run it on the machine where the
stack is running, from the GoCBC repo root; it prints containers, committed
chaincode, Postgres tables/migrations, API/UI health, CouchDBs, and asks
for the output to be pasted back — it changes nothing). Use it instead of
re-typing the commands below; the commands are kept here only as the
reference for what it checks and what "good" looks like:

1. `tailscale status` — this VM shows as connected; `ping` the Docker host
   (ask the user for its Tailscale IP/hostname if not `coffeex.cbe.com.et` /
   `10.3.15.7` on the tailnet).
2. `docker ps` — expect orderer, 6 peers, 6 CouchDB, `coffee-chaincode`,
   `cecbs-postgres` (`postgres:15-alpine`, port 5432), `cecbs-redis`,
   `cecbs-api`.
3. Chaincode actually committed (settles the old label drift):
   `docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted
   --channelID coffeechannel --name coffee`
   and `docker inspect coffee-chaincode` for `CORE_CHAINCODE_ID_NAME`
   (expect `coffee_2.2:c748a1d9…`).
4. Postgres: `docker exec cecbs-postgres psql -U cecbs -d cecbs -c
   "select count(*) from _schema_migrations;"` — expect 44+ applied
   (44 after `d534a6b`: migrations 054 post-delivery + 055
   `blockchain_tx_id`). If the host's checkout is older than `d534a6b`,
   pull/check out `fix/auth-chaincode-audit` there first — the host must
   have the 5 API fixes, or the integration run will re-hit them.
   Note: compose's API runs `npm run dev` with `FABRIC_ENABLED=true`,
   `FABRIC_REQUIRED=false`; set a real `JWT_SECRET` (32+ chars) and
   `REDIS_PASSWORD` on the host — both are fail-fast now.
5. API health on the host: `/health` should report `blockchain: true`
   once Fabric is reachable (locally it is `false`).

## §3 — Integration run: new licence application → payment release / settlement

Use a fresh test applicant (namespace the run ID as before, e.g.
`TMW…`); keep the test users/tokens file chmod 600 and never print tokens.
Per portal, in order (26 steps, `TEST-WORKFLOW-MAP.md`):
1. Applicant submits licence application → ECTA approve (role-checked now)
   → licence PDF generated; upload registration documents
   (`POST /upload-registration`, rate-limited 10/hour/IP).
2. Contract creation (writes on-chain only — no PG row; this is why the
   local run cascaded as blocked), ECX lot, quality inspection +
   certificate, phytosanitary request → inspect → issue (#7/#8 above).
3. Export permit issue/utilise, forex request → bank/NBE approve,
   LC request → approve → issue, shipment + container stuffing (#9),
   customs submit → review → inspect → clear, border crossing,
   shipping booking / bill of lading.
4. SWIFT message create → NBE approve (#4) → documents (#5) → link to
   LC/payment (#6), payment record → verify → SWIFT → settle
   (fix the `VERIFIED → SETTLED` gate first), confirm settlement (#2),
   release payment, forex repatriation (#3) + retention, post-delivery
   checklist/issues → close contract.
5. At each step record: endpoint, role, HTTP status, chaincode tx ID,
   and the on-chain read-back (`Read…` / `GetShipmentHistory`) — a 200
   with no ledger write is a fail, per the phantom-approve lesson from
   the live test (quality/NBE forex returned 200 for non-existent records
   before `d534a6b`).
6. Documents + signatures: upload a document per step where the portal
   requires it and sign via `/blockchain-signatures` as each role; verify
   the document hash on-chain (`VerifyDocumentHash`) rather than trusting
   the upload 200.

## §4 — What this runbook does not cover

- The committed `api/.env.blockchain` files (still tracked; secrets need
  rotating — deliberately left alone in `12d5a8d`).
- The three duplicate audit tables, document ownership scoping, and the
  full RBAC audit of all mutating routes (open items from `12d5a8d`).
- The 74 Fabric-blocked checks from the live API run (run TMW977G36,
  `TEST-RESULTS.md`): those are exactly what §3 re-tests on the Docker host.
