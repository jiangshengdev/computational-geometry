# Computational geometry

English | [简体中文](README.zh-CN.md)

The home page `/` provides algorithm selection. BO cases are listed at `/bo`, result pages at `/bo/cases/:caseId`, and teaching pages at `/bo/cases/:caseId/learn`. The frontend stores preset segments and calls the exact BO library through an Axum service, providing pair selection, exact coordinate details, uniform scaling, panning, and teaching replay of real Rust execution traces.

Teaching links can include a step, such as `/bo/cases/crossing/learn?step=2`. Refreshing or sharing restores the position; step changes replace the current browser-history entry. If the target step has not yet been generated, the page waits for the real trace. Invalid or out-of-range steps display explicit errors. The old `/cases/:caseId` and `/cases/:caseId/learn` paths no longer provide BO functionality or redirect.

`/convex-hull` lists fixed point-set cases, with details at `/convex-hull/cases/:caseId`. Direct access or refresh automatically calls the Rust Andrew algorithm and displays input points, the convex hull, and exact coordinates. Point sets are read-only, without editing or import. Every convex-hull result page offers step-by-step learning that replays the actual Andrew execution trace. Algorithms are organized by geometric problem and then specific algorithm. BO implementations live in `web/src/algorithms/segment-intersection/bo/` and `src/algorithms/segment_intersection/bo/`; shared segment-intersection types and cases live at the problem level. Convex-hull pages live in `web/src/algorithms/convex-hull/`, and the backend Andrew monotone-chain implementation in `src/algorithms/convex_hull/andrew/`. Frontend algorithm tests mirror implementation directories. The app entry point composes routes; basic geometry and general app components remain shared.

## Local use

Rust, Node.js, pnpm, and project dependencies must already be installed. Users perform dependency installation and native builds themselves. Replace `/path/to/computational-geometry` in commands with your checkout location.

Run from the repository root:

```sh
cd /path/to/computational-geometry
cargo run --offline
```

In another terminal:

```sh
cd /path/to/computational-geometry/web
pnpm run dev --host 127.0.0.1
```

Open the address printed by Vite. The service listens only on `127.0.0.1:3001` by default. Use `BO_PORT` to change its port and `BO_API_URL` to configure the service address for Vite's proxy. Rust changes require rebuilding and restarting the service; Vite updates frontend changes. Browser `/api` requests use Vite's same-origin proxy. `vite preview` does not replace the local service.

## Vercel deployment through GitHub

