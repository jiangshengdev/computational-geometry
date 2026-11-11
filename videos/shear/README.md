# Shear transformation video series

English | [简体中文](README.zh-CN.md)

This directory contains seven Remotion video projects about shear transformations in segment intersection. The table follows their existing episode order and links to their Chinese project documentation. Each project owns its content, narration assets, timeline, and production entry points; this overview adds no new lessons or production tasks.

## Episodes

| Episode | Project documentation | Full-episode composition |
| --- | --- | --- |
| ① | [How shearing changes coordinates](shear-intuition/README.md) | `ShearIntuition` |
| ② | [Why the shear coefficient cannot be arbitrary](shear-coefficient/README.md) | `ShearCoefficient` |
| ③ | [Uniform scaling and coordinate bounds](shear-integer-coordinates/README.md) | `ShearIntegerCoordinates` |
| ④ | [From elimination to a denominator bound](shear-intersection-denominator/README.md) | `ShearIntersectionDenominator` |
| ⑤ | [From event separation to a safe coefficient](shear-safe-coefficient/README.md) | `ShearSafeCoefficient` |
| ⑥ | [Special cases and original coordinates](shear-special-cases/README.md) | `ShearSpecialCases` |
| ⑦ | [Neither losing nor adding intersections](shear-preserves-intersections/README.md) | `ShearPreservesIntersections` |

## Working with the series

Read the selected episode's README for installed-tool requirements, available commands, segment compositions, asset locations, and current acceptance status. Shared responsibilities and retained differences are described in the [shared video foundations](../shared/README.md); production operations are in the [engineering operations](../../docs/agents/videos/operations.md) (Chinese), subject to the [video rules](../AGENTS.md) (Chinese). Commands run from individual episode directories, not this series directory. Episodes reuse repository foundations without depending on neighboring episodes.

Related written material starts at the [shear topic](../../docs-site/docs/segment-intersection/shear/index.mdx) (Chinese). The [BO algorithm contract](../../src/algorithms/segment_intersection/bo/README.md) and [BOProof mathematical model](../../BOProof/README.md) document implementation and proof boundaries respectively. Teaching diagrams are not substitutes for actual execution traces.

Existing project files and successful content, audio-decoding, type, or headless-layout checks do not establish full listening, final-film synchronization, visible-desktop acceptance, or publication. Follow each episode's recorded boundaries and CNB tasks; this navigation update neither generates audio nor renders/exports video, and does not change episode acceptance status.
