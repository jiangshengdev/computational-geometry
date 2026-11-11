# Shared video foundations

English | [简体中文](README.zh-CN.md)

The line-equation tutorial, shear series, and Bentley–Ottmann series use this directory as needed; actual capabilities depend on each episode's entry points and imports. Each episode still owns its teaching content, storyboard, derivations, specialized diagrams, source text, audio, publication assets, and command entry points.

## Responsibilities and dependencies

- `config/`: shared Remotion production configuration and TypeScript compiler options. Remotion entry points pass `Config` from the locally installed version and explicitly retain output-overwrite and Sequence activity policies. Each episode still maintains its TypeScript type scope, JSON support, and `node_modules` paths.
- `math/`: teaching groups, equals-sign alignment, and row-height calculation for complete groups. The line-equation tutorial retains its text-to-formula strategy, selection across columns, and handling of lines without equals signs; the shear series splits at top-level equals signs.
- `ui/`: KaTeX rendering, formula tables, shear-series mathematical text composition, and subtitle containers. Episodes supply coloring rules, symbol scopes, teaching data, and necessary content. Shared modules do not import an episode's storyboard.
- `speech/`: speech documents, Azure synthesis/alignment, measured-timing checks, subtitle phrase merging and lookup, audio checks, and applicable asset-production flows. Browser code imports only pure timing or subtitle modules; each episode's Node entry point supplies the Azure SDK.
- `checks/`: content validation, general DOM boundary checks, headless Studio checking lifecycle, and shared-source lint. Episodes retain mathematical correctness, specialized diagram, and teaching-reveal checks.
- `tools/`: shared preflight, browser verification, and user-export entry points. See [engineering operations](../../docs/agents/videos/operations.md) for applicability and operation boundaries.

Episodes ⑤ and ⑥ share `checks/ShotLayoutCheck.tsx` and `checks/shot-layout.ts`. The former enumerates reveal, subtitle, animation, and silent states of production pages; the latter manages per-shot checks and failure summaries. Each episode still supplies production scenes and content assertions. `speech/audit-narration.ts` shares per-segment assessment and audio-hash binding; automatic flags do not establish confirmed mispronunciations.

Narration generation is sequential by default; episode ⑥ explicitly selects batches of three segments. Concurrent batches wait for all in-flight requests before reporting failure, retain staged data, and do not publish formal assets until all targets pass. Zero-duration synthesis word times or times beyond the audio end may be remeasured using the existing speech assessment service, preserving original audio and raw service responses. This does not trim audio, infer word times, or relax pronunciation review.

For 48 kHz mono PCM narration longer than 30 seconds, `speech/assessment-chunks.ts` verifies actual silence near measured sentence boundaries, then splits a recognition copy into short chunks of contiguous samples. Formal audio is unchanged. Each chunk retains reference text, sample range, and raw response; recognition times are offset by its starting sample. After merging, full-text, omission, insertion, and pronunciation-review gates still apply. Processing stops if no reliable split point exists.

