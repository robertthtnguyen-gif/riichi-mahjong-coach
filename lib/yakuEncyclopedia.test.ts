import { describe, expect, it } from 'vitest';
import { YakuName } from './yaku';
import { getYakuReference, YAKU_REFERENCE_BY_ID, YAKU_REFERENCE_ENTRIES } from './yakuEncyclopedia';

const IMPLEMENTED_YAKU: YakuName[] = [
  'riichi',
  'double-riichi',
  'ippatsu',
  'menzen-tsumo',
  'tanyao',
  'pinfu',
  'iipeikou',
  'yakuhai',
  'haitei',
  'houtei',
  'rinshan-kaihou',
  'chankan',
  'chiitoitsu',
  'ittsu',
  'sanshoku-doujun',
  'chanta',
  'sanshoku-doukou',
  'sanankou',
  'sankantsu',
  'toitoi',
  'honroutou',
  'shousangen',
  'ryanpeikou',
  'honitsu',
  'junchan',
  'chinitsu',
  'kokushi-musou',
  'chuuren-poutou',
  'suuankou',
  'suukantsu',
  'ryuuiisou',
  'chinroutou',
  'tsuuiisou',
  'daisangen',
  'shousuushii',
  'daisuushii',
  'dora',
  'red-dora',
  'ura-dora',
  'kan-dora',
  'kan-ura-dora',
];

describe('yaku encyclopedia', () => {
  it('covers every implemented yaku id exactly once', () => {
    expect(new Set(YAKU_REFERENCE_ENTRIES.map(entry => entry.id)).size).toBe(
      YAKU_REFERENCE_ENTRIES.length
    );
    expect(Object.keys(YAKU_REFERENCE_BY_ID).sort()).toEqual([...IMPLEMENTED_YAKU].sort());
  });

  it('provides complete content for each entry', () => {
    for (const entry of YAKU_REFERENCE_ENTRIES) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.japaneseName.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(10);
      expect(entry.requirements.length).toBeGreaterThan(0);
      expect(entry.example.length).toBeGreaterThan(5);
      expect(entry.strategyTips.length).toBeGreaterThan(0);
    }
  });

  it('allows lookup by yaku id', () => {
    expect(getYakuReference('pinfu').name).toBe('Pinfu');
    expect(getYakuReference('yakuhai').japaneseName).toBe('Yakuhai');
    expect(getYakuReference('chinitsu').hanClosed).toBe(6);
    expect(getYakuReference('kokushi-musou').hanClosed).toBe('yakuman');
  });
});