The frontend and backend deploy as one Vercel project. The Rust entry point follows the [official Vercel Axum template](https://github.com/vercel/examples/tree/main/rust/axum), using `VercelLayer` to call the existing `computational_geometry::http::router()`. The local listening entry point remains `src/main.rs`; both share the algorithm and HTTP contract implementation.

When importing the corresponding GitHub repository into Vercel:

- Set Root Directory to the repository root, not `web`.
- Select **Other** for Framework Preset; use installation/build commands and the output directory from the root `vercel.json`.
- Select Node.js **24.x**. Cloud installation uses pinned pnpm `11.8.0` and the existing lockfile.

Vercel builds `api/axum.rs` as a Rust Function and publishes `web/dist` as static assets. `/api` and `/api/*` go to Rust first; unknown APIs retain HTTP 404. Other paths first match static files, then fall back to `index.html`, supporting direct access and refresh on case and teaching pages. The browser continues to use same-origin `/api/bo/intersections`; `BO_API_URL` is unnecessary.

The first Preview deployment after GitHub integration needs checks for direct case access and refresh, JS/CSS loading, JSON responses from `POST /api/bo/intersections`, 400 for invalid input, and 404 for unknown APIs. Rust Runtime is currently Beta. Local checks do not replace Vercel cloud-build and routing acceptance.

## HTTP contract

`POST /api/bo/intersections`, `Content-Type: application/json`:

This is the sole BO computation entry point. The old `POST /api/intersections` returns 404, without redirection or compatibility forwarding.

```json
{
  "segments": [
    {
      "start": {"x": {"numerator": "0", "denominator": "1"}, "y": {"numerator": "0", "denominator": "1"}},
      "end": {"x": {"numerator": "3", "denominator": "2"}, "y": {"numerator": "1", "denominator": "1"}}
    }
  ]
}
```

Numerators and denominators are decimal integer strings, optionally signed; denominators must be nonzero. The service normalizes fractions while preserving exact mathematical values and the independent identity of each input. The API accepts arbitrary valid collections, not case IDs. Drawing approximations do not participate in requests, pairing, or mathematical equality.

Success returns `{"intersections": [...]}`. Each member's `segments: [i, j]` contains zero-based indices in original input order. `geometry` is either `{"type":"point","point":...}` or `{"type":"overlap","start":...,"end":...}`, with the string rational coordinates above. Interval endpoint orientation and result ordering are outside the mathematical contract. Empty collections, single inputs, and inputs without intersections return a successful empty array.

Invalid structures, integers, or zero denominators return HTTP 400 and `{"error":"..."}`; computation-task failure returns HTTP 500. The page distinguishes request failure from successful empty results. Switching cases cancels the old request and discards its late results.

### Convex-hull HTTP contract

`POST /api/convex-hull`, `Content-Type: application/json`, accepts a complete point set, not a case ID:

```json
{"points":[{"x":{"numerator":"3","denominator":"2"},"y":{"numerator":"0","denominator":"1"}}]}
```

Success returns `{"vertices":[...]}` with the same exact coordinate structure. The API shares the integer validation and error format above. `points` is required and must be an array; invalid structures, invalid integers, and zero denominators return HTTP 400. Returned coordinates are normalized; duplicate positions are merged, and interior points and collinear intermediate boundary points are excluded. Nondegenerate results start at the lexicographically smallest point and proceed counterclockwise without repeating the start at the end. Empty input returns `{"vertices":[]}`; one point returns that point; two points or wholly collinear input return the two ordered extreme endpoints. The page preserves separate list entries for duplicate inputs and counts input entries separately from returned vertices. Drawing approximations do not affect exact lists.

### Convex-hull teaching traces

Every convex-hull result page offers step-by-step learning at `/convex-hull/cases/:caseId/learn?step=0`. Steps are zero-based history indices; updates replace the current history entry. Refresh restores the same step. An ungenerated target displays a waiting state; failure or cancellation is not completion. Teaching supports forward/backward navigation, replay, a progress slider within generated history, and jumps to the start of phases that actually exist. It shows neither code nor autoplay.

Only entering teaching calls `POST /api/convex-hull/trace`, using the ordinary convex-hull request. The response is `application/x-ndjson`, one object per line, in this order:

- `{"type":"start","points":[...]}`: normalized exact coordinates in original input order, retaining separate indices for duplicate inputs.
- `{"type":"step","step":{...}}`: actual execution snapshots. `phase` is `preprocess|lower|upper|join`; `action` is `input|sort|deduplicate|select|turn|pop|push|chain_complete|trim_lower|trim_upper|complete`.
- `{"type":"complete","vertices":[...]}`: generation completed, with the same result as ordinary computation. Delivery cannot be considered successful until the entire stream ends. A missing final frame, truncation, or failure differs from a successful empty set.

Snapshot `order`, `lower`, `upper`, `subjects`, and non-null `result` are lists of original zero-based input indices. Sorting uses x, then y, then input index for equal coordinates; deduplication keeps the first identity. `current` and `removed` are point indices or null; `position` is the current point's position in `order` or null. `turn` is `left|right|collinear|null`. `lower_complete` and `upper_complete` indicate that the corresponding scan has ended. `result` is null until the final stop; the final empty-set result is `[]`. Empty and single-point inputs go through preprocessing and early return only, without lower/upper or join phases. Construction retains the current point, candidate chains, and the point popped in the current step. Decisions and mutations are separate; consecutive pops are recorded individually. The two endpoint removals deduplicate the join; they do not mean the endpoints are absent from the final hull.

Ordinary computation and traces share the Andrew execution path. Snapshots are serialized only for teaching requests and delivered as generated through a bounded queue. BO and convex hull share NDJSON delivery, disconnect cancellation, and lifecycle logging. `x-trace-id` identifies the request; the existing `BO_TRACE_LIFECYCLE=1` switch logs termination reasons for both traces. Leaving the page, switching cases, or cancelling loading aborts the request; server observation points stop remaining generation. Recorded states remain browsable.

### Convex-polygon intersection teaching traces

The result page enters `/convex-polygon-intersection/cases/:caseId/learn?step=0` on demand and calls `POST /api/convex-polygon-intersection/trace` with `{first: Point[], second: Point[]}`. Coordinates use the same exact rational structure, with the same boundary validation as ordinary intersection. NDJSON frames are:

- `start`: original-order `first` and `second`, plus `first_order` and `second_order` mapping normalized boundaries to original zero-based indices.
- `step`: `step.phase` is `containment|chasing|normalize`; `action` is `containment|relation|collect|inside|advance|terminate|normalize|complete`. Only actual execution actions are recorded.
- `complete`: `result` matches the last step and ordinary computation, with type `empty|point|segment|polygon`. Delivery is complete only after the whole stream ends.

Each snapshot contains `boundary` (`first|second|null`), original-index `vertex`, containment conclusion `contained`, current directed `edges` (one pair of original indices each for A and B), `relation`, `inside` (`unknown|p|q`), exact `candidates`, newly added candidate indices `added`, machine identity `reason`, and final `result`. Inapplicable fields are null; `result` remains null before result generation. `relation` describes the just-checked edge directions' `cross`, each end vertex's position relative to the other edge through `first_side/second_side` (`left|right|collinear`), and `contact` (`none|point|overlap`). In advance frames, `edges` has already changed while `relation` still refers to the old, just-checked edges. The page explains the decision using the advance reason without labeling the new edges with the old relation. `inside` tracks which boundary portion lies inside the other polygon, not containment of an entire polygon. Containment short circuits and early returns for oppositely directed collinear contact do not fabricate chasing or normalization phases. Candidates retain collection order and cannot be treated directly as the final polygon.

Ordinary computation and teaching use the same Rust execution path and share bounded trace delivery and disconnect cancellation. The page reuses convex-hull stream-loading lifecycle and replay URL controls: dragging/holding previews a position and commits on release; navigation invalidates stale previews. Cancellation preserves received steps; interruptions and errors must not masquerade as completion. `x-trace-id` and `BO_TRACE_LIFECYCLE=1` also apply here.

## Validation

Run all checks from the repository root:

```sh
cd /path/to/computational-geometry
just check
```

Run only end-to-end tests, optionally filtering cases:

```sh
cd /path/to/computational-geometry
just test-e2e
just test-e2e --grep 普通交叉
```

These entry points are user-run. Root `playwright.config.ts` provides joint orchestration: it builds and starts the backend through `cargo run --offline` with a system-assigned temporary port, waits for the printed listening address, passes it to the frontend via `BO_API_URL`, and runs headless Playwright. Playwright cleans up its service processes on completion, failure, or interruption without occupying an existing development backend's port.

Rust tests run independently of Node.js, pnpm, or browsers:

```sh
cd /path/to/computational-geometry
just test
```

Frontend typechecking and lint:

```sh
cd /path/to/computational-geometry/web
pnpm run typecheck
pnpm run lint
```

Frontend browser E2E runs Playwright directly against an independently started backend over HTTP. Start the backend as in “Local use”, then run:

```sh
cd /path/to/computational-geometry/web
pnpm run test:e2e
```

Frontend tests neither call Cargo nor manage backend processes. They connect to `http://127.0.0.1:3001` by default; `BO_API_URL` can override this. Playwright starts a dedicated Vite test service with `--port 0`, captures its actual address as `baseURL`, and closes it afterward. Both layers in the one-command E2E flow use system-assigned temporary ports, leaving development backend `3001`, Vite development `5173`, and preview `4173` free. Installed `@playwright/test` and matching Chromium are required.

Use native Playwright arguments to filter tests:

```sh
cd /path/to/computational-geometry/web
pnpm run test:e2e --grep 普通交叉
```

Commands inside `web` own only the frontend and use an existing backend. Root entry points automatically start and clean up the backend. `just check` explicitly combines typechecking, lint, Rust tests, and E2E without requiring a manually started backend. Tests compare HTTP output, pair identity, and linked selection against independent mathematical expectations; controlled responses are used only for error and late-response tests. Screenshots and test artifacts go to the system temporary directory and do not prove algorithm correctness.
