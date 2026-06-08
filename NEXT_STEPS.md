# Next Steps

Date: 2026-06-08

This plan follows the requested priority order and is based on the current audit state.

## Priority 1

### 1. Tile parser

Goal: make tile input strict, deterministic, and impossible-hand safe.

Planned work:

1. Tighten notation grammar in `lib/tileParser.ts`
   - Reject invalid suited tokens like `10m`, `12x`, `00m`
   - Define exactly which grouped forms are supported
   - Align code comments and UI help text with real parser behavior
2. Add deterministic hand validation in `lib/tileValidator.ts`
   - Enforce max four copies per tile
   - Enforce red-five constraints
   - Reject impossible starting hands and draw inputs
3. Add parser/validator test coverage
   - Happy paths
   - Invalid notation
   - Impossible duplicates
   - Red-five disabled/enabled scenarios

Definition of done:

- Parser accepts only intended notation
- Validator rejects impossible hands
- Parser and validator have direct unit tests

### 2. Yaku detection

Goal: make yaku evaluation reliable enough to support coaching and later scoring.

Planned work:

1. Expand `YakuContext`
   - Include `openTanyaoEnabled`
   - Include enough context for exact rule checks where needed
2. Fix current correctness gaps
   - Enforce open tanyao rule toggle
   - Replace approximate pinfu detection with true wait-shape validation
   - Decide explicit scope for yakuman support and implement or intentionally exclude it
3. Add full test coverage for the currently implemented yaku
   - Confirmed yaku
   - Possible yaku
   - No-yaku warnings
   - `checkMeld()` behavior
4. Integrate yaku output into the game UI
   - Add a visible yaku panel
   - Show confirmed vs possible yaku
   - Show no-yaku warnings clearly

Definition of done:

- All currently supported yaku are tested
- Rule toggles are respected
- Yaku output is visible in the app

### 3. Shanten calculation

Goal: harden the current engine so later ukeire and recommendation work can trust it.

Planned work:

1. Review chiitoitsu formula and fix distinct-tile handling
2. Add more edge-case tests
   - Duplicate-heavy seven-pairs shapes
   - Open meld scenarios
   - Ambiguous standard-hand decompositions
   - 13-tile and 14-tile boundary cases
3. Separate internal helpers if needed for reuse by ukeire

Definition of done:

- Shanten outputs are validated by a broader test matrix
- Edge-case bugs are addressed before building downstream logic

## Priority 2

### 4. Ukeire calculation

Goal: enumerate improving tiles and improve/discard comparisons deterministically.

Planned work:

1. Create `lib/ukeire.ts`
2. Enumerate tile additions against the shanten engine
3. Track remaining tile counts from visible information
4. Add tests for tenpai, 1-shanten, and open-hand cases
5. Add a UI panel for improving tiles and counts

### 5. Score calculation

Goal: compute exact points from complete hands.

Planned work:

1. Define scoring input/output types
2. Implement fu calculation
3. Convert han + fu to base points and final points
4. Handle dealer/non-dealer and tsumo/ron
5. Add score tests covering common scoring bands

## Priority 3

### 6. Discard recommendation engine

Goal: rank discards using shanten, ukeire, and yaku prospects.

Planned work:

1. Create a deterministic evaluator for each discard candidate
2. Use shanten delta as the first filter
3. Use ukeire size and yaku viability as tie-breakers
4. Surface rationale in the UI

### 7. Chi/Pon/Kan recommendation engine

Goal: advise whether calling improves the hand without killing win conditions.

Planned work:

1. First fix reducer/state legality for calls
2. Evaluate post-call shanten, ukeire, and yaku access
3. Use `checkMeld()` only as one input, not the whole decision
4. Add explicit warnings for dead-open/no-yaku paths

### 8. Riichi recommendation engine

Goal: recommend riichi vs dama using deterministic heuristics.

Planned work:

1. Detect legal riichi states
2. Estimate hand value and wait quality
3. Account for dealer status and visible danger
4. Explain why riichi is recommended or not

## Priority 4

### 9. Opponent tracking

Goal: move from manual tile logging to useful state for defense.

Planned work:

1. Extend opponent event tracking
2. Store discard order, riichi turn, open meld metadata
3. Track visible tiles centrally

### 10. Defence against riichi

Goal: support safe defensive decisions after enemy riichi.

Planned work:

1. Implement basic defensive mode triggers
2. Detect immediate riichi threats
3. Prefer safe discards when hand value is low

### 11. Safe tile analysis

Goal: classify genbutsu and basic suji/kabe safety deterministically.

Planned work:

1. Identify genbutsu from tracked discards
2. Add simple suji analysis
3. Add basic visible-wall and kabe signals
4. Expose safety labels in discard recommendations

## Cross-Cutting Work

These should happen alongside the priority items above.

1. Fix `hooks/useGameState.ts`
   - Remove consumed tiles from hand on calls
   - Enforce legal transitions
   - Represent kan types correctly
2. Replace `sessionStorage` transfer with a real persistence decision
   - Either commit to `localStorage` for resume support or keep session-only intentionally
3. Update `README.md`
   - Document notation, features, scripts, and project status
4. Restore local verification workflow
   - Install Node toolchain in the environment
   - Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`

## Recommended Execution Order

1. Fix parser and validator correctness.
2. Harden shanten correctness and expand tests.
3. Finish and test yaku detection, then expose it in the UI.
4. Repair game state transitions for calls and riichi legality.
5. Build ukeire on top of trusted shanten.
6. Build scoring on top of trusted yaku.
7. Add recommendation engines.
8. Extend opponent/defense analysis.
