import { describe, expect, it } from 'vitest';
import { getFocusModeLayoutConfig } from './focusModeLayout';

describe('getFocusModeLayoutConfig', () => {
  it('hides detailed sections and enlarges key decision text in focus mode', () => {
    const config = getFocusModeLayoutConfig(true);

    expect(config.showStudyPanels).toBe(false);
    expect(config.showOpponentHistory).toBe(false);
    expect(config.showYakuDetails).toBe(false);
    expect(config.showFullRecommendationDetails).toBe(false);
    expect(config.keyDecisionTextClass).toContain('text-2xl');
  });

  it('shows full yaku and recommendation details in full mode', () => {
    const config = getFocusModeLayoutConfig(false);

    expect(config.showStudyPanels).toBe(true);
    expect(config.showOpponentHistory).toBe(true);
    expect(config.showYakuDetails).toBe(true);
    expect(config.showFullRecommendationDetails).toBe(true);
    expect(config.keyDecisionTextClass).toContain('text-lg');
  });
});
