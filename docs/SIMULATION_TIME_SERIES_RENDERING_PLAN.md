# Simulation Time Series: Non-WebGL Rendering and Ensemble Overview Plan

Status: Proposed design and implementation plan; no runtime changes implemented.

Date: 2026-09-08

## 1. Executive Summary

Simulation Time Series displays reservoir simulation profiles across ensembles of hundreds of realizations. Long daily histories, multiple vectors, and comparisons across ensembles can produce millions of samples in one view. The current realization plots use Plotly WebGL rendering, which creates context-management problems when multiple charts are used. The application also aims to move away from Plotly.

**This plan proposes a hybrid visualization mode: a statistical fan chart with extrema-preserving display reduction and interactive realization overlays, initially rendered with ECharts Canvas 2D.** Its purpose is to reveal departures from typical ensemble behavior and let users compare a selected realization against the population, without drawing every realization as an interactive curve in the overview.

The chart combines three elements:

- **Statistical context:** percentile bands and a selected reference line show typical behavior and spread.
- **Min/max envelope:** ordinary statistical minima and maxima expose extreme values. When dates are grouped for display, preserve the lowest minimum and highest maximum within each group so brief spikes remain visible.
- **Realization overlays:** selecting a profile, highlighting it from another module, or inspecting a min/max contributor reveals that realization's actual curve above the statistics.

This does not introduce a new statistic. The additional work is preserving extrema during display reduction and retaining which realization and source time contributed them. The min/max boundary is not itself a realization: different members can contribute it at different times. Historical data, observations, and timestamp annotations remain available.

This is a change in how users explore the ensemble, not just a renderer replacement. Reducing the number of points in every curve still leaves hundreds or thousands of curves to render. A statistical background reduces that cost; zoom-dependent detail and a small number of exact overlays support inspection. ECharts Canvas 2D avoids WebGL contexts, but its performance must still be measured.

Extrema preservation is relative to the data returned at the selected API resolution. It cannot recover events removed by upstream resampling. At overview scale, the chart preserves extreme values but may not show their exact duration; zooming and inspecting the contributor provide that detail. Rate profiles require interval-aware handling to avoid displaying short spikes as long plateaus.

The first milestone is a client-side prototype that validates visual fidelity, contributor inspection, and multi-module performance while retaining current data queries. Backend summaries are a conditional follow-up if transfer or memory becomes the limiting factor. Do not replace the current default until these checks pass. Retain an explicit individual-realization mode for workflows the overview cannot serve.

### Terminology

| Term | Meaning in this plan |
| --- | --- |
| Vector/profile | A time-dependent reservoir quantity, such as a well's production rate; a profile is its curve for a particular realization. |
| Realization/member | One ensemble member, identified by its ensemble identity and realization number. |
| Canonical data | Data returned at the selected API resolution, before any display-only reduction. "Exact" means faithful to this data and its interpolation semantics, not necessarily native simulator output. |
| Display bucket | A short time interval corresponding to a chosen horizontal screen width in the current viewport. It changes with zoom and chart size. |
| Temporal outer range | The lowest ensemble minimum and highest ensemble maximum reached within a display bucket. It summarizes the ordinary min/max envelope across time, not a new percentile band. |
| Contributor/provenance | The realization and source sample, segment, or interval responsible for a displayed extreme. |
| Overlay | An individual realization curve drawn above the statistical background. A pinned overlay remains after hover ends. |
| Display reduction/decimation | Reducing rendering geometry without changing canonical data, scientific calculations, downloads, or published data. |

Sections 2-3 define scope and scale; sections 4-8 describe integration and technical design; sections 9-10 specify delivery and verification. Alternatives and limitations follow in sections 11-12.

## 2. Requirements and Decision Status

### Workload and user requirements

- An ensemble typically contains 200-400 realizations.
- Comparing 1-4 ensembles is common.
- Multiple vectors, including vectors per well, are common.
- Long production histories can have tens of thousands of dates; 30 years at daily resolution is approximately 11,000 dates.
- Avoiding WebGL context management is a goal. Moving away from Plotly is also a broader product direction.
- Preserving extrema is more important than preserving exact event duration in a dense overview.
- Inspecting individual realizations is valuable when zoomed in and when comparing a selected profile against the ensemble.
- Cross-module realization highlighting is a desired interaction.
- An overview's main purpose is outlier discovery and comparison, not identification of every overlapping curve.

