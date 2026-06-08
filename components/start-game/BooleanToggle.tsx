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
      <div className="grid grid-cols-2 gap-2 sm:flex">
        {([true, false] as const).map(opt => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all sm:px-5 ${
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
