'use client';
import { useState } from 'react';
import {
  GatherButton,
  GatherChoiceGroup,
  GatherDrawer,
  GatherHeading,
  GatherIcon,
  GatherLabel,
  GatherRange,
  GatherSelect,
  GatherText,
  GatherToggle,
  GatherColorPicker,
} from '../components/ui';
import { themes, fonts, defaultAppearance, normalizeAppearance, type Appearance } from './config';
import { applyAppearance } from './applyAppearance';
export function GatherThemePicker({ initialAppearance }: { initialAppearance: Appearance }) {
  const [appearance, setAppearance] = useState(initialAppearance);
  function update(patch: Partial<Appearance>) {
    const next = normalizeAppearance({ ...appearance, ...patch });
    setAppearance(next);
    applyAppearance(next);
  }
  return (
    <GatherDrawer
      title="Appearance"
      description="Make Gather feel like your space. Changes save automatically on this browser."
      trigger={
        <GatherButton
          variant="secondary"
          className="btn-square"
          aria-label="Customize appearance"
          title="Customize appearance"
        >
          <GatherIcon name="palette" />
        </GatherButton>
      }
      footer={
        <GatherButton variant="secondary" onClick={() => update(defaultAppearance)}>
          <GatherIcon name="reset" />
          Reset defaults
        </GatherButton>
      }
    >
      <section className="appearance-section">
        <GatherChoiceGroup
          label="Color theme"
          value={appearance.theme}
          onValueChange={(theme) => update({ theme })}
          className="theme-choices"
          options={themes.map((theme) => ({
            value: theme.id,
            label: theme.name,
            preview: (
              <span className="theme-preview" data-theme={theme.id} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            ),
          }))}
        />
        <GatherText className="setting-hint">
          {themes.find((theme) => theme.id === appearance.theme)?.description}. Choose an accent
          below to make it yours.
        </GatherText>
        <GatherHeading level={3}>Accent color</GatherHeading>
        <GatherColorPicker
          value={appearance.accent}
          onValueChange={(accent) => update({ accent })}
        />
      </section>
      <section className="appearance-section" aria-labelledby="typography-title">
        <GatherHeading level={3} id="typography-title">
          Typography
        </GatherHeading>
        <div className="appearance-fonts">
          <GatherLabel>
            Font family
            <GatherSelect
              aria-label="Font family"
              value={appearance.font}
              options={fonts}
              onValueChange={(font) => update({ font: font as Appearance['font'] })}
            />
          </GatherLabel>
          <GatherLabel>
            Headings
            <GatherSelect
              aria-label="Heading font"
              value={appearance.headingFont}
              options={[
                { value: 'body', label: 'Match body' },
                { value: 'serif', label: 'Classic serif' },
              ]}
              onValueChange={(headingFont) =>
                update({ headingFont: headingFont as Appearance['headingFont'] })
              }
            />
          </GatherLabel>
        </div>
        <GatherRange
          label="Font size"
          min={14}
          max={20}
          step={1}
          value={appearance.fontSize}
          unit="px"
          onValueChange={(fontSize) => update({ fontSize })}
        />
        <GatherRange
          label="Line height"
          min={1.4}
          max={1.8}
          step={0.05}
          value={Number(appearance.lineHeight.toFixed(2))}
          onValueChange={(lineHeight) => update({ lineHeight })}
        />
        <div className="card card-border panel type-preview">
          <span className="preview-eyebrow">LIVE PREVIEW</span>
          <GatherHeading level={3}>A place to come together.</GatherHeading>
          <GatherText>Find your people. Make a little room for something memorable.</GatherText>
          <span className="badge badge-primary">Community</span>
        </div>
      </section>
      <section className="appearance-section" aria-labelledby="layout-title">
        <GatherHeading level={3} id="layout-title">
          Layout & shape
        </GatherHeading>
        <GatherChoiceGroup
          label="Density"
          value={appearance.density}
          onValueChange={(density) => update({ density })}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
        <GatherChoiceGroup
          label="Corners"
          value={appearance.corners}
          onValueChange={(corners) => update({ corners })}
          options={[
            { value: 'theme', label: 'Theme' },
            { value: 'square', label: 'Square' },
            { value: 'soft', label: 'Soft' },
            { value: 'round', label: 'Rounded' },
          ]}
        />
        <GatherChoiceGroup
          label="Content width"
          value={appearance.width}
          onValueChange={(width) => update({ width })}
          options={[
            { value: 'focused', label: 'Focused' },
            { value: 'wide', label: 'Wide' },
            { value: 'full', label: 'Full' },
          ]}
        />
      </section>
      <section className="appearance-section motion-setting">
        <div>
          <GatherHeading level={3}>Reduce motion</GatherHeading>
          <GatherText className="setting-hint">
            Your system's reduced motion setting is always respected.
          </GatherText>
        </div>
        <GatherToggle
          checked={appearance.reducedMotion}
          onCheckedChange={(reducedMotion) => update({ reducedMotion })}
          label="Reduce motion"
        />
      </section>
    </GatherDrawer>
  );
}
