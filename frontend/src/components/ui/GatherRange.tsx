'use client';
import { useId, type ComponentProps } from 'react';
import { GatherInput } from './GatherInput';
import { GatherLabel } from './GatherLabel';
export function GatherRange({
  label,
  value,
  unit = '',
  onValueChange,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'id'> & {
  label: string;
  value: number;
  unit?: string;
  onValueChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="gather-range">
      <div className="range-label">
        <GatherLabel htmlFor={id}>{label}</GatherLabel>
        <output htmlFor={id}>
          {value}
          {unit}
        </output>
      </div>
      <GatherInput
        {...props}
        id={id}
        type="range"
        value={value}
        aria-valuetext={`${value}${unit}`}
        onChange={(event) => onValueChange(Number(event.target.value))}
      />
    </div>
  );
}