### Proposed decisions, subject to validation

- Use ECharts Canvas 2D as the first renderer candidate.
- Use a statistical overview whose min/max envelope becomes a temporal outer range when several dates share a display bucket.
- Support exact highlighted overlays without rebuilding ensemble summaries.
- Discover contributors through extrema provenance and, in detailed views, canonical-data picking.
- Keep density visualization, backend multiresolution APIs, and automatic anomaly ranking outside the initial implementation.
- Consider statistics-first presentation for many-well workflows, but do not silently replace an explicitly selected individual-lines mode.

### Open product decisions

- Whether the overview becomes the default and how existing saved modules migrate.
- Which percentile bands and reference lines appear by default. Preserve existing petroleum percentile naming conventions; do not assume P10/P90 naming directly implies numeric lower/upper ordering.
- How ties and multiple extreme contributors are exposed.
- How many pinned profiles are supported, and what happens when that limit is reached.
- Whether hover should automatically publish a candidate or require an explicit inspection gesture in dense views.
- How parameter coloring is represented outside individual-lines mode.
- Acceptable four-ensemble band overlap and legend/isolation behavior.
- Target hardware, concurrent module count, latency budgets, and memory budget.

## 3. Scale and Bottlenecks

| Workload per vector | Approximate samples |
| --- | ---: |
| 400 realizations x 11,000 dates | 4.4 million |
| 4 ensembles x 400 realizations x 11,000 dates | 17.6 million |
| 4 ensembles x 400 realizations x 30,000 dates | 48 million |

These counts exclude statistics, observations, copies, and renderer bookkeeping. For 17.6 million samples, values alone occupy about 141 MB as Float64 data. Separate Float64 timestamps for every sample add approximately another 141 MB. JSON text, ordinary JavaScript arrays, temporary conversions, worker copies, and chart data structures can increase peak memory substantially. These are storage estimates, not measured browser heap usage.

Measure these costs independently:

1. Network transfer, decompression, parsing, and query-cache retention.
2. Scientific data alignment/statistics and display summary construction.
3. React/atom updates, chart option construction, and renderer ingestion.
4. Canvas geometry, painting, hit testing, and tooltip generation.
5. Zoom refinement, highlight changes, worker messaging, and cleanup.

Per-realization reduction to 1,000 columns still permits 1.6 million marks for 1,600 realizations. It is not a global rendering budget. Aggregated extrema require only a bounded number of marks per column per ensemble, though constructing them still requires access to the source data or precomputed summaries.

## 4. Current Implementation Anchors

These observations describe the checkout inspected on 2026-09-08. Recheck them when implementation begins.

| Existing surface | Current responsibility and migration implication |
| --- | --- |
| [view/view.tsx](../frontend/src/modules/SimulationTimeSeries/view/view.tsx) | Renders the shared Plot component; click timestamps come from rendered point indices. Reduced geometry needs explicit canonical timestamp resolution. |
| [view/hooks/usePlotBuilder.ts](../frontend/src/modules/SimulationTimeSeries/view/hooks/usePlotBuilder.ts) | Chooses `scattergl` for both realization-containing modes, rather than using a point-count threshold; assembles statistics, history, observations, and annotations. |
| [view/utils/PlotBuilder.ts](../frontend/src/modules/SimulationTimeSeries/view/utils/PlotBuilder.ts) | Owns Plotly subplot and trace composition. Keep its renderer-specific behavior out of the new summary model. |
| [createVectorTracesUtils.ts](../frontend/src/modules/SimulationTimeSeries/view/utils/PlotlyTraceUtils/createVectorTracesUtils.ts) | Distinguishes linear, backward-valid rate steps, and forward-valid derived steps. |
| [view/atoms/queryAtoms.ts](../frontend/src/modules/SimulationTimeSeries/view/atoms/queryAtoms.ts) | Owns regular/delta realization and statistics queries, resampling selections, history, and observations. Audit enablement before introducing overview queries. |
| [view/atoms/derivedAtoms.ts](../frontend/src/modules/SimulationTimeSeries/view/atoms/derivedAtoms.ts) | Exposes loaded canonical query results to the view. Display summaries should be separate derived state. |
| [view/hooks/useDownloadData.ts](../frontend/src/modules/SimulationTimeSeries/view/hooks/useDownloadData.ts) | Exports loaded realization/statistics/reference data through an existing CSV worker. Do not export reduced geometry. |
| [view/hooks/usePublishToDataChannels.ts](../frontend/src/modules/SimulationTimeSeries/view/hooks/usePublishToDataChannels.ts) | Publishes generators backed by loaded realization data. Summary-only fetching could change downstream behavior. |
| [frontend/package.json](../frontend/package.json) | Contains Plotly, Comlink, Vitest, and Playwright tooling; ECharts is not currently listed as a dependency. |

