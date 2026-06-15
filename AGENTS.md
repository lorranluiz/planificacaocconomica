# AGENTS.md - PlanEcon

## Architecture

Two independent servers must both be running:

| Server | Directory | Port | Command |
|--------|-----------|------|---------|
| Node.js (factory map) | `factorsMap/` | 3000 | `node server.js` from `factorsMap/` |
| Java Spring Boot | `src/` (mvn) | 8080 HTTP / 8443 HTTPS | `./mvnw spring-boot:run` |

The root `server.js` is a **legacy** production Node server (ports 80/443) — ignore it during development.

## Start / Stop

```bash
./start-all-servers.sh   # starts both + optional DB restore prompt (uses `./mvnw spring-boot:run`)
./stop-all-servers.sh    # kills both
./quick-start.sh         # starts both using prebuilt JAR (no recompile)
./quick-restart.sh       # recompiles Java changes only (~2-5s), DevTools restarts the server
./start-dev.sh           # Spring Boot with DevTools hot reload, foreground
./restart-java-server.sh # kill Java, restart from JAR
```

DevTools is active: Java changes trigger automatic restart; HTML/CSS/JS changes just need a browser refresh.

## Build

```bash
./build.sh               # installs system deps + npm install + runs build.js (JS obfuscation)
./mvnw compile           # compile Java only (fast)
./mvnw package           # full build → JAR in target/
npm install              # Node.js dependencies (factorsMap has its own package.json)
```

## Database

- **PostgreSQL** database `planecon` on `localhost:5432`
- Credentials: `postgres` / `planecon123` (see `application.properties`)
- **Flyway** migrations in `src/main/resources/db/migration/` — `spring.flyway.baseline-version=5`
- Key migrations: V18 (`co2_emission_factor`, `co2_emission_limit`, `co2_allocated`, `co2_shadow_price`), V19 (`co2_scale_factor`)
- Test dump: `planecon_test_db.dump` — restore with `./restore-test-db.sh`, update with `./update-test-db.sh`
- When changing DB schema: update migration file → regenerate `schema.sql` → update dump
- The `./start-all-servers.sh` script prompts to restore the test DB if it's empty

## Frontend

- Static HTML/JS/CSS served from `src/main/resources/static/`
- Key pages: `popularcouncil.html`, `committee.html`, `worker.html`, `login.html`, `index.html`, `plannercouncil.html`
- JS files in `public/js/` are **obfuscated** into `public/js_obfuscated/` by `build.js` during install
- The `public/` directory is a **symlink** (gitignored) to `src/main/resources/static/`

## Java

- **Spring Boot 3.2.5**, Java 17, group: `xyz.planecon`, main class: `xyz.planecon.Application`
- Lombok is used (excluded from JAR)
- HTTPS via self-signed PKCS12 keystore at `src/main/resources/keystore/planecon.p12`
- Dependencies: ojAlgo 55.0.0 (LP solver), Apache Commons Math3 (legacy), Flyway, Jackson Hibernate6, Caffeine, Ehcache

## Key conventions

- `data/` and `factorsMap/data/` are gitignored
- JS obfuscation runs on `npm install` via `postinstall` script in root `package.json`
- JS uses `var` (legacy compatibility)
- Modals need explicit CSS: `#id { display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,.5); }` + `#id .modal-content { opacity:1; transform:translateY(0); transition:none; }`
- `escapeHtml()` and `getOrderStatusBadge()` must be defined in each JS file that uses them
- Bulk updates use `@Modifying(flushAutomatically=true, clearAutomatically=true)` with native SQL
- `flyway.validate-on-migrate=false` (temporary, dev convenience)
- Instance hierarchy: `popular_council_associated_with_committee_or_worker` (committee/worker → council) and `popular_council_associated_with_popular_council` (council → parent council)
- `filterIndividualProjectsSync()` removes individual PROJECT materializations (except ID 17) from arrays before save

## Related docs

