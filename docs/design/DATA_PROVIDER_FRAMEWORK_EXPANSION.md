# **Design: Expanding the Data Provider Framework to Statistical/Tabular Modules**

Status: **Draft for discussion**

This document proposes how to evolve the Data Provider Framework (DPF) — today used by `2DViewer`, `3DViewer`, `Intersection` and `WellLogViewer` — into the general composition model for webviz modules, starting with `SimulationTimeSeries` and the inplace volumes modules. It also addresses six cross-cutting concerns:

1. Tightening the domain data model before writing new providers

2. Built-in parameter correlation for any realization-level data

3. Coloring and subplotting for Plotly-based views with multiple providers

4. Delta ensembles as a generic analysis across data types

5. Providers in one view feeding another (selection-driven data flow)

6. Data identity across views (hover/highlighting)

Constraints: **frontend-only** (backend changes deferred, §2.1), **side-by-side migration** (existing modules untouched), and **UX as a gating concern** (§10) — users find the current DPF somewhat confusing, and this proposal must reduce that, not add to it. §12 defines the first concrete slice: lift the DPF and add summary vectors + inplace volumes.

---

## **1\. Background: what exists today**

### **1\.1 The Data Provider Framework**

The DPF lives in [frontend/src/modules/\_shared/DataProviderFramework](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/modules/_shared/DataProviderFramework) and is a client-side layer-tree framework:

- A `DataProviderManager` owns a tree of `Group`s (`View`, `IntersectionView`, log tracks), `SharedSetting` nodes, and `DataProvider`s.

- A provider implements `CustomDataProviderImplementation&lt;TSettings, TData, TStoredData&gt;`: it declares settings, wires a reactive dependency graph (`setupBindings`) that resolves available options/metadata, and implements `fetchData()` against the API with a scoped, cancellable query client.

- **Data fetching is view-agnostic.** The same `DepthSurfaceProvider` serves 2D, 3D and intersection views.

- **Rendering is view-specific by design.** Each consumer module registers `transformToVisualization` functions per provider type per `VisualizationTarget` (`DECK_GL`, `ESV`, `WSC_WELL_LOG`) on a `VisualizationAssembler`, plus per-group collectors and cross-provider accumulators.

- `SharedSetting` \+ `ExternalSettingController` implement scoped setting elevation within a tree: a shared node controls compatible descendant settings and intersects their value constraints. This is materially richer than the workbench `SyncSettings` broadcast mechanism (last-publisher-wins, no persistence, no constraints).

- The manager holds `GlobalSettings` (`fieldId`, `wellboreUuid`, ensembles, realization filter function, intersection polylines) sourced from `WorkbenchSession`.

### **1\.2 The statistical/tabular modules**

`SimulationTimeSeries`, `InplaceVolumesNew/Plot/Table`, `Rft`, `Pvt`, `RelPerm`, etc. use the classic pattern: settings atoms fetch metadata and repair persisted selections; a `settingsToView` interface snapshots into view atoms; the view runs queries and builds one monolithic Plotly figure. Visualization switching (`PlotType`, `showTable`) is a settings enum consumed by a single view component. Cross-plotting goes through data channels (numeric, realization-keyed contents) into consumer submodules (`DistributionPlot`, `SensitivityPlot`, `ParameterResponseCrossPlot`, ...).

### **1\.3 The framework layer**

- `DataProviderManager` is instantiated inside module-scoped jotai state and serialized with the module instance ([usePersistedDataProviderManager.ts](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/modules/_shared/DataProviderFramework/hooks/usePersistedDataProviderManager.ts)).

- `Dashboard` owns module instances, layout and channel resolution. `PrivateWorkbenchSession` owns ensembles, realization filters and `UserCreatedItems` ([IntersectionPolylines.ts](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/framework/userCreatedItems/IntersectionPolylines.ts) is the working model for session-scoped, serialized, user-created shared state).

- [HoverService.ts](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/framework/HoverService.ts) provides typed, throttled, cross-module hover topics: `REALIZATION`, `TIMESTAMP`, `WELLBORE_MD`, `ZONE`/`REGION`/`FACIES`, `WORLD_POS_UTM`, `POLYLINE_LENGTH_ALONG`.

---

## **2\. Target architecture**

The end state: **modules are viewports**. A module hosts one or more view groups; each view group contains data providers (layers/traces/tracks/columns) and shared settings. Composition, elevation of settings, and cross-view data flow are framework concerns.

```
Dashboardrendersrendersrendersselection: polygonselection: timestampWorkbench sessionEnsemble set + realization filtersUser created items / selectionsElevated shared settingsDataProviderManagerView group: mapView group: time series plotView group: volumes tableSurface providerSummary vector providerInplace volumes providerModule instance AModule instance B
```

This is reached incrementally — per-module managers remain valid throughout, and existing modules are not rewritten in place (the `InplaceVolumesNew` side-by-side pattern).

### **2\.1 Scope constraints**

- **Backend changes are out of scope.** All new work targets existing endpoints. The domain model, addresses and result shapes are a _frontend contract_; where a feature would ideally be server-side (polygon-filtered statistics §7, new delta endpoints §6), the frontend contract is designed so the backend work can slot in later, and the feature is either deferred or capability-gated in the UI until then.