Before implementation, check the destination branch for existing ECharts infrastructure and realization-highlight contracts. Reuse those if present; otherwise identify the smallest integration needed during phase 0. Backend endpoints and cross-module event APIs are intentionally not prescribed until their current owners have been inspected.

## 5. Architecture and Ownership

The initial client-side design retains canonical data and separates the statistical background from realization inspection:

```text
Canonical query data
    |                         |
    |                         +--> downloads and published data channels
    |
    +--> statistical data and exact extrema/provenance index
    |         |
    |         +--> viewport-dependent overview geometry --> chart adapter
    |
    +--> selected-realization lookup --> exact visible overlays --> chart adapter
    |
    +--> canonical picking and timestamp resolution --> interaction state
```

In a future backend-summary design, summaries would supply the background while canonical realization data would be fetched separately for inspection and data consumers. Summary responses alone cannot replace the download and published-data branches. Section 8 describes that conditional extension.

### Canonical data

Canonical means the data returned at the selected API resampling frequency, not necessarily original simulator output. Display reduction cannot recover a spike already removed by upstream resampling. The extrema guarantee must state its source resolution.

Keep timestamps, values, units, interpolation/interval semantics, source revision, realization filters, and regular/delta ensemble identity. Validate monotonic time ordering and define duplicate timestamp behavior. Do not silently sort malformed data or bridge missing intervals.

### Scientific statistics

Use existing statistical semantics for realization inclusion, missing values, percentiles, derived vectors, and delta ensembles. Audit whether current statistics responses preserve the source resolution needed for the overview. If not, refine that data path explicitly; do not label monthly statistics as daily-extrema preserving.

Compute statistics on the agreed aligned canonical time grid, before display reduction. Do not compute ensemble statistics from independently decimated realizations or average percentile summaries to obtain coarser percentiles.

### Display model

Introduce a renderer-independent model that carries:

- Ensemble/vector identity, data revision, units, and source resolution.
- Viewport time range, effective bucket boundaries, and plot-area width.
- Statistical series with shared retained timestamps for coupled band boundaries.
- Temporal minimum/maximum values, validity/coverage information, and extreme contributor references.
- Exact overlay data with explicit linear or interval semantics.
- Representation metadata sufficient to distinguish a temporal range from an instantaneous statistic.

Prefer source-index references where possible. Synthetic display coordinates, such as clipped interval endpoints, must not masquerade as original samples. Stable member identity must use the framework's ensemble identity and realization number, not display labels or array position. Delta ensemble highlight compatibility requires an explicit mapping decision.

### Interaction state

Keep transient hovered identity, pinned identities, active timestamp, viewport, and any loading/error state separate. Hovering must not invalidate the canonical-data cache or statistical summary cache.

Use the existing module state and interaction conventions after verifying them. Define concrete interfaces during implementation; keep chart-library details out of shared interaction state.

## 6. Rendering Semantics and Algorithms

### 6.1 Exact highlighted profiles

For a selected realization, binary-search the visible time window and include the neighboring samples necessary to render boundary-crossing segments correctly. Render raw visible samples without lossy display reduction for the initially supported small number of overlays. Collapse equal adjacent rate levels only if interval coverage and gaps remain unchanged.

Existing shape mappings to verify with tests:

| Meaning | Current Plotly shape | Proposed ECharts step |
| --- | --- | --- |
| Linear interpolation | `linear` | No step |
| Rate valid backward in time | `vh` | `start` |
| Derived PER_DAY/PER_INTVL valid forward | `hv` | `end` |

