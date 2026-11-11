# Bentley–Ottmann shared video resources

English | [简体中文](README.zh-CN.md)

Each episode independently maintains its content, timeline, and production entry points. See individual project READMEs for commands.

## Colors

[colors.ts](colors.ts) reads the light theme and a few background shades from the [shared project palette](../../shared/colors/README.md) for four episodes. It stores only color references and case mappings, without depending on specific video teaching content or duplicating upstream HEX values.

- `intersection-goals` and `pairwise-baseline`: inputs 1–4 use blue, orange, purple, and green respectively. Objects and semantic cues share `inputColors`.
- `sweep-neighbors`: A is blue, B orange, C purple, and D green, matching the article example.
- `why-neighbors`: concrete examples retain A/C colors; the general proof uses blue U, orange V, and purple W, matching article figures. Endpoint quantities use blue/orange; differences and derived results use purple.
- Local emphasis uses amber; pair and emphasis backgrounds use light shades from the corresponding v3 color families.

Existing page backgrounds, body text, subtitles, and other neutral colors remain unchanged. Color integration changes neither layout, progressive reveals, cue timing, narration, nor audio. This directory uses a fixed light theme without adding theme switching. Type and component checks do not establish final-film or visible-desktop acceptance.
