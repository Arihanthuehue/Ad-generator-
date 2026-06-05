'use client';

interface PillSelectProps {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (val: string | string[]) => void;
  multi?: boolean;
  maxSelect?: number;
}

export default function PillSelect({ label, options, value, onChange, multi = false, maxSelect }: PillSelectProps) {
  const selectedArray = Array.isArray(value) ? value : [value];

  const toggleOption = (option: string) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      if (arr.includes(option)) {
        onChange(arr.filter((v) => v !== option));
      } else {
        if (maxSelect && arr.length >= maxSelect) return;
        onChange([...arr, option]);
      }
    } else {
      onChange(option);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#374151]">{label}</label>
      {multi && maxSelect && (
        <span className="text-xs text-[#9CA3AF] ml-2">
          Max {maxSelect} per generation
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedArray.includes(option);
          const isDisabled = multi && maxSelect && !isSelected && selectedArray.length >= maxSelect;

          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              disabled={!!isDisabled}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                isSelected
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : isDisabled
                  ? 'bg-[#F9FAFB] text-[#D1D5DB] border-[#E5E7EB] cursor-not-allowed'
                  : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#111111]'
              }`}
              title={isDisabled ? `Max ${maxSelect} platforms per generation` : undefined}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
