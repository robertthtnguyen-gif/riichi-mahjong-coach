import { describe, expect, it } from 'vitest';
import { parseTileNotation } from './tileParser';
import { detectYaku, suggestPossibleYaku, YakuContext, YakuName } from './yaku';
import { Meld, Tile } from './types';

function tiles(input: string): Tile[] {
  return parseTileNotation(input);
}

function tile(input: string): Tile {
  return parseTileNotation(input)[0];
}

function meld(type: Meld['type'], input: string): Meld {
  return { type, tiles: tiles(input) };
}

function ctx(handInput: string, overrides: Partial<YakuContext> = {}): YakuContext {
  return {
    hand: tiles(handInput),
    melds: [],
    seatWind: 'east',
    roundWind: 'south',
    winningTile: null,
    winMethod: 'ron',
    isRiichi: false,
    doubleRiichi: false,
    ippatsu: false,
    isHaitei: false,
    isHoutei: false,
    isRinshan: false,
    isChankan: false,
    doraIndicators: [],
    uraDoraIndicators: [],
    kanDoraIndicators: [],
    kanUraDoraIndicators: [],
    openTanyaoEnabled: true,
    ...overrides,
  };
}

function expectYaku(result: ReturnType<typeof detectYaku>, name: YakuName, han?: number): void {
  const entry = result.yaku.find(yaku => yaku.name === name);
  expect(entry).toBeDefined();
  if (han !== undefined) {
    expect(entry?.han).toBe(han);
  }
}

describe('detectYaku — 1 han yaku', () => {
  it('detects riichi', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        isRiichi: true,
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'riichi', 1);
  });

  it('detects menzen tsumo', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        winMethod: 'tsumo',
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'menzen-tsumo', 1);
  });

  it('detects ippatsu', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        isRiichi: true,
        ippatsu: true,
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'ippatsu', 1);
  });

  it('detects tanyao', () => {
    const result = detectYaku(ctx('234m 345m 456p 678s 66p'));

    expectYaku(result, 'tanyao', 1);
  });

  it('detects pinfu only on a two-sided closed wait', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'pinfu', 1);
  });

  it('detects iipeikou', () => {
    const result = detectYaku(ctx('123m 123m 456p 789s 55p'));

    expectYaku(result, 'iipeikou', 1);
  });

  it('detects yakuhai with seat and round wind doubling correctly', () => {
    const result = detectYaku(
      ctx('EEE 123m 456p 789s 22m', {
        roundWind: 'east',
      })
    );

    expectYaku(result, 'yakuhai', 2);
  });

  it('detects haitei', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        isHaitei: true,
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'haitei', 1);
  });

  it('detects houtei', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        isHoutei: true,
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'houtei', 1);
  });

  it('detects rinshan kaihou', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        winMethod: 'tsumo',
        isRinshan: true,
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'rinshan-kaihou', 1);
  });

  it('detects chankan', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        isChankan: true,
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'chankan', 1);
  });
});