- **Existing modules live side by side.** New DPF-based modules are added next to the current ones (the `InplaceVolumesNew` precedent). Nothing is removed or rewritten in place until the replacement demonstrates parity; templates migrate last.

- **Standardization over parity.** The existing modules are references, not specifications. The goals are: standardized analysis across data kinds, easy extension with new data types, built-in crossplotting/correlation, and effortless combination of multiple data types and views in a dashboard. Where an existing module's behavior is quirky, inconsistent or an artifact of its implementation, the new design chooses the optimal solution irrespective of it — deviations are noted, not avoided. "Parity" in this document means _capability_ parity (the analyses users need remain possible), never behavioral cloning.

---

## **3\. Domain data model (do this first)**

### **3\.1 Problem**

Today the "data model" is implicit and flat. `VOLUMES_TABLE_NAME`, `RESULT_NAME`, vector names, surface attributes, grid property names are unrelated strings, even though they describe artifacts of the _same_ underlying entity: an ensemble of realizations of a reservoir model. An inplace volumes table is an extraction from a reservoir grid; the grid has static/dynamic properties (rendered in 2D/3D/Intersection today); the simulation produces summary vectors, RFT, PVT, well data. Because the relationships are not modeled, every module re-derives metadata, comparability and joins ad hoc — e.g. `TableDefinitionsAccessor` intersecting table definitions, or each module's own "repair persisted selection" logic.

The current inplace volumes modules are the concrete cautionary example: **sensitivities are not handled as a dimension**. `EnsembleSensitivities` exists in the framework and is realization-keyed, but because the volumes table model only knows its own index columns (ZONE/REGION/FACIES), it is not possible to color or subplot volumes by sensitivity — even though the join (realization → sensitivity case) is trivial. A proper data model makes sensitivity, and any other realization-keyed classification, an ordinary derivable dimension instead of a per-module special case.

### **3\.2 Proposal: an explicit domain layer**

Introduce a `DomainDataModel` layer (suggested location: `frontend/src/framework/domain/` or `frontend/src/modules/_shared/domain/` initially) defining three things **before any new provider is written**:

**(a) The entity hierarchy** — what exists and how it relates:

```
Field
└── Ensemble (regular | delta)
    ├── Parameters                      (realization-keyed, in-memory already: EnsembleParameters)
    ├── Sensitivities                   (EnsembleSensitivities)
    └── Realization
        ├── ReservoirGrid
        │   ├── GridProperty (static | dynamic[time])
        │   └── extractions: InplaceVolumesTable, (future: maps from grid, ...)
        ├── SummaryVectors [time]
        ├── Surfaces (attribute, name, [time])
        ├── Wellbore data (logs, picks, trajectories, RFT)
        └── Observations / history (ensemble-level, not per realization)
```

This does not require backend changes — it is a typed frontend catalogue over existing endpoints. Long term the backend could expose a uniform metadata catalogue, but that is out of scope here.

**(b) Canonical data addresses.** Every provider fetch must be expressible as a typed address, generalizing the existing surface address builder:

```typescript
type DataAddress = {
  ensemble: RegularEnsembleIdent | DeltaEnsembleIdent;
  kind: DataKind; // e.g. SUMMARY_VECTOR, INPLACE_VOLUMES, GRID_PROPERTY, SURFACE
  identifier: KindSpecificIdentifier; // vector name | { tableName, resultName } | { gridName, propertyName } | ...
  temporal?: TemporalSelector; // timestamp | interval | resampling frequency | "all"
  spatial?: SpatialSelector; // index filter (ZONE/REGION/FACIES) | polygon | polyline | wellbore + MD range
  aggregation?: AggregationSpec; // per-realization | statistics{functions} | fanchart | sensitivity{reference}
};
```

Addresses give: cache keys, serialization, comparability checks ("are these two addresses delta-compatible?"), and a place to hang capability queries ("does the server aggregate this kind?").

**(c) A canonical result shape for realization-level tabular data.** Generalize [Table.ts](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/modules/_shared/InplaceVolumes/Table.ts) into a typed columnar table:

```typescript
type RealizationTable = {
  keyColumns: {
    realization: Int32Array;
    /* optional: */ timestamp?: Float64Array;
  };
  indexColumns: Record<string, Column>; // ZONE, REGION, FACIES, ...
  valueColumns: { name: string; unit: string; values: Float64Array }[];
  origin: { ensemble: EnsembleIdent; address: DataAddress };
};
```

Everything realization-keyed — volumes rows, vector values at a timestamp, grid property aggregates over a polygon, **and ensemble parameters** — normalizes to this shape. That single decision is what makes built-in correlation (§4), generic table views, and channel replacement possible.

Because the `realization` key column is always present, realization-keyed classifications are **derivable index columns**: sensitivity name/case (from `EnsembleSensitivities`) and discrete parameter values (from `EnsembleParameters`) can be joined on demand and then participate in `COLOR_BY`/`SUBPLOT_BY`/`GROUP_BY` like any native index column. This directly fixes the inplace-sensitivity gap described in §3.1.

### **3\.3 Consequences for settings**

Setting types (`Setting.VECTOR`, `Setting.TABLE_NAME`, `Setting.RESULT_NAME`, `Setting.INDEX_FILTER`, ...) become typed against the domain model, and their `valueConstraints` are resolved from shared metadata catalogues (via `makeSharedResult` dependencies) instead of per-module query atoms. The "repair persisted selection" logic that every classic module reimplements is subsumed by the existing `SettingManager` fixup-against-constraints behavior.

