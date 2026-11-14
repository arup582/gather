import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GatherSelect } from '../components/ui/GatherSelect';
import {
  readAppearance,
  defaultAppearance,
  appearanceCSS,
  accentForeground,
} from '../theme/config';

test('appearance cookies reject invalid settings and CSS injection, preserving valid preferences', () => {
  expect(readAppearance('broken')).toEqual(defaultAppearance);
  expect(readAppearance(undefined, 'night').theme).toBe('night');
  const appearance = readAppearance(
    encodeURIComponent(
      JSON.stringify({
        theme: 'night',
        font: 'serif',
        fontSize: 999,
        accent: '#fff;}body{display:none}',
        reducedMotion: 'true',
      }),
    ),
  );
  expect(appearance).toMatchObject({
    theme: 'night',
    font: 'serif',
    fontSize: 16,
    accent: 'theme',
    reducedMotion: false,
  });
  expect(appearanceCSS(appearance)).not.toContain('display');
  expect(accentForeground('#ffffff')).toBe('#000000');
  expect(accentForeground('#000000')).toBe('#ffffff');
});

test('dropdown keeps native form values and ignores disabled choices', async () => {
  const submitted = vi.fn();
  function Example() {
    const [value, setValue] = useState('a');
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted(new FormData(event.currentTarget).get('role'));
        }}
      >
        <GatherSelect
          name="role"
          aria-label="Role"
          value={value}
          onValueChange={setValue}
          required
          options={[
            { value: 'a', label: 'Attendee' },
            { value: 'b', label: 'Administrator', disabled: true },
            { value: 'c', label: 'Organizer' },
          ]}
        />
        <button>Save</button>
      </form>
    );
  }
  render(<Example />);
  const actor = userEvent.setup();
  const select = screen.getByRole('combobox', { name: 'Role' });
  expect(screen.getByRole('option', { name: 'Administrator' })).toBeDisabled();
  await actor.selectOptions(select, 'b');
  expect(select).toHaveValue('a');
  await actor.selectOptions(select, 'c');
  await actor.click(screen.getByRole('button', { name: 'Save' }));
  expect(submitted).toHaveBeenCalledWith('c');
});