describe('detectYaku — 2 han yaku', () => {
  it('detects double riichi without also counting riichi', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 678s 55p', {
        doubleRiichi: true,
        winningTile: tile('3p'),
      })
    );

    expectYaku(result, 'double-riichi', 2);
    expect(result.yaku.some(yaku => yaku.name === 'riichi')).toBe(false);
  });

  it('detects chiitoitsu', () => {
    const result = detectYaku(ctx('22m 33m 44p 55p 66s 77s WhWh'));

    expectYaku(result, 'chiitoitsu', 2);
  });

  it('detects closed ittsu', () => {
    const result = detectYaku(ctx('123m 456m 789m 234p 55s'));

    expectYaku(result, 'ittsu', 2);
  });

  it('detects open ittsu at 1 han', () => {
    const result = detectYaku(
      ctx('456m 789m 234p 55s', {
        melds: [meld('chi', '123m')],
      })
    );

    expectYaku(result, 'ittsu', 1);
  });

  it('detects closed sanshoku doujun', () => {
    const result = detectYaku(ctx('123m 123p 123s 456m 77p'));

    expectYaku(result, 'sanshoku-doujun', 2);
  });

  it('detects open sanshoku doujun at 1 han', () => {
    const result = detectYaku(
      ctx('123p 123s 456m 77p', {
        melds: [meld('chi', '123m')],
      })
    );

    expectYaku(result, 'sanshoku-doujun', 1);
  });

  it('detects chanta', () => {
    const result = detectYaku(ctx('123m 789m 111p 999s EE'));

    expectYaku(result, 'chanta', 2);
  });

  it('detects open chanta at 1 han', () => {
    const result = detectYaku(
      ctx('789m 111p 999s EE', {
        melds: [meld('chi', '123m')],
      })
    );

    expectYaku(result, 'chanta', 1);
  });

  it('detects sanshoku doukou', () => {
    const result = detectYaku(ctx('111m 111p 111s 456m 77p'));

    expectYaku(result, 'sanshoku-doukou', 2);
  });

  it('detects sanankou', () => {
    const result = detectYaku(
      ctx('111m 222p 333s 456m 77p', {
        winningTile: tile('5m'),
      })
    );

    expectYaku(result, 'sanankou', 2);
  });

  it('detects sankantsu', () => {
    const result = detectYaku(
      ctx('456m 77p', {
        melds: [meld('closed-kan', '1111m'), meld('kan', '2222p'), meld('kan', '3333s')],
      })
    );

    expectYaku(result, 'sankantsu', 2);
  });

  it('detects toitoi', () => {
    const result = detectYaku(ctx('111m 222p 333s RRR 55m'));

    expectYaku(result, 'toitoi', 2);
  });

  it('detects honroutou', () => {
    const result = detectYaku(ctx('111m 999m 111p SSS RR'));

    expectYaku(result, 'honroutou', 2);
  });

  it('detects shousangen', () => {
    const result = detectYaku(ctx('RRR GGG WhWh 123m 123p'));

    expectYaku(result, 'shousangen', 2);
  });
});

describe('detectYaku — 3 and 6 han yaku', () => {
  it('detects ryanpeikou without also counting iipeikou', () => {
    const result = detectYaku(ctx('223344m 556677p 88s'));

    expectYaku(result, 'ryanpeikou', 3);
    expect(result.yaku.some(yaku => yaku.name === 'iipeikou')).toBe(false);
  });

  it('detects honitsu', () => {
    const result = detectYaku(ctx('111m 234m 678m RRR 11m'));

    expectYaku(result, 'honitsu', 3);
  });

  it('detects open honitsu at 2 han', () => {
    const result = detectYaku(
      ctx('678m RRR 11m', {
        melds: [meld('chi', '123m'), meld('chi', '234m')],
      })
    );

    expectYaku(result, 'honitsu', 2);
  });

  it('detects junchan', () => {
    const result = detectYaku(ctx('123m 789m 111p 999s 11s'));

    expectYaku(result, 'junchan', 3);
  });

  it('detects open junchan at 2 han', () => {
    const result = detectYaku(
      ctx('789m 111p 999s 11s', {
        melds: [meld('chi', '123m')],
      })
    );

    expectYaku(result, 'junchan', 2);
  });

  it('detects chinitsu', () => {
    const result = detectYaku(ctx('123m 234m 456m 678m 55m'));

    expectYaku(result, 'chinitsu', 6);
  });

  it('detects open chinitsu at 5 han', () => {
    const result = detectYaku(
      ctx('456m 678m 55m', {
        melds: [meld('chi', '123m'), meld('chi', '234m')],
      })
    );

    expectYaku(result, 'chinitsu', 5);
  });
});

