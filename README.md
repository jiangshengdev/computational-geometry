# Computational Geometry

English | [简体中文](README.zh-CN.md)

Exact planar geometry in Rust, an interactive web application, Chinese mathematical articles, Lean proofs, and Remotion teaching-video projects. The web application sends geometric inputs to the Rust HTTP service; drawing approximations do not replace exact computation.

## Features

- **Segment intersection (Bentley–Ottmann):** exact rational computation of complete intersections for unordered original input pairs, including endpoint contacts, multiway crossings, vertical segments, collinear overlaps, duplicate inputs, and zero-length point inputs. Each intersecting pair produces a point or a complete overlap interval, preserving input identity.
- **Convex hull (Andrew monotone chain):** exact hull computation with explicit handling of duplicate positions, collinear inputs, and degenerate point sets.
- **Convex-polygon intersection:** exact intersection results represented as empty, point, segment, or polygon.
- **Polygon triangulation:** validation of a simple polygon boundary, followed by monotone partition and stack triangulation; triangles reference original vertex indices.
- **Interactive exploration:** preset cases and result pages for all four problems. BO, convex hull, and convex-polygon intersection also offer teaching replay from real Rust execution traces, with replay positions in URLs. Triangulation has result pages; no teaching-replay route is provided for it.
- **Explanations and proofs:** a separate Chinese Docusaurus site, a Lean model for BO shear mathematics, and video projects with their own production and acceptance records.

The app starts at `/`; case lists are at `/bo`, `/convex-hull`, `/convex-polygon-intersection`, and `/triangulation`. Mathematical output, sweep events, execution traces, and teaching replay have distinct meanings; see the [domain glossary](GLOSSARY.md) (Chinese).

## Directory guide

| Area | Entry point |
| --- | --- |
| Web application, local use, HTTP and trace contracts | [web](web/README.md) |
| Chinese article site, build and maintenance | [docs-site](docs-site/README.md) |
| Rust library and public algorithm APIs | [src/lib.rs](src/lib.rs) |
| BO dynamic groups, identity, costs, and trace production | [BO algorithm](src/algorithms/segment_intersection/bo/README.md) |
| Shear model, theorem mapping, and proof boundary | [BOProof](BOProof/README.md) |
| Shared video foundations and validation boundaries | [videos/shared](videos/shared/README.md) |
| Bentley–Ottmann shared video resources | [videos/bentley-ottmann](videos/bentley-ottmann/README.md) |
| Seven shear video projects | [videos/shear](videos/shear/README.md) |
| Architectural decisions | [ADRs](docs/adr/README.md) (Chinese) |

Selected module READMEs have English and Chinese versions. Article bodies, individual video READMEs, narration, subtitles, and internal documents retain their existing languages.

## Run locally

Use an existing checkout with Rust, Node.js, pnpm, and project dependencies prepared by the user. Replace `/path/to/computational-geometry` with your checkout location. See the module READMEs for version requirements and setup details.

Start the Rust service:

```sh
cd /path/to/computational-geometry
cargo run --offline
```

In another terminal, start the frontend and open the address Vite prints:

```sh
cd /path/to/computational-geometry/web
pnpm run dev --host 127.0.0.1
```

The backend defaults to `127.0.0.1:3001`. `BO_PORT` changes its port; `BO_API_URL` tells Vite where to proxy `/api`. Rebuild and restart after Rust changes. Frontend and backend own separate lifecycles; root [justfile](justfile) entry points provide joint test orchestration when needed.

The article site runs independently of the backend:

```sh
cd /path/to/computational-geometry/docs-site
pnpm run start --host 127.0.0.1
```

## Checks and delivery boundaries

With the pinned Lean toolchain and dependencies already available, check the formal model through:

```sh
cd /path/to/computational-geometry
just proof
```

Other check entry points and their scope are documented in [web validation](web/README.md#validation), [site build and checks](docs-site/README.md#build-and-checks), and [shared video validation](videos/shared/README.md#changes-and-validation). Choose checks for the affected area; video commands and installed-browser requirements belong to each episode's documentation.

The Lean model checks shear mathematics, not refinement of Rust, completeness of the BO sweep, or complexity. Deployment configuration does not prove that a cloud project is live. Video content/type/layout checks do not replace listening, final-film synchronization, or visible-desktop acceptance. See individual modules and episodes for precise boundaries; specifications, tickets, and execution records are maintained in [CNB Issues](https://cnb.cool/jiangshengdev/computational-geometry/-/issues).