- `README.md` / `README_PT.md` — project intro and features
- `QUICKSTART.md` — startup guide including AI-oriented instructions
- `ROADMAP.md` — development roadmap
- `CHANGELOG.md` — version history
- `schema.sql` — current DB schema (structure only)
- `HIERARQUIA_CONSELHOS.md`, `MELHORIAS_COMMITTEE_PAGE.md`, `IMPLEMENTACAO_AUTO_CONSELHO_POPULAR.md`, `ORIENTACOES_ECONOMIA_REAL.md` — Portuguese design/feature docs

---

## System Knowledge (Updated June 2026)

### Core Entities

| Entity | Table | Key Fields |
|--------|-------|------------|
| `Instance` | `instance` | Polymorphic: WORKER, COMMITTEE, POPULARCOUNCIL, PLANNERCOUNCIL, DISTCOMMITTEE, SERVICECOMMITTEE. Has `co2_emission_limit` (PLANNERCOUNCIL only), `tax_rate`, `balance`, `total_social_production_capacity` |
| `SocialMaterialization` | `social_materialization` | Products/services/projects. Types: `PRODUCT`, `SERVICE`, `PROJECT`. Has `co2_emission_factor` (kg CO₂ / standard unit), `standard_quantity_per_unit`, `measurementUnit`, `validity_deadline` |
| `TechnologicalTensor` | `technological_tensor` | IO matrix: `(instance_id, input_mat_id, output_mat_id, coefficient, supplier_instance_id)` |
| `DemandVector` | `demand_vector` | Final demand: `(instance_id, mat_id, demand)` |
| `SupplyOrder` | `supply_order` | Orders between committees/councils: `(ordering_instance_id, input_mat_id, supplier_instance_id, quantity, order_status)` |
| `CouncilTransaction` | `council_transaction` | Financial ledger: `(council_id, amount, transaction_type, balance_after)` |
| `ProjectBid` | `project_bid` | Auction bids: `(supply_order_id, committee_id, bid_hours)` |
| `WorkersProposal` | `workers_proposal` | Worker proposals with 3 tiers (proposal, planning, planified) |
| `OptimizationInputsResults` | `optimization_inputs_results` | Optimization per product: `(instance_id, mat_id, production_goal, workers_needed, co2_allocated, co2_shadow_price, co2_scale_factor, total_materialization_capacity, etc.)` |

### LP-IO Model

The LP-IO model combines **IO** (Leontief Input-Output) with **LP** (Kantorovich Linear Programming). Throughout the codebase, "LP-IO" refers to the combined model.

**Formulation:**
```
min  Z = Σ(t_i · x_i)                     minimize total socially necessary labor time
s.t. x_i - Σ(a_ij · x_j) >= y_i  ∀i      IO intersectoral balance
     Σ(e_i · x_i) <= E_max                LP: CO₂ emission constraint (optional)
     x_i >= 0                     ∀i      non-negativity
```
Variables: `x_i` = production quantity, `t_i` = labor time per unit, `a_ij` = IO technical coefficient, `y_i` = final demand, `e_i` = CO₂ emission factor (kg/unit), `E_max` = CO₂ cap.

**Execution flow in `PlanificationService.planify()`:**

| Step | Condition | Action |
|------|-----------|--------|
| 1 | `co2EmissionLimit > 0` | Solve LP via ojAlgo `ExpressionsBasedModel` |
| 2a | LP OPTIMAL | Use LP production vector |
| 2b | LP INFEASIBLE (numerical) | Compute pure IO solution `x = (I-A)⁻¹y`, check CO₂ |
| 3a | IO CO₂ ≤ limit | Use IO solution (CO₂ satisfied) |
| 3b | IO CO₂ > limit | **LP-IO with Relaxed Demand**: proportional scaling `x' = x × E_max / CO2_IO`, all products reduced uniformly preserving the IO structure — no product reaches zero |

**CO₂ Data Model:**

