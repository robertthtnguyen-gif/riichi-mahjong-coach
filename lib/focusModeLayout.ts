export interface FocusModeLayoutConfig {
  showStudyPanels: boolean;
  showOpponentHistory: boolean;
  showYakuDetails: boolean;
  showFullRecommendationDetails: boolean;
  keyDecisionTextClass: string;
  actionButtonClass: string;
}

export function getFocusModeLayoutConfig(focusMode: boolean): FocusModeLayoutConfig {
  if (focusMode) {
    return {
      showStudyPanels: false,
      showOpponentHistory: false,
      showYakuDetails: false,
      showFullRecommendationDetails: false,
      keyDecisionTextClass: 'text-2xl sm:text-3xl',
      actionButtonClass: 'px-2 py-3.5 text-[11px]',
    };
  }

  return {
    showStudyPanels: true,
    showOpponentHistory: true,
    showYakuDetails: true,
    showFullRecommendationDetails: true,
    keyDecisionTextClass: 'text-lg sm:text-xl',
    actionButtonClass: 'px-2 py-3 text-[11px]',
  };
}
