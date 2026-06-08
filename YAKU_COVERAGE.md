# Yaku Coverage Audit

This file is the source of truth for the deterministic WRC-style yaku engine in `lib/yaku.ts`.

## Audit Summary

Previous engine state before the rewrite:
- Covered only a small subset of yaku.
- Did not model winning-tile wait shape for real `pinfu`.
- Did not model `ippatsu`, `double-riichi`, `haitei`, `houtei`, `rinshan kaihou`, or `chankan`.
- Did not distinguish concealed vs open triplets correctly for `sanankou` / `suuankou`.
- Did not support most 2-han yaku or most yakuman.
- Treated some complete hands too loosely and did not implement yakuman override correctly.
- Included an AI photo-recognition path, which was removed to satisfy project rules.

Current engine status after the rewrite:
- All required yaku below are implemented deterministically in TypeScript.
- Dora are treated as bonus only, not real yaku.
- Complete no-yaku hands produce a warning.
- Yakuman override normal han scoring.

## Coverage Table

| Yaku | Status | Notes |
| --- | --- | --- |
| Riichi | COMPLETE | Closed only |
| Menzen Tsumo | COMPLETE | Closed self-draw only |
| Ippatsu | COMPLETE | Requires riichi state flag |
| Tanyao | COMPLETE | Deterministic simple-tile check |
| Pinfu | COMPLETE | Closed only, valueless pair, ryanmen wait required |
| Iipeikou | COMPLETE | Closed only |
| Yakuhai | COMPLETE | Dragons, seat wind, round wind; seat+round wind stacks to 2 han |
| Haitei | COMPLETE | Context flag |
| Houtei | COMPLETE | Context flag |
| Rinshan Kaihou | COMPLETE | Context flag |
| Chankan | COMPLETE | Context flag |
| Double Riichi | COMPLETE | Closed only, replaces riichi |
| Chitoitsu | COMPLETE | Compared against standard interpretation when both are possible |
| Ittsu | COMPLETE | 2 closed / 1 open |
| Sanshoku Doujun | COMPLETE | 2 closed / 1 open |
| Chanta | COMPLETE | 2 closed / 1 open |
| Sanshoku Doukou | COMPLETE | Standard triplet/quad pattern check |
| Sanankou | COMPLETE | Concealed-triplet logic accounts for ron on triplet completion |
| Sankantsu | COMPLETE | Three quads |
| Toitoi | COMPLETE | All triplets/quads |
| Honroutou | COMPLETE | Terminals and honours only |
| Shousangen | COMPLETE | Two dragon triplets/quads plus dragon pair |
| Ryanpeikou | COMPLETE | Closed only, suppresses iipeikou |
| Honitsu | COMPLETE | 3 closed / 2 open |
| Junchan | COMPLETE | 3 closed / 2 open |
| Chinitsu | COMPLETE | 6 closed / 5 open |
| Kokushi Musou | COMPLETE | Yakuman |
| Chuuren Poutou | COMPLETE | Yakuman, closed only |
| Suuankou | COMPLETE | Yakuman, concealed-triplet win handling implemented |
| Suukantsu | COMPLETE | Yakuman |
| Ryuuiisou | COMPLETE | Yakuman |
| Chinroutou | COMPLETE | Yakuman |
| Tsuuiisou | COMPLETE | Yakuman |
| Daisangen | COMPLETE | Yakuman |
| Shousuushii | COMPLETE | Yakuman |
| Daisuushii | COMPLETE | Yakuman |
| Dora | COMPLETE | Bonus only |
| Aka Dora / Red Dora | COMPLETE | Bonus only |
| Ura Dora | COMPLETE | Only after riichi / double riichi |
| Kan Dora | COMPLETE | Bonus only |
| Kan Ura Dora | COMPLETE | Only after riichi / double riichi |

## UI Coverage

Current game UI now displays:
- Confirmed yaku
- Possible yaku
- Han value
- No-yaku warning

Relevant component:
- `components/game/YakuPanel.tsx`

## Test Coverage

Primary deterministic yaku suite:
- `lib/yaku.test.ts`

The suite includes:
- Positive coverage for every required yaku
- Open/closed han reduction checks
- Closed-only invalidation checks
- Dora-only no-yaku warning checks
- Yakuman override checks
