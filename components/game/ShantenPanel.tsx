// components/game/ShantenPanel.tsx
'use client';

import { useMemo } from 'react';
import { Tile, Meld } from '@/lib/types';
import { calcShanten, HandType } from '@/lib/shanten';

interface ShantenPanelProps {
  hand: Tile[];
  melds: Meld[];
}

const HAND_TYPE_LABELS: Record<HandType, string> = {
  standard: 'Standard',
  chiitoitsu: 'Seven Pairs',
  kokushi: 'Thirteen Orphans',
};

export function ShantenPanel({ hand, melds }: ShantenPanelProps) {
  const result = useMemo(() => calcShanten(hand, melds), [hand, melds]);

  if (hand.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Current Status
        </h3>
        <p className="text-xs text-gray-600 italic">No tiles in hand.</p>
      </div>
    );
  }

  const { shanten, handType } = result;

  if (shanten === -1) {
    return (
      <div className="rounded-xl border border-yellow-500/60 bg-yellow-900/20 p-4 space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Current Status
        </h3>
        <p className="text-xl font-bold text-yellow-300">Winning Hand</p>
        <p className="text-sm text-yellow-600">{HAND_TYPE_LABELS[handType]}</p>
      </div>
    );
  }

  if (shanten === 0) {
    return (
      <div className="rounded-xl border border-green-500/60 bg-green-900/20 p-4 space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Current Status
        </h3>
        <p className="text-xl font-bold text-green-300">Tenpai</p>
        <p className="text-sm text-green-600">Hand Type: {HAND_TYPE_LABELS[handType]}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-600 bg-gray-800 p-4 space-y-1">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Current Status
      </h3>
      <p className="text-base font-semibold text-white">
        Shanten: <span className="text-blue-400 text-xl font-bold">{shanten}</span>
      </p>
      <p className="text-sm text-gray-400">Hand Type: {HAND_TYPE_LABELS[handType]}</p>
    </div>
  );
}