| Table | Column | Purpose |
|-------|--------|---------|
| `social_materialization` | `co2_emission_factor` | kg CO₂ per standard unit (editable by planner) |
| `instance` | `co2_emission_limit` | Total CO₂ cap for jurisdiction (PLANNERCOUNCIL only) |
| `optimization_inputs_results` | `co2_allocated` | CO₂ quota allocated to this product (persisted at planification) |
| `optimization_inputs_results` | `co2_shadow_price` | Dual value: hours/kg CO₂ (marginal cost of emission reduction) |
| `optimization_inputs_results` | `co2_scale_factor` | Reduction factor when LP-IO with Relaxed Demand runs (< 1.0 = reduced) |

### LP-IO Files

**Backend:**

| File | Role |
|------|------|
| `LinearProgrammingService.java` | `solve()`: LP with ojAlgo. `solveWithSlack()`: proportional scaling fallback (returns `SlackLPSolution`) |
| `PlanificationService.java:planify()` | Orchestrates LP → IO check → LP-IO with Relaxed Demand |
| `MatrixOperations.java` | Pure IO: `x = (I-A)⁻¹y` via Gaussian elimination |
| `OptimizationService.java` | Per-product: workers, factories, time from production vector |

**DTOs:**

| Field | DTO | Purpose |
|-------|-----|---------|
| `emissionFactors[]`, `co2EmissionLimit` | `PlanificationRequest` | Sent by planner frontend |
| `totalCo2Emissions`, `co2Limit`, `co2ConstraintBinding`, `optimizationFallbackReason` | `PlanificationResponse` | Top-level CO₂ result |
| `co2EmissionFactor`, `co2Allocated`, `co2ShadowPrice` | `OptimizationResult` (inner) | Per-product CO₂ |
| `originalDemand`, `adjustedDemand`, `originalProductionNeeded`, `adjustedProductionNeeded` | `OptimizationResult` (inner) | Set when LP-IO with Relaxed Demand runs |

**Frontend — Planner Council (`plannercouncil.js`):**

| Function | Role |
|----------|------|
| `performPlanification()` | Sends `emissionFactors[]` and `co2EmissionLimit`; shows warning if constraint binding or LP-IO with Relaxed Demand used |
| `saveChanges()` | Recalculates `co2Allocated` from current `emissionFactors[pid]` before persisting; saves emission factors via `PUT /api/social-materializations/{id}/emission-factor` |
| `saveCo2Limit()` | Persists CO₂ cap via `PUT /api/council/{id}/co2-limit` |
| `renderDemandVector()` | Renders editable CO₂ emission factor column ("Emissão de CO₂ (kg/unid.)") in demand vector table |
| `renderProductionVector()` | When LP-IO with Relaxed Demand runs: 7-column table (Demanda Original, Produção Original, Demanda Ajustada ▼%, Produção Ajustada ▼%, CO₂ Alocado, Ações) |
| `openOptimizationResultModal()` | Shows CO₂ and original/adjusted values per product |

**Frontend — Committee (`committee.js`):**

| Function | Role |
|----------|------|
| `displayOptimizationResults()` | "Da Materialização Social" tab: standard optimization + CO₂ section (allocated, shadow price, per-committee quota) |
| `displayUnitPlanData()` | "Dessa Unidade Produtiva" tab: see section below |
| `fetchLocalProductionPhysical()` | Sums accepted orders, computes physical quantity and CO₂, updates utilization status |

### Committee: Aba "Dessa Unidade Produtiva"

Displayed in the "Resultados da Otimização" modal when a committee user clicks "Plano do Produto". Data sourced from `GET /api/committees/{id}/central-optimization/{matId}` and `GET /api/committees/{id}/incoming-orders`.

