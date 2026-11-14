'use client';
import { useId, type ReactNode } from 'react';
import { GatherFieldset } from './GatherFieldset';
import { GatherInput } from './GatherInput';
export function GatherChoiceGroup<T extends string>({
  label,
  value,
  onValueChange,
  options,
  className = '',
}: {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string; preview?: ReactNode }[];
  className?: string;
}) {
  const name = useId();
  const previews = options.some((option) => option.preview);
  return (
    <GatherFieldset className={`gather-choice-group ${className}`}>
      <legend className="fieldset-legend">{label}</legend>
      <div className="choice-options">
        {options.map((option) =>
          previews ? (
            <label className="card card-border choice-option" key={option.value}>
              {option.preview}
              <span>{option.label}</span>
              <GatherInput
                type="radio"
                name={name}
                aria-label={option.label}
                value={option.value}
                checked={value === option.value}
                onChange={() => onValueChange(option.value)}
              />
            </label>
          ) : (
            <GatherInput
              key={option.value}
              variant="button"
              className="btn btn-sm"
              type="radio"
              name={name}
              aria-label={option.label}
              value={option.value}
              checked={value === option.value}
              onChange={() => onValueChange(option.value)}
            />
          ),
        )}
      </div>
    </GatherFieldset>
  );
}