Specify values at exact report timestamps and the first/last supported interval explicitly. Do not infer coverage before the first or after the last valid interval. Verify adapter behavior against synthetic traces rather than relying only on matching option names.

### 6.2 Temporal extrema

This is display reduction of the ordinary ensemble min/max envelope. It adds time-bucket support and contributor identity, not a new statistical measure.

For each ensemble and visible time bucket, compute the lowest and highest supported canonical profile values reached anywhere in that bucket. Preserve the contributor identity and source location for each result.

For rates, operate on intervals intersecting the bucket. A bucket containing no report timestamp can still contain a valid rate interval. Clip interval support to the bucket, honor forward/backward validity, and do not extend across gaps.

For linear profiles, consider interior vertices and interpolated values at clipped segment boundaries. If an extreme occurs at a synthetic boundary point, retain the contributing segment reference rather than inventing a source sample index.

Use deterministic half-open bucket ownership, with a defined final endpoint policy, to prevent duplicate or missing events. Value-axis transforms, including any supported log axes, must not change scientific min/max values. Invalid values under an axis transform require an explicit rendering policy.

At dense resolution, render a range mark or clipped range area per bucket without connecting retained extremes into a supposed physical trajectory. At sparse resolution, show the correctly reconstructed ensemble bounds on their actual time support. The range boundary can change contributing realization from one bucket to the next.

A range preserves values but not event duration, event count, or the internal ordering of multiple transitions. Tooltips should name the bucket range and extreme's source timestamp/interval. Exact inspection comes from the overlay.

Do not fill across missing-data coverage. If a bucket contains disconnected valid spans, split its geometry or refine it; if preserving gaps exceeds the normal geometry budget, expose the limit instead of silently implying continuity. Test partially populated ensembles separately from time ranges where no realization is valid.

### 6.3 Statistical bands and ordinary continuous lines

For an initial continuous-line reducer, evaluate first/last/minimum/maximum selection per time bucket, sorted by source order with duplicates removed. This is an M4-style approach, not a guarantee of exact pixel equivalence under every renderer.

Reduce coupled percentile boundaries using a shared selection of canonical timestamps, for example the union of the boundaries' required indices. Account for the enlarged union in the geometry budget. Shared timestamps prevent mismatched band alignment, but do not remove the need to test ordering, interpolation, and rate semantics.

For rate-valued bands, ordinary point selection followed by step rendering is unsafe. The first prototype should retain unreduced statistical steps if feasible. Any later reduction must preserve relevant transition support or introduce an explicitly approximate representation with a tested error criterion. Never widen a short spike merely by connecting distant retained samples.

Use accurate canonical visible bounds or exact summaries for y-axis extents. Do not let lossy display points accidentally decide the axis range. Preserve the user's existing axis-range policy across viewport updates.

### 6.4 Resolution policy

- Bucket in time/screen coordinates using the actual inner subplot width, not the outer module width or a fixed sample count.
- Start with a benchmarked bucket density expressed in CSS pixels; cap any device-pixel-ratio multiplier to avoid unbounded work on high-DPI displays.
- Keep a total geometry budget across ensembles, bands, and visible subplots.
- Do not automatically turn on every realization line when zooming. Refine the overview and selected overlays; individual-lines mode remains explicit.
- If a budget cannot meet the selected mode's fidelity, expose an intentional alternative rather than silently dropping curves or extrema.

## 7. Outlier Discovery and Linked Interaction

### Incoming cross-module highlight

Resolve the incoming ensemble/member identity against available data and draw the exact profile above the overview. Reuse canonical data or fetch that member on demand in a future summary-only architecture. Ignore incompatible identities explicitly, clear transient state correctly, and distinguish loading from unavailable data.

Do not rebuild background summaries or reset zoom when the highlighted member changes. Stable chart series IDs are necessary but not proof of cheap rendering: measure whether the adapter actually avoids expensive background work. A separate overlay canvas is a fallback only if normal ECharts updates fail the interaction budget.

### Discovering a contributor in the chart

Pick near a temporal range boundary within a defined screen-space tolerance. Resolve that bucket's exact min/max contributor and render the candidate profile. Clicking can pin it; leaving the chart clears transient hover but not pins.

