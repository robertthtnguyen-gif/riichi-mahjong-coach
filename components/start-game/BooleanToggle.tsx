'use client';

interface BooleanToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanToggle({ label, value, onChange }: BooleanToggleProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex gap-2">
        {([true, false] as const).map(opt => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-5 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
              value === opt
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
          >
            {opt ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}