| Field (label) | Element ID | Source / Calculation |
|---------------|-----------|---------------------|
| Produção Necessária Otimizada (unidades) | `unitRequiredProduction` | `requiredProductionForCommittee` from central-optimization |
| Produção Necessária Otimizada (quantidade física) | `unitRequiredProductionPhysical` | `requiredProductionForCommittee × standardQuantityPerUnit` + `measurementUnitName` |
| Produção Localmente Necessária (quantidade física) | `unitLocalProductionPhysical` | Σ`demandedQuantity` of orders with status in `STATUS_ACEITO_NAO_FINALIZADO` × `standardQuantityPerUnit`, with ▲/▼ delta vs optimized |
| Utilização | `unitUtilizationStatus` | Green/orange/red badge: "bem utilizada" (−25% to +25%), "subutilizada em X%", "sobrecarregada em X%" |
| Participação Estimada (mensal) | `unitEstimatedParticipation` | `estimatedParticipationHours` from central-optimization |
| Participação Estimada Localmente (mensal) | `unitLocalParticipation` | `estimatedLocalParticipationHours` from central-optimization |
| Tempo Estimado para Conclusão | `unitLocalTimeToComplete` | `estimatedLocalTimeToComplete` + unit from central-optimization |
| Limite de Emissão (mensal) | `unitCo2Limit` | `co2AllocatedToCommittee` from central-optimization (already monthly by construction) |
| Emissão desta unidade (mensal) | `unitCo2LocalEmission` | `totalUnits × co2EmissionFactor / pendingMonths`, where `pendingMonths = max(1, ceil(totalPendingHours / monthlyCommitteeCapacity))` |
| Status de emissão | `unitCo2LocalEmissionStatus` | Green/orange/red badge: "Emissão X% abaixo do limite", "Emissão próxima do limite", "Emissão X% acima do limite" |

**`STATUS_ACEITO_NAO_FINALIZADO`** (defined in committee.js):
```javascript
var STATUS_ACEITO_NAO_FINALIZADO = ['aceita em produção'];
// Define which order statuses count as "accepted but not finalized".
// Change this array to modify the criterion.
```

### Leilão e Serviços Públicos (popularcouncil)

**Bidding flow:**

| Function | Role |
|----------|------|
| `renderOrderActions(orderId, status, supplierId)` | Renders action buttons: "Ver Lances" (supplierId is null/0, status `solicitada`), "Lance Escolhido" (green, supplierId > 0, status `solicitada`), "Confirmar Recebimento" (status `produzida e enviada`) |
| `viewProjectBids(orderId)` | Opens bids modal (reuses `addServiceModal`), hides footer, polls every 5s. Bid items sorted by lowest cost, click to select winner |
| `selectBidWinner(orderId, committeeId, name, hours)` | Confirms, calls `PUT /api/council/{id}/projects/{oid}/select-winner`, highlights winner green ✓, dims others, updates table row to show "Lance Escolhido" |
| `showBidWinner(orderId)` | Opens `supplierInfoModal` with project details (name, deadline, investment) and winning committee name |
| `selectLeilaoSupplier()` / `selectLeilaoForService()` | Sets `supplierId = 0` (open for bidding). Available in both Project and Service modals |

**Project name resolution in committee's incoming projects:**
`fetchIncomingProjects()` resolves `inputMaterializationId` to name via `globalState.materializationMetadataById[id].name`. Falls back to `ID#N` if metadata not loaded.

### Business Flows Implemented

**Hierarchical Taxation**: `CommitteeController.distributeHours` applies tax chain (committee → council → parent council → ... → PLANNERCOUNCIL). Tax rate per council (10-70%, default 50%). Remaining amount distributed to workers via bulk native SQL UPDATE.

**Public Budget & Revenue**: `popularcouncil.html` and `plannercouncil.html` have "Arrecadação Pública" section with balance display, vertical tax slider (10-70%), and extract modal with infinite scroll (grouped by month, searchable).

**Public Services & Projects**: `popularcouncil.html` has "Serviços Públicos" (`type=SERVICE`) and "Projetos e Obras Públicas" (`type=PROJECT`). Both can be "Leilão" (open for bidding, `supplierId=0`) or assigned to a committee. Services gained Leilão support — same logic as projects.