The extreme might occur away from the pointer's exact time within the bucket. Show the actual event location and bucket context. Never report the candidate as an instantaneous nearest profile unless that was the selection algorithm.

For ties, keep one deterministic contributor in the bounded summary and provide a count or on-demand lookup of alternatives. Retaining every tied identity in every bucket can make provenance unbounded. A profile entirely inside the envelope may still be anomalous; document that this mechanism discovers extreme contributors, not all possible anomalies.

### Detailed picking

When individual profiles are displayed, benchmark a time-slice picker: resolve each visible candidate's canonical value at the pointer time, project it to screen space, and compare distance. Reuse timestamp searches for genuinely shared grids. Respect intervals, gaps, y-axis transforms, and subplot ownership.

This is not geometric nearest-segment picking, especially near steep transitions. Define tie-breaking and hysteresis to avoid flicker. Throttle pointer evaluation to animation frames, cancel obsolete work, and publish only identity changes.

Reuse an existing cross-module highlight protocol where available. Verify source ownership and clear-event behavior so one module does not erase another module's newer highlight or create an event feedback loop. Keep timestamp selection distinct from realization selection.

## 8. Workers, Caching, and Optional Backend Work

### Initial feasibility path

Keep current queries and exports unchanged for the first prototype. Construct display summaries outside the renderer. Use a worker for large summary work, following the existing worker conventions, once the synchronous reference implementation establishes correctness.

Cache source-level summaries by ensemble/vector identity, canonical revision, resampling, realization filter, derived/delta definition, and interpolation semantics. Cache viewport geometry separately by source-summary key, time range, resolution, and relevant axis configuration. Appearance-only changes and hover must not invalidate scientific summaries.

Give jobs revision/request IDs and ignore stale responses after zoom, resize, source changes, or unmount. Ignoring a response does not stop computation: use latest-request scheduling and cooperative cancellation/chunking where required so obsolete work cannot block the newest viewport indefinitely. Bound retained caches and release workers/listeners on disposal.

Avoid repeatedly cloning millions of samples for each zoom. Transfer only buffers whose ownership can leave the main thread; never detach buffers still used by query caches, downloads, or data channels. Compare a worker-owned copy, worker-owned canonical storage, and shared timestamp storage where source grids truly match. Do not assume SharedArrayBuffer is available.

For repeated queries, evaluate a multiresolution min/max index with contributor references. Min/max summaries can be merged exactly for whole covered blocks; partially covered edge blocks need finer data or raw inspection. Quantiles cannot be merged in the same way. Build more indexing only if profiling justifies it.

### Backend decision gate

Move toward backend summaries and member-on-demand fetching only if network, parsing, canonical memory, or initial summary latency misses the agreed budgets. Frontend reduction does not solve those costs.

Before designing endpoints, trace the existing regular/delta vector and statistics services, source-resolution handling, realization subset support, caching, and authorization. No backend API names are prescribed here.

A summary response would need a versioned contract for units, source resolution/revision, time domain, bucket support, statistical convention, missing-data coverage, extreme provenance, and approximation guarantees. Request keys must include realization filters and derived/delta definitions. Return exact statistics or explicitly declared approximations; never silently change conventions.

Summary-only fetching requires a separate compatibility plan for downloads and published data channels. Options include fetching canonical data on demand, a backend export, and lazy data generators if the existing channel contract permits them. Preserve contents and resolution of current exports, and do not claim the module is fully loaded when a downstream consumer still lacks required canonical data.

## 9. Delivery Phases

Phases 0-2 establish feasibility before production integration. The later phases assume that prototype succeeds. Phase 6 is conditional: bring its data-placement decision forward if an earlier benchmark identifies transfer or memory as a blocker, rather than completing the client implementation first.

