# BOProof

English | [简体中文](README.zh-CN.md)

A mathematical model of BO shearing for finite rational inputs. The authoritative specification is [CNB #278](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/278), implemented through #279–#283. This document explains the library interface and mathematical assumptions; execution status is maintained in CNB.

## Checking the proofs

Using the installed, pinned toolchain and dependencies, run from your checkout (replace `/path/to/computational-geometry` with its location):

```sh
cd /path/to/computational-geometry
just proof
```

This entry point changes into `BOProof/` and runs `lake --no-cache --wfail build BOProof`, checking all proofs and transitive axiom dependencies and treating warnings as failures. You can also run that Lake command directly in this directory. Lake reuses valid build results for unchanged modules and rechecks affected modules after proof changes.

The pinned versions in `lean-toolchain`, `lakefile.toml`, and `lake-manifest.json` are Lean/mathlib `v4.36.0-rc1`. Do not install, upgrade, or update dependencies as part of checking. The library entry point imports all proofs and `BOProof.Trust`. The latter enumerates every declaration in the `BOProof` namespace and checks transitive axiom dependencies. Any dependency outside `propext`, `Classical.choice`, and `Quot.sound`, including `sorryAx`, fails the build. It also prints dependencies of the main target theorems. Reviewing source for placeholders and newly introduced axioms remains necessary.

## Model and assumptions

`Input n = Fin n → InputSegment` preserves identity; geometrically duplicate inputs are not merged. Endpoints belong to `ℚ × ℚ`, while `closedSegment` uses a real parameter `t ∈ [0,1]`, so irrational interior points are included. The geometric theorems for `shear s (x,y) = (x+s*y,y)` apply to any rational `s`.

`LegalDenominator input D` requires a positive integer `D` divisible by every positive coordinate denominator. `commonDenominator_legal` constructs the product of the denominators. `coordinateBound` is an integer bound represented as a natural number: `max 1` applied to the maximum of the absolute values of all scaled integer coordinates. Empty input gives `D=1`, `M=1`. Inputs need not be nonempty, nondegenerate, or in general position.

`IsEvent` includes only endpoints and actual intersections of nonparallel segments; each such intersection must belong to both real closed segments. `OriginalEvent` is the preimage of these events under positive scaling, and `original_event_iff` proves equivalence to the same definition in the original coordinates. Nonparallel means that the direction determinant is nonzero; `nonparallel_nonzero` excludes zero-length segments from this formula. Parallel or collinear inputs do not enter the division formula, but their endpoints remain events. `collinear_overlap` proves that a collinear intersection is empty or a closed segment bounded by input endpoints. `overlap_endpoints_are_events` includes both boundaries as events, without including the infinitely many interior points of an overlap.

## Specification and theorem mapping

Exposition paths below are relative to `docs-site/docs/segment-intersection/shear/`.

| Ticket | Mathematical requirement | Public theorems | Exposition |
| --- | --- | --- | --- |
| #279 | Invertibility, real closed segments, complete intersections, and inverse restoration | `shear_inverse`, `shear_segment`, `shear_segment_intersection`, `restore_intersection`, `closedSegment_self` | `intersection.mdx` |
| #280 | Any legal common denominator, product construction, and integer maximum | `commonDenominator_legal`, `integerCoordinate_cast`, `integerCoordinate_bound`, `coordinateBound_pos`, the two `_empty` theorems | `denominator.mdx` |
| #280 | Rationality of actual intersections; positive denominator ≤ 8M² | `line_equation`, `determinant_ne_zero`, `determinant_bound`, `actual_crossing`, `event_rational_den_bound` | `denominator.mdx` |
| #280 | Finite events, overlap boundaries, point inputs, and height difference ≤ 2M | `event_finite`, `overlap_endpoints_are_events`, `endpoint_mem`, `event_height_difference` | `special-cases.mdx`, `order.mdx` |
| #281 | Separation ≥ 1/(64M⁴) and safety of the concrete coefficient | `rational_separation`, `event_separation`, `safeCoefficient_bounds` | `order.mdx` |
| #281 | Strict lexicographic order preservation, separation of distinct positions, and preservation of coincident positions | `event_lex_order`, `event_x_injective` | `special-cases.mdx` |
| #282 | Commutation with scaling, event coverage and order in original coordinates | `scale_shear`, `integerInput_segment`, `original_event_iff`, `original_positive_order` | `special-cases.mdx` |
| #282 | Complete postconditions for both branches | `chosen_postconditions`, `chosen_nonvertical`, `chosen_zero` | `index.mdx`, `special-cases.mdx` |
| #283 | All declarations and transitive trust dependencies | `BOProof.Trust`, imported by the library entry point | Library checking entry point |

`chosen_postconditions` takes only finite rational input, without additional assumptions about denominator bounds, separation, safety, event coverage, or general position. If a nonzero vertical segment exists, it chooses `1/[256(M+1)^5]` and proves strict order preservation and separation of the x coordinates of distinct event positions. Otherwise it chooses `0` and proves the identity transformation. Both branches prove that every nonzero segment becomes nonvertical, that complete intersections are preserved, and that inverse restoration is valid. The zero-coefficient branch does not claim to separate events with equal x and different y. Zero-length inputs are covered by `closedSegment_self`.

## Proof boundary

This is a kernel check of a mathematical model, not a refinement proof connecting Rust to Lean. It does not cover BO sweep state, completeness of event scheduling, uniqueness of output enumeration, or complexity. It does not change the production shear coefficient or replace universal proofs with finite numerical examples.