**Project Bidding (Leilão)**: Committees bid on open projects/services. Council views bids sorted by lowest cost, selects winner (highlighted green ✓). `supply_order.quantity` updated to winning `bid_hours`. Real-time polling (5s) in bids modal. Winner info shown via "Lance Escolhido" button → `showBidWinner()` modal.

**Status Workflow**: `solicitada → aceita em produção → produzida e enviada → recebida pelo demandante → horas liberadas`. Action buttons in committee.html (incoming orders) and popularcouncil.html (services/projects tables).

**Generic "Projetos Públicos" (ID 17)**: Aggregates all active projects for a committee for IO planning. Saved to `technological_tensor`. Individual projects filtered out by `filterIndividualProjectsSync()` in both popularcouncil.js and plannercouncil.js, and by `CouncilService.findAllRelevantMaterializationIds` (backend).

### Key Pages & JS Files

| Page | JS File | Key Functions |
|------|---------|---------------|
| `plannercouncil.html` | `plannercouncil.js` | `performPlanification`, `saveChanges`, `saveCo2Limit`, `renderProductionVector` (7-col for LP-IO with Relaxed Demand), `renderDemandVector` (CO₂ editable column), `openOptimizationResultModal` |
| `committee.html` | `committee.js` | `displayOptimizationResults` (CO₂ section), `displayUnitPlanData` (8 fields + utilization status), `fetchLocalProductionPhysical`, `fetchIncomingProjects` (resolves project names), `saveCommitteeState`, `distributeHours` |
| `popularcouncil.html` | `popularcouncil.js` | `loadServicesAndProjects`, `viewProjectBids` (polling), `selectBidWinner`, `showBidWinner`, `renderOrderActions` (Lance Escolhido), `confirmAddService` (Leilão support), `saveProject` |
| `worker.html` | `worker.js` | `loadAvailableMaterializations` (shop), `finalizePurchase`, `sociallyConfirmedWorkTime` |

### Critical API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/planification/planify` | Execute LP-IO planning |
| `POST` | `/api/planification/optimization-config/results` | Save optimization results (incl. `co2Allocated`) |
| `GET` | `/api/planification/previous-results/{id}` | Previous planification results |
| `GET` | `/api/planification/instances/{id}/technological-matrix` | IO matrix + `productNames` + `productIds` + `emissionFactors[]` |
| `GET` | `/api/planification/instances/{id}/demand-vector` | Demand vector |
| `GET/PUT` | `/api/council/{id}/co2-limit` | Get/set CO₂ emission cap |
| `PUT` | `/api/social-materializations/{id}/emission-factor` | Set CO₂ emission factor for a materialization |
| `GET` | `/api/committees/{id}/central-optimization/{matId}` | Planification data for committee: production, participation, CO₂ allocation, reduction info |
| `GET` | `/api/committees/{id}/incoming-orders` | Orders received (as supplier) |
| `PUT` | `/api/committees/{id}/orders/status` | Update order status |
| `POST` | `/api/committees/save-state` | Save full committee state |
| `GET/PUT` | `/api/council/{id}/balance` | Get/adjust council balance |
| `GET/PUT` | `/api/council/{id}/tax-rate` | Get/set council tax rate |
| `GET` | `/api/council/{id}/projects/{oid}/bids` | List bids sorted by cost |
| `PUT` | `/api/council/{id}/projects/{oid}/select-winner` | Select winning bid |
| `POST/PUT/DELETE` | `/api/committees/{id}/projects/{oid}/bid` | Place/update/remove bid |

### Code Patterns

- `emissionFactors` global object in `plannercouncil.js`: loaded from server via `technological-matrix` endpoint, keyed by `productId`. Used in `performPlanification()`, `renderDemandVector()`, and `saveChanges()`.
- `@Cacheable` removed from `DemandVectorRepository` queries (caused stale data).
- See "Key conventions" section above for JS/CSS/DB patterns.