`tools/export.ts` exports PNG by default; `audio` mode exports PCM WAV from the same timeline. Both modes share browser verification, independent ports, and overwrite prevention. See [user export](../../docs/agents/videos/operations.md#用户导出) for episode integration, independent preflight requirements, and command templates.

Shared modules do not depend on any specific video directory. Episode TypeScript paths and Remotion Rspack configuration let shared browser code use that episode's installed React, KaTeX, and other dependencies, without creating a second runtime or uniformly upgrading Remotion. Commands run from individual video project directories. The shared directory has no separate dependency installation.

`createNarratedLesson` in `ui/NarratedLesson.tsx` shares shot sequencing and complete original-speed audio playback across the shear series and produced Bentley–Ottmann videos. Episodes supply their local Remotion runtime, timeline, visual state, production pages, and audio index, while retaining export names, segment selection, and shot names. `ShotScene` uses `audioEnabled=false` for silent checks. Projects without `audioLeadFrames` retain direct audio playback. The line-equation tutorial retains its two-level chapter structure and overall subtitle track; the Chapter 4 empty project retains its current production stage.

`wordsInTextRange` in `speech/timing.ts` selects overlapping measured words only by source-text range, without changing or inferring service times. Callers still own phrase uniqueness, cursor disambiguation, positive-duration filtering, and failure diagnostics. Shear intuition and coefficient projects reuse the basic orchestration of `createShotTimeline`, retaining their own walking, comparison, and motion-midpoint mappings.

The two Chapter 3 episodes convert checking subtitles through `captionsFromFrames` in `checks/ShotLayoutCheck.tsx` and use `checkTeachingPage` in `checks/dom.ts` to check page boundaries, diagram labels, and retained teaching lines. Episode-specific assertions for decision paths, references, semantic colors, and silence remain local.

Both Chapter 2 episodes use `speech/sentence-plan-tools.ts` to check correspondence among subtitle source sentences, independent narration, and pronunciation text. Semantic sentence records drive checks or generation of 400ms/200ms pauses. Explicit `CaptionPlan` in `speech/timing.ts` supports one formula subtitle corresponding to several natural narration sentences. Both sides must cover the full text character for character in the original order before subtitles are generated from actual word times. Existing projects without a mapping retain their phrase-matching rules, assets, and timing data.

The explicitly user-approved single-letter IPA exception uses `{ letter: "p", ipa: "piː" }`, retaining letter text and generating an English IPA tag. SSML is included in the fingerprint; ordinary letters still default to spelling. This interface does not authorize automatic experiments or pronunciation-method changes.

## Preserved behavioral differences

- The line-equation tutorial rejects narration commas at segment level, returning only text and SSML from speech documents. Shear coefficient and integer-coordinate projects reject commas at full-document level and return fingerprints. The existing shear-intuition constructor gains no comma rejection; new narration must still follow production rules.
- All seven narration projects use `lang="en-US"` with `say-as interpret-as="characters"` for single letters. Explicit `{letter}` values and standalone letters in ordinary strings follow the same rule; full English words and Chinese pinyin annotations remain unchanged. Historical `why` used as Y has been restored to Y. Integer-coordinate and intersection-denominator projects retain dry-run sentence validation.
- Shear intuition does not accept mispronunciation-review exceptions for timestamp repair. Shear coefficient and integer-coordinate projects retain their original human-review policies bound to specific audio.
- The line-equation tutorial retains period masking within spoken formulas and selects timestamps by word start. The shear series retains positive-duration words selected by overlap. Phrase merging, timestamp-result construction, and subtitle lookup during silence are shared.
- Episodes retain subtitle colors, existing diagram labels, and page-emphasis strategies; sharing does not restyle every episode after one example.
- The line-equation tutorial retains its chapter, silent-line, and asset-resumption formats. The shear series shares shot-production flows, using explicit options to preserve timing-data file requirements and differences in early sentence validation.

These options represent real differences among existing callers, not temporary compatibility layers. Changing a policy's meaning requires explicitly handling affected episodes; refactoring must not silently repair unrelated old issues.

Changing letter mode updates SSML fingerprints. Projects that update only synthesis plans while keeping historical audio still use their old timing data. Content checks report mismatches with the new narration plan. Do not rewrite old fingerprints or relax checks to pretend that resynthesis occurred.

`speech/shot-timeline.ts` is shared by the integer-coordinate and intersection-denominator projects, maintaining measured audio, reveals, motion anchors, subtitle continuation, and end-of-page holds. Episodes retain storyboards, subtitles, frame rates, and segment-selection entry points. `TeachingMathLines` supports `defaultMathColor` so the intersection-denominator project can use neutral body formulas with current-step emphasis; omitting it preserves existing callers' colors.

Both Chapter 3 episodes share `math/semantic-colors.ts` and `ui/SemanticMathText.tsx` for explicit formula marks, Chinese keywords, and coloring that does not change mathematical categories. Each episode's `teaching-colors.ts` retains object identities and phrase-emphasis mappings. `TeachingMathLines` receives them through `lineMarks` and `activeMarks`. Callers explicitly keep titles, subtitles, and non-emphasized content neutral; global colors are not inferred from object names.

`checks/layout.ts` accepts an explicit `browserExecutable` so callers can pass a version-verified Headless Shell; the intersection-denominator entry point performs that verification. Existing behavior of old callers that omit it does not prove compliance with the current sole-browser rule.

## Changes and validation

Explanation and derivation pages use `ui/MathLessonPage.tsx` and `ui/TeachingMathLines.tsx`. The old `LessonPage` was deleted with no compatibility export; do not restore or copy it. `TeachingMathLines` supports `wrapText` for long mixed Chinese/math sentences on selected pages. Formula pages without it retain their existing grouping and alignment. Every video project's ESLint configuration, including new projects, must append `componentPolicy` exported by `checks/component-policy.ts`; shared checks use the same policy.

Determine impact from actual callers. After shared-module changes, run necessary checks for all affected projects; changing only one episode's content does not require unrelated project checks. Preserve failure detection without relaxing thresholds or skipping failures for migration.

Run in each affected project (replace the path with its actual directory):

```sh
cd /path/to/video-project
pnpm --config.verify-deps-before-run=false run video:lint
```

This checks episode and shared source, including shared types through the consumer's TypeScript configuration. To check only shared source, run from `videos/shear/<工程>/` (the example below uses `shear-intuition`):

```sh
cd /path/to/computational-geometry/videos/shear/shear-intuition
pnpm --config.verify-deps-before-run=false exec node ../../shared/checks/lint.ts
```

Reuse existing subtitle, timeline, speech, or derivation tests according to impact. The shear series also has `video:narration --dry-run` and `video:check-content`; layout entry points depend on each project's `package.json`. Shared logic does not justify imposing checks on projects lacking those flows. Pure shared-module behavior tests can run from `videos/shear/<工程>/` (the example below uses `shear-intuition`):

```sh
cd /path/to/computational-geometry/videos/shear/shear-intuition
pnpm --config.verify-deps-before-run=false exec node --test ../../shared/math/math-lines.test.ts
```

The line-equation tutorial is one directory level shallower and uses `../shared/` for those two shared paths.

Layout checks use installed browsers, headless sessions, and temporary ports, close processes they create, and do not export video or stills. Refactoring verifiable with existing assets does not call speech services. Content, type, and headless-page checks each establish only their covered behavior. Listening, final-film synchronization, and visible-desktop acceptance must be reported as unperformed when they have not occurred.

Shared code has one maintenance source. New callers supply content or necessary policies rather than copying implementations. New abstractions require actual caller needs; this is not a general video framework.