describe('detectYaku — yakuman', () => {
  it('detects kokushi musou', () => {
    const result = detectYaku(ctx('1m 9m 1p 9p 1s 9s E S W N R G Wh Wh'));

    expectYaku(result, 'kokushi-musou', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects chuuren poutou', () => {
    const result = detectYaku(ctx('1112345678999m 5m'));

    expectYaku(result, 'chuuren-poutou', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects suuankou', () => {
    const result = detectYaku(
      ctx('111m 222p 333s RRR 55m', {
        winMethod: 'tsumo',
        winningTile: tile('5m'),
      })
    );

    expectYaku(result, 'suuankou', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects suukantsu', () => {
    const result = detectYaku(
      ctx('55m', {
        melds: [
          meld('closed-kan', '1111m'),
          meld('closed-kan', '2222p'),
          meld('kan', '3333s'),
          meld('kan', 'RRRR'),
        ],
      })
    );

    expectYaku(result, 'suukantsu', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects ryuuiisou', () => {
    const result = detectYaku(ctx('222s 333s 444s 666s GG'));

    expectYaku(result, 'ryuuiisou', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects chinroutou', () => {
    const result = detectYaku(ctx('111m 999m 111p 999p 11s'));

    expectYaku(result, 'chinroutou', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects tsuuiisou', () => {
    const result = detectYaku(ctx('EEE SSS WWW NNN RR'));

    expectYaku(result, 'tsuuiisou', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects daisangen', () => {
    const result = detectYaku(ctx('RRR GGG WhWhWh 123m 11m'));

    expectYaku(result, 'daisangen', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects shousuushii', () => {
    const result = detectYaku(ctx('EEE SSS WWW NN 123m'));

    expectYaku(result, 'shousuushii', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('detects daisuushii', () => {
    const result = detectYaku(ctx('EEE SSS WWW NNN 11m'));

    expectYaku(result, 'daisuushii', 13);
    expect(result.isYakuman).toBe(true);
  });

  it('lets yakuman override normal yaku scoring', () => {
    const result = detectYaku(
      ctx('111m 222p 333s RRR 55m', {
        winMethod: 'tsumo',
        winningTile: tile('5m'),
      })
    );

    expect(result.isYakuman).toBe(true);
    expect(result.yaku.some(yaku => yaku.name === 'toitoi')).toBe(false);
    expect(result.yaku.some(yaku => yaku.name === 'sanankou')).toBe(false);
  });
});

describe('detectYaku — bonuses and warnings', () => {
  it('detects dora', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 789s 55p', {
        winningTile: tile('3p'),
        doraIndicators: tiles('4p'),
      })
    );

    expectYaku(result, 'dora', 3);
  });

  it('detects red dora', () => {
    const result = detectYaku(ctx('123m 4p 0p 6p 789s RRR 22m'));

    expectYaku(result, 'red-dora', 1);
  });

  it('detects ura dora after riichi', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 789s 55p', {
        isRiichi: true,
        winningTile: tile('3p'),
        uraDoraIndicators: tiles('4p'),
      })
    );

    expectYaku(result, 'ura-dora', 3);
  });

  it('detects kan dora', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 789s 55p', {
        winningTile: tile('3p'),
        kanDoraIndicators: tiles('4p'),
      })
    );

    expectYaku(result, 'kan-dora', 3);
  });

  it('detects kan ura dora after riichi', () => {
    const result = detectYaku(
      ctx('123m 456m 345p 789s 55p', {
        isRiichi: true,
        winningTile: tile('3p'),
        kanUraDoraIndicators: tiles('4p'),
      })
    );

    expectYaku(result, 'kan-ura-dora', 3);
  });

  it('warns on a complete dora-only hand', () => {
    const result = detectYaku(
      ctx('123m 456m 789p 999s 11m', {
        doraIndicators: tiles('8s'),
      })
    );

    expectYaku(result, 'dora', 3);
    expect(result.warnings).toContain('No yaku exists for this hand.');
  });

  it('warns on a complete hand with no valid yaku', () => {
    const result = detectYaku(ctx('123m 456m 789p 999s 11m'));

    expect(result.yaku).toEqual([]);
    expect(result.han).toBe(0);
    expect(result.warnings).toContain('No yaku exists for this hand.');
  });
});

describe('detectYaku — rule guards and possible yaku', () => {
  it('does not award closed-only yaku on open hands', () => {
    const result = detectYaku(
      ctx('345p 678s 55p', {
        winningTile: tile('3p'),
        melds: [meld('chi', '123m'), meld('chi', '456m')],
        isRiichi: true,
      })
    );

    expect(result.yaku.some(yaku => yaku.name === 'riichi')).toBe(false);
    expect(result.yaku.some(yaku => yaku.name === 'pinfu')).toBe(false);
    expect(result.yaku.some(yaku => yaku.name === 'iipeikou')).toBe(false);
  });

  it('suggests possible yaku for an incomplete closed hand', () => {
    const result = suggestPossibleYaku(
      ctx('123m 456m 23p 678s 55p')
    );

    expect(result.some(yaku => yaku.name === 'riichi')).toBe(true);
    expect(result.some(yaku => yaku.name === 'pinfu')).toBe(true);
  });
});
