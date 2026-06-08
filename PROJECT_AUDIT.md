# Project Audit

Date: 2026-06-08

## Executive Summary

This repository is an early-stage deterministic Riichi Mahjong coach built with Next.js 16, TypeScript, and Tailwind CSS. The codebase already includes:

- A start-game flow and a game table UI
- A tile notation parser and validator
- A shanten calculator with Vitest coverage
- A first-pass yaku calculation module
- A client-side reducer for basic game state

The highest-risk gaps are correctness and completeness in Mahjong logic rather than framework setup. `lib/shanten.ts` is the strongest implemented module. `lib/yaku.ts` exists but has important rules gaps. Ukeire, score calculation, and recommendation engines are not implemented. Game state transitions for `chi` / `pon` / `kan` are not rules-safe and currently leave the player hand inconsistent.

## 1. Project Structure

Status: `PARTIAL`

Current structure is small and readable:

- `app/`
  - `page.tsx`: start screen
  - `game/page.tsx`: in-game table
- `components/start-game/`: form controls for initial setup
- `components/game/`: table UI, hand display, actions, opponent tracking
- `hooks/useGameState.ts`: reducer-based client game state
- `lib/`: deterministic Mahjong logic and shared types
- `docs/superpowers/plans/`: implementation plans from the previous agent

Assessment:

- Good separation between UI and domain logic.
- Core Mahjong logic is concentrated in `lib/`, which is the right direction.
- Missing dedicated modules for `ukeire`, scoring, recommendations, defense, and persistence abstractions.
- `README.md` is still the default Next.js scaffold and does not describe the actual project.

## 2. Existing Pages

Status: `PARTIAL`

Implemented pages:

- `/` in `app/page.tsx`
  - Start-game form
  - Collects seat wind, round wind, dealer, dora indicator, red fives, open tanyao, starting hand
- `/game` in `app/game/page.tsx`
  - Three-column game table
  - Displays hand, discards, action controls, shanten panel, opponent tracking

Gaps:

- No results/explanation pages
- No persisted resume flow
- No scoring or win result view
- No recommendation, yaku, ukeire, or defense views integrated into the page

## 3. Existing Components

Status: `PARTIAL`

Implemented start-game components:

- `StartGameForm`
- `HandInput`
- `WindSelector`
- `BooleanToggle`

Implemented in-game components:

- `GameInfo`
- `CurrentHand`
- `DrawTileInput`
- `ActionPanel`
- `ShantenPanel`
- `OpponentTracking`
- `OpponentPanel`
- `TileDisplay`

Placeholder / unused:

- `components/game/RecommendedAction.tsx` is a stub and is not rendered by `app/game/page.tsx`.

Assessment:

- UI coverage is reasonable for a prototype.
- Component structure is serviceable.
- Key analysis panels are still missing from the live UI.

## 4. Existing Game State Management

Status: `BROKEN`

Location:

- `hooks/useGameState.ts`

What exists:

- Reducer-based client state with actions for draw, discard, riichi, player melds, opponent discard, opponent riichi, opponent meld
- `buildInitialState()` creates seat winds and initial config

Critical issues:

- `CHI`, `PON`, and `KAN` add melds but do not remove consumed tiles from the player hand, leaving illegal state after calls. See `hooks/useGameState.ts:72-99`.
- No legality validation for phase, tile counts, call source, closed/open kan type, or riichi eligibility.
- `RIICHI` can be declared without checking tenpai, closed-hand requirement, or score/stick conditions. See `hooks/useGameState.ts:54-70`.
- Opponent state is manual bookkeeping only; meld actions do not adjust tile counts correctly beyond a simple discard decrement path.
- No wall count, turn ownership, draw source, dead wall, honba, riichi sticks, or win resolution.

Assessment:

- The reducer is usable as a UI interaction shell, not as a reliable Mahjong rules state engine.

## 5. Tile Parsing Implementation

Status: `PARTIAL`

Locations:

- `lib/tileParser.ts`
- `lib/tileValidator.ts`

What exists:

- Parses suited groups like `123m`
- Parses winds `E S W N`
- Parses dragons `R G Wh`
- Parses red fives via `0m 0p 0s`
- Validates 13-tile starting hand and single-tile input

Correctness gaps:

- Parser accepts invalid digits because it matches any `[0-9]+`; `10m` would be parsed as `1m` + red `5m`, which is invalid Mahjong notation. See `lib/tileParser.ts:56-63`.
- Parser does not enforce a maximum of four copies of any tile.
- Parser does not enforce red-five multiplicity rules.
- The comment says grouped red-five input like `0m5m` is supported, but the parser only supports a single trailing suit suffix, so that example is false. See `lib/tileParser.ts:34` vs `lib/tileParser.ts:56`.
- Validation checks tile count and red-five toggle only; it does not reject impossible hands. See `lib/tileValidator.ts:24-34`.

Assessment:

- Basic happy-path parsing works.
- Production-ready validation is not there yet.

## 6. Yaku Detection Implementation

Status: `PARTIAL`

Location:

- `lib/yaku.ts`

What exists:

- Confirmed/possible yaku API
- Hand decomposition for standard hands
- Implemented yaku:
  - riichi
  - menzen tsumo
  - pinfu
  - iipeikou
  - tanyao
  - yakuhai
  - toitoi
  - chiitoitsu
  - honitsu
  - chinitsu
  - ittsu
  - sanshoku doujun
  - dora
  - red dora
- `checkMeld()` warning helper for opening the hand

Major gaps / correctness issues:

