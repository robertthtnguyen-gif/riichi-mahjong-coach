'use client';

import { RoundId } from '@/lib/types';

interface RoundSelectorProps {
  value: RoundId | '';
  onChange: (round: RoundId) => void;
}

const ROUND_OPTIONS: Array<{ id: RoundId; label: string }> = [
  { id: 'east-1', label: 'East 1' },
  { id: 'east-2', label: 'East 2' },
  { id: 'east-3', label: 'East 3' },
  { id: 'east-4', label: 'East 4' },
  { id: 'south-1', label: 'South 1' },
  { id: 'south-2', label: 'South 2' },
  { id: 'south-3', label: 'South 3' },
  { id: 'south-4', label: 'South 4' },
];

export function RoundSelector({ value, onChange }: RoundSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">Current Round</label>
      <div className="grid grid-cols-2 gap-2">
        {ROUND_OPTIONS.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
              value === option.id
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