| Phase | Implementation work | Exit criteria |
| --- | --- | --- |
| 0. Baseline and decisions | Instrument representative workloads; confirm current statistical semantics, highlight contracts, target hardware, and ECharts integration availability. | Reproducible benchmark harness, approved provisional budgets, and documented source-resolution guarantees. |
| 1. Correctness reference | Implement pure canonical interval lookup, bucket extrema/provenance, boundary clipping, and continuous-line reduction with synthetic fixtures. | Unit tests establish exact extrema relative to canonical data, correct interval validity, gap handling, and deterministic provenance. |
| 2. Canvas feasibility | Add/reuse ECharts Canvas infrastructure; build an isolated module fixture with statistical overview, temporal ranges, and exact overlays. Compare raw Canvas, per-realization reduction, and aggregated overview. | Visual review of short spikes and four-ensemble overlap; no WebGL contexts created by the new time-series chart; measured rendering improvement. |
| 3. Interaction | Add contributor picking, pinning, canonical timestamps, and incoming/outgoing highlights using the verified framework contract. | Correct identity/clear behavior; highlights do not recompute summaries or reset zoom; responsive cached overlays. |
| 4. Viewport pipeline | Add zoom/resize refinement, worker execution, bounded caching, stale-result protection, and index optimization only where measured. | Responsive navigation, accurate viewport edges, stable memory, and no stale geometry after rapid changes. |
| 5. Module integration | Connect settings and regular/delta queries; restore references, statistics options, legends, subplot grouping, colors, downloads, and channels. | Feature matrix passes; serialization migration is tested; canonical exports and downstream data remain unchanged. |
| 6. Data-placement decision | Evaluate backend summaries/member fetch only if the client path misses transfer or memory budgets. | Either client architecture meets workload envelope or an explicit backend follow-up is approved with compatibility requirements. |
| 7. Controlled rollout | Feature-flag or explicitly select the new renderer/mode; validate saved workspaces and representative users; retain rollback during evaluation. | Agreed correctness and performance gates pass; default-mode decision recorded; legacy module path removed only after approval. |

Suggested initial code ownership is module-local summary algorithms, viewport orchestration, and tests. Extract a shared renderer-independent time-series utility only when there is a demonstrated second consumer or an established shared API. Keep ECharts-specific options in a chart adapter, not query atoms or scientific algorithms. Reuse existing ECharts infrastructure on the destination branch instead of creating a competing adapter.

Each phase should be independently reviewable. The benchmark fixture and correctness tests should land before replacing the production view. Do not remove Plotly from the application's dependencies as part of this module migration; other visualizations still use it.

## 10. Verification Plan

### Numerical and semantic unit tests

- One-day spikes, brief drops to zero, negative rates, constant profiles, and alternating high/low rates.
- Forward/backward rate validity, exact report dates, first/last intervals, and buckets with no interior timestamps.
- Linear segment clipping and extrema at viewport boundaries.
- Irregular grids, empty/single-point data, duplicate/unsorted timestamps, missing values, and disjoint coverage.
- Correct realization filtering, changing contributors, tied extrema, and deterministic source identities.
- Different grids across realizations and ensembles under the verified alignment rules.
- Statistical band ordering, shared-index selection, and existing percentile conventions.
- Regular/delta identity handling and derived-vector source resolution.
- Exact-summary comparisons against an independent brute-force implementation on small randomized fixtures.
- No display reduction leaking into exports, statistics calculations, or published canonical data.

### Component and integration tests

- Render linear, backward-valid, and forward-valid examples against expected geometry.
- Compare dense overview with zoomed exact profiles around known spikes and gaps.
- Inspect extremes, cycle tied contributors, pin/unpin, and clear transient hover.
- Receive external highlights for available, filtered, unavailable, and incompatible members.
- Preserve viewport on highlight, settings changes that should not reset it, and background refinement.
- Reject stale worker responses after rapid zoom, resize, source revision changes, and unmount.
- Exercise one/four ensembles, multiple subplots, parameter-colored individual mode, history, observations/error bars, and timestamps.
- Confirm Canvas output is nonblank and correct at multiple sizes/device pixel ratios. Use numerical assertions as well as screenshots; screenshots alone do not prove extrema correctness.
- Verify new chart instances request no WebGL contexts, without attributing contexts from unrelated 3D modules to this chart.
- Test current and migrated serialized modules plus download/channel parity.

### Benchmark matrix

