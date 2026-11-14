'use client';
import { useEffect, useId, useState } from 'react';
import { GatherButton } from './GatherButton';
import { GatherInput } from './GatherInput';
import { GatherLabel } from './GatherLabel';
import { GatherIcon } from './GatherIcon';
import { isHexColor } from '../../theme/config';
const colors = [
  { value: 'theme', label: 'Theme default', name: 'default' },
  { value: '#168565', label: 'Jade', name: 'jade' },
  { value: '#2563eb', label: 'Blue', name: 'blue' },
  { value: '#7c3aed', label: 'Violet', name: 'violet' },
  { value: '#c2410c', label: 'Terracotta', name: 'terracotta' },
  { value: '#be185d', label: 'Rose', name: 'rose' },
] as const;
export function GatherColorPicker({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value === 'theme' ? '' : value);
  useEffect(() => setDraft(value === 'theme' ? '' : value), [value]);
  const invalid = draft !== '' && !isHexColor(draft);
  return (
    <div className="gather-color-picker">
      <div className="accent-swatches" role="group" aria-label="Accent color">
        {colors.map((color) => (
          <GatherButton
            key={color.value}
            variant="secondary"
            type="button"
            className={`btn-circle accent-swatch swatch-${color.name}`}
            aria-label={color.label}
            title={color.label}
            aria-pressed={value === color.value}
            onClick={() => onValueChange(color.value)}
          >
            <GatherIcon name={color.value === 'theme' ? 'palette' : 'check'} />
          </GatherButton>
        ))}
      </div>
      <div className="custom-color">
        <GatherInput
          type="color"
          aria-label="Custom accent color"
          value={isHexColor(value) ? value : '#168565'}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <GatherLabel htmlFor={id}>Custom hex</GatherLabel>
        <GatherInput
          id={id}
          className="hex-input"
          placeholder="#168565"
          value={draft}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (isHexColor(next)) onValueChange(next);
            if (next === '') onValueChange('theme');
          }}
        />
      </div>
      {invalid && (
        <p className="field-error" id={`${id}-error`}>
          Use # followed by six hex digits.
        </p>
      )}
    </div>
  );
}
