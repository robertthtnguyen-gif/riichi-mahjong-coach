# Coverage Report

## Deterministic Test Coverage

Validated locally with:

```bash
node node_modules/vitest/vitest.mjs run
```

Current result:
- Test files: 4 passed
- Tests: 74 passed

Yaku-focused coverage:
- `lib/yaku.test.ts`
- 52 deterministic yaku-engine tests
- Includes every required yaku and bonus item from `YAKU_COVERAGE.md`
- Includes no-yaku warning coverage
- Includes yakuman override coverage
- Includes open/closed reduction coverage

Supporting engine coverage:
- `lib/shanten.test.ts`
- `lib/tileEngine.test.ts`
- `lib/handAdvisor.test.ts`

## Tooling Note

`vitest --coverage` currently does not run in this repository because the V8 coverage provider package is not installed:

```text
MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'
```

Because of that, this project currently uses:
- checked-in coverage audit: `YAKU_COVERAGE.md`
- deterministic test suite counts from `vitest run`

If you want HTML / line-by-line coverage next, add the missing provider package and rerun:

```bash
node node_modules/vitest/vitest.mjs run --coverage
```