- Not integrated into the game UI at all.
- No yaku tests exist, despite a detailed plan file for them.
- `openTanyaoEnabled` is collected in setup but never used by `lib/yaku.ts`, so open tanyao rules are currently wrong.
- Pinfu logic is oversimplified and does not actually verify wait shape; it treats any all-sequence non-yakuhai-pair hand as pinfu. See `lib/yaku.ts:163-174`.
- No support for yakuman or many common non-yakuman yaku.
- Complete kokushi hands are not recognized as valid yaku hands; `calcYaku()` falls through standard decomposition and returns a no-yaku warning. See `lib/yaku.ts:372-387`.
- `possibleYaku()` is heuristic and intentionally looser than exact analysis, but today it is the only forward-looking engine and is not tied into recommendation features.

Assessment:

- There is real implementation here, but it is incomplete and not yet trustworthy enough for coaching decisions.

## 7. Shanten Calculation Implementation

Status: `PARTIAL`

Locations:

- `lib/shanten.ts`
- `lib/shanten.test.ts`
- `components/game/ShantenPanel.tsx`

What exists:

- Standard hand shanten via recursive search
- Chiitoitsu shanten
- Kokushi shanten
- Open meld support for standard hands
- Live display in `ShantenPanel`
- Vitest coverage for representative standard / chiitoitsu / kokushi cases

Correctness gaps:

- Chiitoitsu shanten uses only pair count and does not account for distinct tile count, so duplicate-heavy hands can be understated. See `lib/shanten.ts:42-48`.
- Test coverage is narrow; there are no edge-case tests for open melds, duplicate-heavy seven-pairs shapes, or ambiguous standard decompositions.
- No ukeire output, discard comparison, or wait enumeration on top of shanten.

Assessment:

- This is the most complete logic module in the repo.
- It still needs edge-case hardening before it can be treated as authoritative.

## 8. Ukeire Calculation Implementation

Status: `NOT STARTED`

Findings:

- No `ukeire` module exists in `lib/`.
- No ukeire UI panel exists.
- `RecommendedAction.tsx` explicitly says ukeire recommendations are for a future phase.

## 9. Scoring Implementation

Status: `NOT STARTED`

Findings:

- No fu calculator
- No han-to-points conversion
- No dealer/non-dealer payout logic
- No tsumo/ron scoring outputs
- No score-related test coverage

## 10. Strategy Engine Implementation

Status: `NOT STARTED`

Findings:

- No discard recommendation engine
- No chi/pon/kan recommendation engine
- No riichi recommendation engine
- `RecommendedAction.tsx` is only a placeholder and is unused

## 11. Local Storage Implementation

Status: `PARTIAL`

Locations:

- `components/start-game/StartGameForm.tsx:56-58`
- `app/game/page.tsx:136-155`

What exists:

- Setup data, starting hand, and dora tiles are written to `sessionStorage`
- Game page reads that data on load and redirects to `/` if missing

Gaps:

- This is `sessionStorage`, not `localStorage`
- No long-term persistence
- No game save/resume/versioning
- No persistence for in-progress reducer state after play begins
- No storage abstraction or validation of stored payload shape

Assessment:

- Short-lived page-to-page transfer is implemented.
- Actual local persistence is not.

## 12. Testing Coverage

Status: `PARTIAL`

What exists:

- One test file: `lib/shanten.test.ts`
- Coverage includes a small set of standard, chiitoitsu, and kokushi shanten scenarios

Missing coverage:

- Tile parser
- Tile validator
- Yaku detection
- Game state reducer
- Component behavior
- Storage behavior
- Any future scoring / ukeire / strategy logic

Assessment:

- Testing is present, but only for one module.

## 13. Build Status

Status: `PARTIAL`

Result:

- Could not execute `npm run build` in this audit environment because `node`, `npm`, and `npx` are not installed.

Assessment:

- Build script exists in `package.json`.
- Actual build health is unverified.

## 14. TypeScript Errors

Status: `PARTIAL`

Result:

- Could not execute `npx tsc --noEmit` in this audit environment because `node`, `npm`, and `npx` are not installed.

Assessment:

- The codebase appears mostly typed and consistent on read-through.
- Actual TypeScript health is unverified.

## 15. Lint Issues

Status: `PARTIAL`

Result:

- Could not execute `npm run lint` in this audit environment because `node`, `npm`, and `npx` are not installed.

Potential issues visible from code review:

- `components/start-game/HandInput.tsx` suppresses hook dependency linting.
- `components/game/RecommendedAction.tsx` contains emoji text in a placeholder, but this is stylistic rather than a lint concern.

Assessment:

- Lint config exists.
- Actual lint status is unverified.

## Overall Feature Status Table

| Area | Status |
| --- | --- |
| Project structure | `PARTIAL` |
| Existing pages | `PARTIAL` |
| Existing components | `PARTIAL` |
| Existing game state management | `BROKEN` |
| Tile parsing implementation | `PARTIAL` |
| Yaku detection implementation | `PARTIAL` |
| Shanten calculation implementation | `PARTIAL` |
| Ukeire calculation implementation | `NOT STARTED` |
| Scoring implementation | `NOT STARTED` |
| Strategy engine implementation | `NOT STARTED` |
| Local storage implementation | `PARTIAL` |
| Testing coverage | `PARTIAL` |
| Build status | `PARTIAL` |
| TypeScript errors | `PARTIAL` |
| Lint issues | `PARTIAL` |

## Highest-Priority Technical Risks

1. `hooks/useGameState.ts` does not maintain legal hand state after player calls.
2. `lib/tileParser.ts` and `lib/tileValidator.ts` accept impossible tile inputs.
3. `lib/yaku.ts` has correctness gaps large enough to mislead recommendations.
4. `lib/shanten.ts` needs more edge-case validation before downstream engines depend on it.
5. Build, typecheck, and lint health are currently unverified because the required Node toolchain is absent in this environment.