| Dimension | Cases |
| --- | --- |
| Dates | 1,000; 11,000; 30,000 |
| Realizations per ensemble | 200; 400 |
| Ensembles | 1; 4 |
| Visible chart layout | One subplot; a realistic multi-vector module; several simultaneous modules |
| Data shape | Smooth cumulative; constant rates; sparse spikes; dense alternating rates; missing spans |
| Interaction | Initial view; wheel/box zoom; pan; reset; resize; repeated incoming highlight; pinned overlays |
| Environment | Agreed representative workstation and lower-end supported device; normal and high-DPI displays |

Choose representative combinations plus designated stress cases rather than requiring every Cartesian combination. Separate cold-network measurements from warm-data interaction measurements. Record raw data size, peak memory, output geometry counts, median/p95 timings, main-thread long tasks, and mount/unmount retention.

Provisional targets for product/engineering approval, not measured promises:

- Cached highlight to visible overlay: p95 at or below 100 ms.
- Cached contributor picking and tooltip response: p95 at or below 50 ms.
- Zoom/pan feedback: no sustained main-thread stalls; aim for at least 30 fps during gestures on target hardware.
- Refined viewport after the gesture settles: p95 at or below 250 ms with warm summaries.
- Initial warm overview: aim for at or below 1 second; report initial indexing separately rather than hiding it.
- Memory: agree an explicit workspace budget after baseline measurements; bounded caches and no retained growth after repeated mount/unmount cycles are mandatory.

If targets fail, attribute the failure before changing technology: data placement for transfer/memory, indexing for summary computation, renderer/geometry for paint cost, and isolated overlay updates for highlight cost.

Use the existing Vitest and Playwright toolchains. Start with focused new unit/component suites, then run the frontend typecheck, lint, dependency checks, and relevant module integration tests. Performance results must record browser, hardware, dataset, build mode, and cache state. Do not compare a development build against a production baseline.

## 11. Alternatives and Tradeoffs

| Alternative | Role in this plan |
| --- | --- |
| Plotly SVG plus decimation | Possible tactical experiment; does not meet the longer-term migration goal and still needs rate-aware geometry and total trace budgeting. |
| ECharts Canvas with all raw lines | Essential baseline. May be sufficient for smaller cases; not assumed sufficient for millions of samples and many modules. |
| Per-realization M4/minmax | Useful for continuous-line individual mode; preserves selected extrema but does not bound cost independently of realization count. |
| LTTB or MinMaxLTTB | Benchmarkable shape-oriented reducers, not a guarantee to retain every extreme or rate interval. Evaluate maintained libraries before adopting an implementation. |
| Time-weighted average rates | Suitable for explicitly requested physical resampling/volume-oriented workflows, not an extrema-preserving display substitute. |
| Density plus extrema | Valuable follow-up for multimodality; define whether density means occupancy, probability, or temporal duration before implementing. |
| Specialized WebGL time-series library | Fallback if required individual-line workloads cannot meet Canvas budgets. Must demonstrate context ownership, disposal, and multi-module behavior; changing libraries alone does not solve context limits. |
| Backend multiresolution summaries | Addresses transfer and canonical-memory limits, but adds source-resolution, API, cache, export, and downstream-consumer responsibilities. |

## 12. Completion Criteria and Limitations

The first production release is complete when the selected supported workload envelope meets agreed budgets, canonical extrema remain discoverable at overview resolution, their exact contributors can be inspected, cross-module highlighting works without rebuilding summaries, and existing module data contracts remain intact.

Document these limitations in the feature specification and relevant help material:

- Extrema preservation is relative to canonical API resolution, not necessarily native simulator output.
- Temporal ranges do not preserve exact duration or imply that all values in the range occurred.
- Percentile bands can hide multimodality, and an interior profile can still be anomalous.
- Extreme contributor picking is not an automatic anomaly detector or always a nearest-line picker.
- Exactness for selected profiles is relative to canonical data and its established interpolation semantics.
- No fixed rendering budget can show every transition and every realization exactly at arbitrary scale.

## 13. Reference Material

- [ECharts Canvas versus SVG guidance](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/)
- [ECharts upstream sampling processor](https://github.com/apache/echarts/blob/master/src/processor/dataSample.ts)

ECharts Canvas is Canvas 2D and does not require a WebGL context. Built-in sampling options are useful baselines, but are version-dependent and are not substitutes for the interval, provenance, and statistical guarantees in this plan. Verify behavior against the version selected for implementation rather than relying on upstream master.