---

## **4\. Built-in parameter correlation**

### **4\.1 Problem**

Correlating responses against uncertainty parameters currently requires wiring data channels into dedicated submodules (`ParameterResponseCrossPlot`, `ParameterResponseCorrelation*`). The channel contract is a flat numeric-per-realization stream, and each consumer re-joins against `EnsembleParameters` itself.

### **4\.2 Proposal: analysis at the view-group level**

Parameters need no fetching — `EnsembleParameters` is synchronously available from the ensemble set (already exposed to the DPF via manager global settings). Since every provider in the new model emits `RealizationTable` data, correlation is a _join the framework can do generically_:

- A `PlotView` group gets an `ANALYSIS` group setting: `none | parameter_correlation | parameter_crossplot | tornado`.

- When active, the group's accumulator joins the children's accumulated `RealizationTable`s with parameter tables on `realization` (and validates single- ensemble/regular-ensemble constraints exactly where today's [useResponseChannel](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/modules/SensitivityPlot/view/hooks/useResponseChannel.tsx) does it ad hoc).

- The group collector then renders correlation matrix / crossplot / tornado instead of (or beside) the base visualization. Sensitivity processing ([sensitivityProcessing.ts](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/modules/_shared/SensitivityProcessing/sensitivityProcessing.ts)) stays a dedicated domain computation invoked by the tornado analysis.

**Alternative considered:** a derived "correlation provider" taking other providers as inputs. More composable, but requires provider-to-provider data dependencies (§7) and a multi-input contract the DPF does not have. The group-level analysis gives users the feature with zero graph plumbing; derived providers can come later if needed. Recommended: group-level first.

This makes the correlation submodules optional rather than required — they remain useful as standalone consumers during migration.

---

## **5\. Plot visualization target: coloring and subplotting**

This is the largest genuinely new piece. Deck.gl layers compose freely; a Plotly figure is a single global object where traces, axes, subplots, legends and colors interact.

### **5\.1 Separation of responsibilities**

- **Providers emit series, not traces.** A provider's transformer output for the new target is renderer-neutral:

  ```typescript
  type SeriesVisualization = {
      groupKeys: Record<string, string | number>;  // ensemble, vector, indexValue, sensitivity, ...
      role: "primary" | "history" | "observation" | "statistics-band" | ...;
      points: { x: ArrayLike<number|string>; y: ArrayLike<number> };
      identity?: SeriesIdentityMap;                // see §8
      styleHints?: { preferredColor?: string; dash?: ...; };
  };
  ```

- **The view group owns figure assembly.** A `PlotView` group collector receives all child series + accumulated `RealizationTable`s and builds the Plotly figure: trace construction for the chosen `VISUALIZATION_KIND` (line \| histogram \| box \| bar \| convergence \| scatter \| table), axes, subplot grid, legend dedup. This generalizes what `PlotBuilder`/`GroupedTableData` do inside `SimulationTimeSeries` and `InplaceVolumesNew` today.

### **5\.2 Subplotting: groups are the primary mechanism, faceting is secondary**

Two mechanisms, explicitly ordered:

1. **Structural (primary): one child group = one subplot cell.** Identical to how `Intersection` handles multiple views and how the viewport layout menu works. Users add a "Plot" group per subplot; each holds its own providers; shared settings above them keep axes/ensembles in sync. This is predictable, serializes trivially, and matches the tree UI users already know from 2D/3D/Intersection.

2. **Facet-by (secondary): a group setting `SUBPLOT_BY: dimension`.** Within one plot group, the collector splits the merged table by a discrete dimension (ensemble, index column, vector name) into a computed grid. This covers the "group by ensemble vs by vector" behavior of today's `SimulationTimeSeries` without requiring one group per ensemble.

### **5\.3 Coloring: a group-scoped color allocator**

The problem with multiple providers: independent providers must not fight over colors, and colors must be stable across refetches and across subplots.

- `PlotView` (or an ancestor shared setting) carries `COLOR_BY: dimension` (`ensemble | provider | index-value | sensitivity | parameter-value`).

- The group collector runs a **color allocator**: it collects the discrete key domain for the chosen dimension across _all_ child series, then assigns colors deterministically (sorted domain → categorical palette from `WorkbenchSettings`; ensembles use their session-assigned colors; continuous parameter coloring uses a sequential `ColorScale`).

- Provider `styleHints.preferredColor` is honored only when `COLOR_BY = provider`.

- Legend entries are deduplicated per color-key across subplots by the figure assembler.

This mirrors the proven pattern in `GroupedTableData` (InplaceVolumesNew) but lifts it to the framework so any combination of providers gets consistent coloring for free.

### **5\.4 Interaction with shared settings**

`COLOR_BY`, `SUBPLOT_BY`, `VISUALIZATION_KIND` are ordinary DPF settings on group implementations, so they participate in shared-setting elevation: a `SharedSetting` node above two plot views keeps their coloring/faceting consistent, and an elevated (dashboard-level, §9) setting can align coloring across modules.

---

## **6\. Delta ensembles**

### **6\.1 Principle: delta is an ensemble-dimension concept, not a per-datatype feature**

`DeltaEnsemble` ([DeltaEnsemble.ts](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/framework/DeltaEnsemble.ts)) is already a session-level user-created ensemble (comparison − reference, realization intersection, parameters from the comparison ensemble). Keep it that way: users select a delta ensemble in the same `ENSEMBLE` setting; they do not configure "delta mode" per provider.

### **6\.2 Provider capability flags**

Add to the provider contract:

```typescript
interface CustomDataProviderImplementation {
  // ...
  supportsEnsembleKinds?: readonly ["regular", "delta"]; // default ["regular"]
}
```

- The `ENSEMBLE` setting's constraints automatically exclude delta ensembles for providers that don't support them (constraint resolution already flows through `setupBindings`).

- `fetchData` switches endpoints on the ensemble kind — the exact pattern `SimulationTimeSeries` uses today (`getRealizationsVectorDataOptions` vs `getDeltaEnsembleRealizationsVectorDataOptions`).

### **6\.3 Where the delta is computed**

Ordered preference:

1. **Server-side per data kind** (exists for summary vectors). Statistically necessary: _statistics of deltas ≠ delta of statistics_ — deltas must be computed per realization before aggregation, which requires access to both ensembles' raw data. New delta support (e.g. inplace volumes, grid properties) should be backend endpoints. Note: this concerns where the _delta_ is computed. Statistics on top of per-realization (delta) data are computed client-side in the MVP (§12 D4), which is consistent — delta per-realization endpoints exist for summary vectors.

2. **Client-side per-realization combination** only for data kinds where both sides are cheaply present and aligned (e.g. two realization tables with identical addresses). The incomplete `DeltaSurface` group is the cautionary tale: pairwise client combination of addressed data is hard (alignment, resampling, statistics). Do not generalize it until a concrete need survives the backend-first rule.

**Decision needed:** finish or delete `DeltaSurface` as part of Phase 0 so the policy is explicit in code.

---

## **7\. Providers feeding providers (selection-driven data flow)**

### **7\.1 Problem statement**

Examples: draw a polygon on a map → show the histogram of grid/surface values inside it; pick a date in a time-series plot → show the volumes/vector distribution at that date. Today the second example is hacked in as `activeTimestampUtcMs` view state + data channels; the first has a working precedent: intersection polylines drawn in the map are stored in `UserCreatedItems` and consumed by the `Intersection` module.

### **7\.2 Proposal: first-class Selections, not provider→provider data edges**

What flows between views is not bulk data — it is a small, typed, user-created piece of state that _parameterizes_ another provider's fetch. Model it exactly like `IntersectionPolylines`:

```typescript
type Selection =
  | { kind: "polygon"; id; name; fieldId; polygon: XYPolygon }
  | { kind: "timestamp"; id; name; timestampUtcMs: number }
  | { kind: "mdRange"; id; name; wellboreUuid; from; to }
  | { kind: "realizationSubset"; id; name; ensemble; realizations: number[] };
```

- A session-scoped `SelectionsStore` aggregate under `UserCreatedItems` (serialized in the session schema, events, replicated read-model via `AtomStoreMaster` — the established pattern).

- View interactions **create/update selections** (map polygon tool, plot date click).

- Providers **consume selections** through a `Setting.SELECTION` whose constraints list compatible selections (by kind + field/ensemble compatibility), or through `GlobalSettings` for "the active X" cases. The provider's dependency graph refetches when the selection changes — no new machinery.

- Distinguish **transient** (hover, §8) from **persistent** (named polygon, pinned date) selections. Only persistent ones serialize.

A useful classification that falls out of this: "vector values at a timestamp" and "grid values inside a polygon" are **derived products** — a selection applied to an addressed data kind yields a new realization-keyed table. The selection is the parameter; the derivation is provider-side (or backend-side for bulk data). This is why vector histograms are deferred together with selections (§12 D3) rather than hacked into the vector provider.

This deliberately avoids a generic provider→provider data-dependency graph (multi-input providers, cycles, cross-manager subscriptions). Selections cover the stated use cases with the existing dependency system. If true data-derivation chains emerge later (provider B consumes provider A's fetched _bulk data_), revisit with a derived-provider contract — flagged as an open question, not designed here.

The spatial-filter case (histogram of values inside polygon) additionally needs the _evaluation_ to happen somewhere: prefer a backend endpoint taking the polygon (consistent with §6.3); client-side filtering only for data already in memory.

---

## **8\. Data identity across views**

### **8\.1 What exists**

[HoverService](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/framework/HoverService.ts) already carries typed, throttled topics (`REALIZATION`, `TIMESTAMP`, `WELLBORE_MD`, `ZONE`, `REGION`, `FACIES`, `WORLD_POS_UTM`, `POLYLINE_LENGTH_ALONG`), and the `VisualizationAssembler` supports per-provider hover visualization functions. `InplaceVolumesTable` already publishes region/zone/facies hover from table rows.

**Verdict: HoverService is good enough as transport.** What is missing is not the bus — it is the _mapping_ between rendered primitives and domain identity in the new plot target.

### **8\.2 Proposal: identity maps in the visualization product**

- Each `SeriesVisualization` (§5.1) may carry a `SeriesIdentityMap`: `pointIndex → { realization?, timestampUtcMs?, indexValues?, wellboreMd? }`.

- The shared plot wrapper component uses these maps in both directions:
  - **publish**: Plotly hover event → identity → `HoverService` topics;

  - **react**: subscribed topic change → restyle (highlight traces/points whose identity matches, dim others) without rebuilding the figure.

- Deck.gl/ESV targets keep their existing hover-function mechanism; the identity-map concept only formalizes the plot side.

- Persistent cross-view identity (e.g. "pin these realizations") is a `realizationSubset` Selection (§7), not hover.

New topics can be added as needed (e.g. `PARAMETER`), but no redesign of the service is required.

---

## **9\. Elevated settings and framework placement**

Three explicit scopes, extending what exists:

| Scope                     | Mechanism                                      | Status                         |
| ------------------------- | ---------------------------------------------- | ------------------------------ |
| Tree (within one manager) | `SharedSetting` \+ `ExternalSettingController` | Exists, works                  |
| Manager (module instance) | `GlobalSettings`                               | Exists; fed by per-module glue |
| Dashboard / session       | —                                              | **New**                        |

Plan:

1. **Auto-source more of `GlobalSettings`** in `DataProviderManager` from `WorkbenchSession` (remove per-module glue for ensembles/filters; keep module-supplied `fieldId`/`wellboreUuid` overridable).

2. **Session/dashboard-scoped elevated settings**: a serialized aggregate (modeled on `UserCreatedItems`) holding named setting instances (`ENSEMBLE`, `TIMESTAMP`, `INDEX_FILTER`, `COLOR_BY`, ...). A `SharedSetting` node in any manager tree can be _promoted_ to bind against an elevated setting via `ExternalSettingController` — reusing constraint intersection and controlled-setting semantics instead of the weak `SyncSettings` broadcast. UI: promotion toggle on the shared-setting node + a dashboard-level settings panel.

3. **(End state, optional) Dashboard-owned `DataProviderManager`**: one manager per dashboard, serialized in the dashboard schema; modules become viewports referencing a view group in the dashboard tree; "Add layer" inside a module edits that subtree. This aligns with the existing in-code note that `ChannelManager` should be lifted to dashboard level, and ultimately lets stable provider identity replace data channels. Not required for Phases 1–5.

Caveat: module jotai stores are isolated and `AtomStoreMaster` replication is one-way, so any shared aggregate must have an authoritative session/dashboard owner with modules as subscribers — the `UserCreatedItems` pattern satisfies this.

---

## **10\. UX: the hierarchy must be understandable**

Users find the current DPF **somewhat confusing**, and the mechanisms proposed here (shared settings, elevation, cross-module trees) increase the surface area. UX is paramount; treat the following as design requirements, not polish:

- **Provenance must be visible.** For every setting a user sees, it must be obvious _where its value comes from_: local, controlled by a shared setting (which one?), a group setting, or an elevated dashboard/session setting. Today's link icon is too subtle; controlled settings should name their controller and offer "jump to controller" / "detach" affordances.

- **Lexical scoping needs explanation.** The rule that a shared setting controls _subsequent siblings and descendants_ is powerful but non-obvious. The UI should preview the effect (highlight affected providers on hover/drag) rather than silently applying ordering rules, and invalid drag-drops should say _why_.

- **Shallow by default.** Default tree templates should be flat (view → providers). Nesting, context boundaries and shared settings are opt-in power features. "Add layer" flows should produce a working visualization with zero configuration beyond the defaults.

- **One vocabulary.** "View", "Plot", "Layer/Provider", "Shared setting", "Elevated setting" must mean the same thing in every module, in docs, and in code. The current mix (Layers/Log config/Views) should be consolidated.

- **Cross-module elevation needs a home.** When settings span modules (§9), there must be a dashboard-level panel listing elevated settings and which module instances are bound to each — invisible global coupling is the fastest way to lose user trust (a known weakness of today's `SyncSettings` "Global" checkbox).

- **Presets over construction.** Ship module templates/presets (e.g. "ensemble comparison histogram", "statistics fanchart") so most users never build trees from scratch; the tree is how you _inspect and adjust_, not the mandatory entry point.

- **Usability checkpoints are gating.** The MVP (§12) includes user validation of the tree UI before the pattern is rolled out to more modules.

---

## **11\. Phased implementation plan**

Phases are ordered by risk reduction; each leaves the app shippable. §12 extracts the first concrete slice from these phases.

### **Phase 0 — Framework hardening**

- Move DPF from `modules/_shared/` to `framework/` (it already depends only on workbench abstractions); keep a re-export shim during migration.

- `VisualizationAssembler`: skip providers without a registered transformer for the target instead of throwing.

- Fix the accumulator cache correctness issue (#1272) — accumulated data becomes load-bearing for tables/correlation.

- Decide `DeltaSurface`: finish or delete (per §6.3).

### **Phase 1 — Domain data model**

- Define entity hierarchy types, `DataAddress`, `RealizationTable` (§3).

- Retrofit _only_ the metadata catalogues needed for Phase 3 providers (summary vectors, inplace tables), exposed as shared-result dependencies.

- Adapt `EnsembleParameters` access so parameters normalize to `RealizationTable`.

### **Phase 2 — Plot/table visualization target**

- `SeriesVisualization` contract, `PlotView` group with `VISUALIZATION_KIND`, `SUBPLOT_BY`, `COLOR_BY`, `ANALYSIS` settings.

- Figure assembler: subplot layout (structural + facet), color allocator, legend dedup, table product from accumulated `RealizationTable`s.

- Identity maps + plot wrapper with HoverService publish/react (§8).

### **Phase 3 — Providers and settings**

- New settings: `VECTOR`, `RESAMPLING_FREQUENCY`, `STATISTIC_SELECTION`, `TABLE_NAME`, `RESULT_NAME`, `INDEX_FILTER`, `SELECTION`.

- Providers: `SummaryVectorProvider` (representation: realizations \| statistics \| fanchart via existing endpoints, see §12 D4; delta-capable), `SummaryHistoryProvider`, `SummaryObservationsProvider`, `InplaceVolumesProvider` (per ensemble×grid; per-realization, statistics client-side), `SensitivityResponseProvider`.

- Group-level comparability (table-definition intersection) as a group shared result constraining child settings.

### **Phase 4 — Prototype modules and built-in correlation**

- `TimeSeriesViewer` and `VolumesViewer` modules side-by-side with existing ones (the `InplaceVolumesNew` precedent). Settings = provider-tree UI (clone the 2DViewer wrapper pattern); view = plot-target assembler wrapper.

- `ANALYSIS` group setting: correlation matrix, crossplot, tornado (§4).

- Channel bridge: publish channel contents from the visualization product so `DistributionPlot`/`SensitivityPlot` keep working during migration.

### **Phase 5 — Selections**

- `SelectionsStore` under `UserCreatedItems`; polygon + timestamp kinds first.

- Map polygon tool publishes a polygon selection; plot date-click publishes a timestamp selection; providers consume via `Setting.SELECTION` / global settings (§7).

- Backend work where evaluation is server-side (polygon-filtered statistics).

### **Phase 6 — Elevation and consolidation**

- Elevated settings aggregate + shared-setting promotion (§9.2).

- Evaluate dashboard-owned manager (§9.3) based on Phase 4–5 experience.

- Migrate templates; deprecate superseded modules (`SimulationTimeSeries`, `InplaceVolumes*`, correlation submodules) as parity is demonstrated.

---

## **12\. MVP: a detailed first slice**

A vertical slice through Phases 0–4 using a deliberate subset of the data model: **lift the current DPF, add summary vectors and inplace volumes**. Frontend only (§2.1); existing modules untouched. This subset is chosen because it exercises every risky new mechanism (plot target, coloring/subplotting, sensitivity dimension, realization-table accumulation, delta capability flags) with only two data kinds. Per §2.1, the MVP is built with design freedom: existing modules inform capability requirements but do not constrain the solution.

### **Resolved decisions**

These were open questions; they are now settled and the steps below assume them:

| \#  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Lift the framework core only.** Delegates, framework objects, settings infra, groups, visualization/assembler and hooks move to `framework/dataProviderFramework/`. Shared _provider implementations_ (surfaces, wells, polygons, …) stay under `modules/_shared/` — they depend on module-shared domain helpers and must not invert layering.                                                                                                                                                                                                                                      |
| D2  | **Fetch per-realization, group client-side** (tabular data). No `GROUP_BY` fetch parameter derived from visualization settings. Tabular providers fetch per-realization data at full index resolution; the group collector does all grouping/faceting/aggregation from the merged `RealizationTable`s. Time-series statistics are the exception — see D4.                                                                                                                                                                                                                             |
| D3  | **Vectors emit series only in the MVP.** "Vector values at a timestamp" is a _derived product_ of a timestamp selection (§7) — same family as polygon-filtered grid data — and is deferred with selections. No histogram/box/table of vector data in the MVP.                                                                                                                                                                                                                                                                                                                         |
| D4  | **Inplace statistics client-side; vector statistics backend.** Volumes statistics (stats table, aggregates) are computed client-side from per-realization data, as `InplaceVolumesNew` already does; the backend statistical volumes endpoint is not used. Summary-vector statistics/fanchart are the opposite case — per-realization vector data across many timesteps is too large to justify client-side aggregation — and use the **existing** statistical endpoints (regular + delta), consistent with §2.1 (no new backend work).                                               |
| D5  | **The view kind is constrained by its providers.** Each provider type declares `compatibleVisualizationKinds`; a `PlotView`'s `VISUALIZATION_KIND` constraint is the intersection across its children (standard constraint-intersection semantics, surfaced in the UI like any other constrained setting). Adding a provider that would empty the intersection is rejected with an explanation, mirroring existing tree drag-drop rules.                                                                                                                                              |
| D6  | **Realization highlighting is within-module for the MVP.** Hovering a point in any scatter/bar/box/histogram where realizations are plotted highlights that realization's points in all other subplots/views of the module (publish + react through `HoverTopic.REALIZATION` and identity maps). Note: this topic currently has **no publishers or subscribers** in the codebase — the new module is the first; cross-module highlighting is a stretch goal.                                                                                                                          |
| D7  | **Settings are named by domain dimension, and index filters are split.** `VECTOR_NAME`, `VECTOR_RESAMPLING_FREQUENCY`; the volumes table identity reuses the existing `GRID_NAME` setting (a volumes table _is_ an extraction of a grid model); the result is `INPLACE_RESULT`; the monolithic index filter is split into `ZONE`, `REGION`, `FACIES`, `LICENSE` settings that hide themselves when the table lacks the column. The cross-module-syncing `InplaceVolumesFilterComponent` is **not** reused. Details in Step 3.                                                         |
| D8  | **Sensitivities are optional.** `EnsembleSensitivities` is nullable (always for some ensembles, structurally for delta ensembles without matching designs). Derived-column joins, `COLOR_BY`/`SUBPLOT_BY` dimension options and analyses must degrade gracefully — the sensitivity dimension is offered only when at least one contributing ensemble has sensitivities.                                                                                                                                                                                                               |
| D9  | **The module is a generic plot viewport; domain names are presets.** "Statistics" is a representation, not a module. Working name `ChartViewer`; user-facing entry points like `TimeSeriesChart`/`DistributionChart` are shipped as presets/templates of it (§10 "presets over construction"). Final naming/splitting is decided at the Step 7 UX gate. Current leaning: **separate thin modules — table, distribution, time series** — which is cheap either way since modules are viewports over the same target/providers and differ only in registration + allowed kinds/presets. |

### **Step 1 — Lift the DPF**

- Move the framework core per D1: `modules/_shared/DataProviderFramework/` → `framework/dataProviderFramework/`, excluding `dataProviders/implementations/` (and their registry side-effect wiring), which remain in `modules/_shared/`. Leave re-export shims at the old paths so `2DViewer`/`3DViewer`/`Intersection`/ `WellLogViewer` are untouched in this step.

- Assembler: skip providers with no registered transformer for the target (warn) instead of throwing.

- Accumulator cache issue (#1272): scoped as a **spike** — root cause is unknown. Fallback if not fixable in the timebox: keep accumulator caching disabled and cache per-provider transforms only; the collector must then be cheap enough on its own (typed-array columns, §3.2c).

- Auto-source ensembles/realization-filter/polylines in `DataProviderManager` from `WorkbenchSession` (drop per-module glue; `fieldId`/`wellboreUuid` stay module-supplied).

- Delete `DeltaSurface` (client-side pairwise combination rejected per §6.3) including its 2DViewer actions/UI.

### **Step 2 — Domain model subset**

In `framework/domain/` (new), only what the two providers need:

- `RealizationTable` (typed-array columns) + join utilities: `deriveSensitivityColumn(table, EnsembleSensitivities | null)`, `deriveParameterColumn(table, EnsembleParameters, parameterIdent)` — both return the table unchanged (dimension unavailable) when the source is null/absent (D8).

- Client-side statistics utilities for tabular data (per D4): grouped aggregation over `RealizationTable` (mean/p10/p90/min/max/stddev), ported/generalized from `InplaceVolumesNew`. No vector statistics here — those come from the backend (D4).

- `DataAddress` variants: `SummaryVectorAddress { ensemble, vectorName, frequency, representation }` and `InplaceVolumesAddress { ensemble, gridName, resultName, zone/region/facies/license filters }`. Volumes fetches are always per-realization (D2/D4); the vector `representation` selects the realization vs statistical endpoint.

- Metadata catalogues as shared-result dependencies: vector list (regular + delta endpoints) and table definitions (port `TableDefinitionsAccessor` intersection logic so it is reusable as a group shared result).

### **Step 3 — Settings**

Naming principle (D7): settings are domain dimensions, named for what they identify — not for the module that uses them.

- Truly new `Setting` types (UI component + constraint codec each):
  - `VECTOR_NAME`, `VECTOR_RESAMPLING_FREQUENCY`;

  - `INPLACE_RESULT` (note: deliberately not "response" — "response" is the app's generic term for any realization-keyed scalar in correlation/channel contexts and should stay reserved for that);

  - `ZONE`, `REGION`, `FACIES`, `LICENSE`: plain multi-select settings whose options come from the table definitions and whose _visibility_ is bound (`bindAttributes`) to whether the selected table has that index column — not all tables have all of them. These deliberately align with the existing `HoverTopic.ZONE/REGION/FACIES` identities and are natural future candidates for shared/elevated settings. Tables with non-standard index columns beyond these four are out of MVP scope (documented limitation).

  - The old `InplaceVolumesFilterComponent` is **not** reused — it was built to sync filter state across modules, which is exactly the coupling this framework replaces with shared/elevated settings.

- Reuse/extend existing enum values — `ENSEMBLE`, `REALIZATIONS`, `COLOR_SCALE`, `SENSITIVITY`, `STATISTIC_FUNCTION`, `REPRESENTATION` already exist in [settingsDefinitions.ts](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/src/modules/_shared/DataProviderFramework/settings/settingsDefinitions.ts). The volumes table identity reuses **`GRID_NAME`** (D7): a volumes table is an extraction of a grid model, so it is the same domain dimension the 3D grid providers already use — which later lets one shared `GRID_NAME` control a grid layer and a volumes provider together. Verify early that volumes table names and grid model names actually align in Sumo data; if they don't, fall back to a separate setting and note the domain-model gap.

- `ENSEMBLE` constraint resolution gains the `supportsEnsembleKinds` capability filter (§6.2).

### **Step 4 — Providers**

- `SummaryVectorProvider`: `REPRESENTATION` setting (realizations \| statistics \| fanchart). Realizations representation fetches per-realization vectors; statistics/ fanchart fetch the existing statistical endpoints (D4) — regular and delta variants exist, so the provider is delta-capable in all representations. Switching representation is a refetch (unlike volumes kind-switching, which is transformer-only). History and observations are two small sibling providers.

- `InplaceVolumesProvider`: one per ensemble×grid; fetches the per-realization aggregated-table endpoint at full index resolution (D2/D4); emits `RealizationTable`.

- Both register in the shared `DataProviderRegistry` and declare `makeValueRange`, validity predicates, refetch predicates and `compatibleVisualizationKinds` (D5) per the `DepthSurfaceProvider` pattern.

### **Step 5 — Plot visualization target**

- `VisualizationTarget.PLOT` with the `SeriesVisualization` contract (§5.1) and `SeriesIdentityMap` (§8.2).

- `PlotView` group: `VISUALIZATION_KIND` (constrained per D5: time-series for vector children — realizations/statistics/fanchart is the provider's `REPRESENTATION`, Step 4; histogram \| box \| bar \| convergence \| table for volumes children), `SUBPLOT_BY`, `COLOR_BY` — with **sensitivity and ensemble available as color/subplot dimensions from day one** (the acceptance case the current inplace modules fail). Dimension options must respect D8: sensitivity is offered only when a contributing ensemble has sensitivities.

- Group collector (framework code, not module code): client-side volumes statistics (D4), color allocator, structural + facet subplot layout, legend dedup, statistics-table product from accumulated `RealizationTable`s.

- Shared framework plot wrapper component: owns Plotly figure assembly from the visualization product, publishes/reacts to `HoverTopic.REALIZATION`/`TIMESTAMP` via identity maps (D6). The table product reuses `InplaceVolumesNew`'s virtualized statistics-table component.

### **Step 6 — Prototype module**

One new module (working name `ChartViewer`, per D9), registered side by side:

- Settings: provider-tree UI cloned from the 2DViewer wrapper (\~100 lines); allowed children: `PlotView` groups, shared settings, the Step 4 providers.

- View: plot-target assembler wrapper; per-group subplot rendering.

- Presets (D9): `TimeSeriesChart` and `DistributionChart` starting configurations so the module opens with a working plot, not an empty tree.

- Channel bridge: publish realization-keyed contents from the visualization product so `SensitivityPlot`/`DistributionPlot` remain usable.

- Persistence via the existing `usePersistedDataProviderManager` mechanism.

### **Step 7 — Validation gate (UX + parity)**

Acceptance criteria before expanding scope:

1. Volumes histogram colored **and** subplotted by sensitivity (impossible today) — and the sensitivity dimension correctly absent for ensembles without sensitivities (D8).

2. Histogram → box → table switch with **no refetch** (transformer-only change).

3. Vector fanchart/statistics (backend-fetched, D4) + volumes distribution in one module instance, kept consistent by one shared `ENSEMBLE` setting.

4. Delta ensemble selected for summary vectors; correctly unavailable (constraint filtered) for volumes.

5. Hovering a realization point in one subplot highlights the same realization in every other subplot/view of the module (D6).

6. Client-side **volumes** statistics performance is profiled against `InplaceVolumesNew` on a realistic ensemble (D4 exit check).

7. A moderated usability session on the tree UI (§10) with target users; findings triaged before Phase 4+ work continues. This gate explicitly decides D9: one generic module with presets vs separate thin modules (table / distribution / time series — the current leaning). Test both variants in the session; the `ChartViewer` prototype can masquerade as either via presets and restricted kind constraints.

### **Delivery notes**

- Each step ≈ one reviewable PR; Step 5 splits into contract → collector → wrapper.

- Tests: vitest units for `RealizationTable` joins/derived columns, client-side statistics, the color allocator and kind-constraint intersection; playwright-ct smoke for the tree UI and plot wrapper (repo has both harnesses under [frontend/tests](https://file+.vscode-resource.vscode-cdn.net/home/max/dev/webviz/frontend/tests/README.md)).

Explicit non-goals of the MVP: backend changes, elevated settings (§9.2–3), selections and derived products incl. vector-at-timestamp (§7, D3), parameter-correlation analyses (§4), dashboard-owned manager, cross-module hover highlighting, non-standard volumes index columns beyond ZONE/REGION/FACIES/LICENSE (D7), and any deprecation of existing modules.

---

## **13\. Risks and open questions**

- **Provider granularity for volumes**: one provider per ensemble×table vs one multi-ensemble provider determines how natural comparison feels. Prototype in Phase 3 before locking the contract.

- **Plotly figure ownership**: subplot layout is global to the figure; the group collector owning layout is new territory — prototype `SUBPLOT_BY` \+ color allocator early in Phase 2 with two providers of different kinds in one view.

- **Performance of client-side volumes statistics** (§12 D4): computing grouped statistics in the browser is a bet; the MVP profiles it (Step 7.6). Vector statistics stay backend-computed. Accumulated `RealizationTable` merging + correlation joins on every revision needs the assembler cache spike (Phase 0) and typed-array columns (§3.2c).

- **Derived providers** (bulk data dependencies between providers) are deliberately out of scope; revisit only if selections (§7) prove insufficient.

- **Delta ensembles for volumes/grid**: requires backend endpoints; frontend capability flags land first so the UI degrades gracefully.

- **Sync between old and new worlds**: during migration, elevated settings and `SyncSettings` coexist; define the bridge (or explicitly don't) before Phase 6.

- **UX adoption**: the framework only wins if the tree model is _less_ confusing than today's per-module settings, not just more powerful — hence the gating usability checkpoint in §12 Step 7.
