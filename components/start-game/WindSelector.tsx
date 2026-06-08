'use client';

import { WindValue } from '@/lib/types';

interface WindSelectorProps {
  label: string;
  value: WindValue;
  onChange: (wind: WindValue) => void;
  options: WindValue[];
}

const WIND_LABELS: Record<WindValue, string> = {
  east: 'East',
  south: 'South',
  west: 'West',
  north: 'North',
};

export function WindSelector({ label, value, onChange, options }: WindSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {options.map(wind => (
          <button
            key={wind}
            type="button"
            onClick={() => onChange(wind)}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all sm:px-5 ${
              value === wind
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
          >
            {WIND_LABELS[wind]}
          </button>
        ))}
      </div>
    </div>
  );
}
