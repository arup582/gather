import { test, expect, request } from '@playwright/test';
import type { Page, Locator, APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const seedPassword = process.env.DEV_SEED_PASSWORD;
const webURL = 'http://127.0.0.1:3000';
async function selectOption(_page: Page, control: Locator, name: string) {
  await control.selectOption({ label: name });
}
async function signIn(page: Page, email: string) {
  if (!seedPassword)
    throw new Error('Set DEV_SEED_PASSWORD for the explicit development seed accounts');
  await page.goto('/signin');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(seedPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}
async function mutation(ctx: APIRequestContext, path: string, data?: unknown) {
  const token = await (await ctx.get('/api/auth/csrf')).json();
  return ctx.post('/api' + path, { headers: { [token.headerName]: token.token }, data });
}
async function loginApi(ctx: APIRequestContext, email: string) {
  const token = await (await ctx.get('/api/auth/csrf')).json();
  const r = await ctx.post('/api/auth/login', {
    headers: { [token.headerName]: token.token },
    form: { email, password: seedPassword! },
  });
  expect(r.status()).toBe(204);
}
test('visitor signs up, registers, cancels, registers again, and signs out', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find your next gathering' })).toBeVisible();
  await page.getByRole('link', { name: 'Join Gather' }).click();
  await page.getByLabel('Your name').fill('Browser attendee');
  await page.getByLabel('Email address').fill('browser-' + randomUUID() + '@example.test');
  await page.getByLabel('Password', { exact: true }).fill(randomUUID());
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.locator('.event-card h2 a').first().click();
  await expect(page).toHaveURL(/\/events\/[^/]+$/);
  const detail = page.url();
  await page.getByRole('button', { name: 'Register for this event' }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('You’re registered');
  await page.getByRole('link', { name: 'My registrations', exact: true }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Cancel registration' }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('cancelled');
  await page.goto(detail);
  await page.getByRole('button', { name: 'Register for this event' }).click();
  await page.getByRole('link', { name: 'My registrations', exact: true }).click();
  await expect(page.locator('.registration-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
});
test('organizer creates, edits, publishes and cancels a real event', async ({ page }) => {
  await signIn(page, 'organizer@example.test');
  await page.getByRole('link', { name: 'Manage events', exact: true }).click();
  await page.getByRole('link', { name: 'Create event' }).click();
  const title = 'Browser gathering ' + randomUUID().slice(0, 8);
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page
    .getByLabel('Description', { exact: true })
    .fill('A synthetic event created by a browser workflow test.');
  await page.getByLabel('Venue', { exact: true }).fill('Test studio');
  const local = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await page.getByLabel('Starts at').fill(local(new Date(Date.now() + 86400000)));
  await page.getByLabel('Ends at').fill(local(new Date(Date.now() + 90000000)));
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page.getByRole('button', { name: 'Publish event' })).toBeVisible();
  await page.getByLabel('Venue', { exact: true }).fill('Updated studio');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('Event saved');
  await page.getByRole('button', { name: 'Publish event' }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('published');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Cancel event', exact: true }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('cancelled');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
});
test('organizer checks in an attendee through the live UI', async ({ page }) => {
  const host = await request.newContext({ baseURL: webURL });
  const attendee = await request.newContext({ baseURL: webURL });
  try {
    await loginApi(host, 'organizer@example.test');
    await loginApi(attendee, 'attendee@example.test');
    const start = Date.now() + 5000;
    const create = await mutation(host, '/manage/events', {
      title: 'Live check-in ' + randomUUID().slice(0, 8),
      description: 'Synthetic live event for check-in verification.',
      venue: 'Check-in studio',
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(start + 3600000).toISOString(),
    });
    expect(create.status()).toBe(201);
    const event = await create.json();
    expect((await mutation(host, `/manage/events/${event.id}/publish`)).ok()).toBeTruthy();
    expect((await mutation(attendee, `/events/${event.id}/registrations`)).ok()).toBeTruthy();
    await signIn(page, 'organizer@example.test');
    await expect.poll(() => Date.now(), { timeout: 10000 }).toBeGreaterThan(start);
    await page.goto('/manage/events/' + event.id);
    await page.getByRole('button', { name: 'Check in', exact: true }).click();
    await expect(page.getByText('✓ Checked in')).toBeVisible();
    await page.reload();
    await expect(page.getByText('✓ Checked in')).toBeVisible();
  } finally {
    await host.dispose();
    await attendee.dispose();
  }
});
test('administrator grants and revokes organizer access', async ({ page }) => {
  await signIn(page, 'admin@example.test');
  await page.getByRole('link', { name: 'People', exact: true }).click();
  await selectOption(page, page.getByLabel('Rows per page'), '100');
  const card = page.getByRole('row').filter({ hasText: 'Taylor Attendee' });
  await selectOption(
    page,
    card.getByRole('combobox', { name: 'Role for Taylor Attendee' }),
    'Organizer',
  );
  await card.getByRole('button', { name: 'Save user' }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('updated');
  await expect(card.getByRole('combobox', { name: 'Role for Taylor Attendee' })).toHaveValue(
    'ORGANIZER',
  );
  await selectOption(
    page,
    card.getByRole('combobox', { name: 'Role for Taylor Attendee' }),
    'Attendee',
  );
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/users/') &&
        response.request().method() === 'PATCH' &&
        response.status() === 200,
    ),
    card.getByRole('button', { name: 'Save user' }).click(),
  ]);
  await expect(card.getByRole('combobox', { name: 'Role for Taylor Attendee' })).toHaveValue(
    'ATTENDEE',
  );
  await expect(card.getByRole('button', { name: 'Save user' })).toBeDisabled();
});
test('public layout remains usable at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.event-card').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByLabel('Search events').fill('no matching event ' + randomUUID());
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No upcoming events found')).toBeVisible();
});

test.describe('Next routing', () => {
  test.use({ timezoneId: 'America/New_York' });
  test('Next routes preserve search history and protected deep links', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?q=music');
    await expect(page.getByLabel('Search events')).toHaveValue('music');
    await page.getByLabel('Search events').fill('art');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/q=art/);
    await page.goBack();
    await expect(page.getByLabel('Search events')).toHaveValue('music');
    await page.goto('/registrations');
    await expect(page).toHaveURL(/\/signin\?next=%2Fregistrations/);
    await page.getByLabel('Email address').fill('attendee@example.test');
    await page.getByLabel('Password', { exact: true }).fill(seedPassword!);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/registrations$/);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    const missing = await page.goto('/does-not-exist');
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test('administrator creates an account, manages it in the table, and the new user can sign in', async ({
  page,
}) => {
  const suffix = randomUUID().slice(0, 8);
  const name = 'Managed organizer ' + suffix;
  const email = '000-managed-' + suffix + '@example.test';
  const password = randomUUID();
  await signIn(page, 'admin@example.test');
  await page.getByRole('link', { name: 'People', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
  await page.getByRole('button', { name: '+ Create user' }).click();
  const form = page.getByRole('region', { name: 'Create user' });
  await form.getByLabel('Full name').fill(name);
  await form.getByLabel('Email address').fill(email);
  await form.getByLabel('Password', { exact: true }).fill(password);
  await selectOption(page, form.getByRole('combobox', { name: 'Role', exact: true }), 'Organizer');
  await form.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('created successfully');
  const row = page.getByRole('row').filter({ hasText: email });
  await expect(row.getByLabel('Role for ' + name)).toHaveValue('ORGANIZER');
  await page.reload();
  await expect(row).toBeVisible();
  await row.getByRole('switch', { name: 'Account enabled for ' + name }).click();
  await row.getByRole('button', { name: 'Save user' }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('Permissions updated');
  await expect(row.getByRole('button', { name: 'Save user' })).toBeDisabled();
  await page.reload();
  await expect(row.getByRole('switch', { name: 'Account enabled for ' + name })).not.toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const scroller = page.getByRole('region', { name: 'Users table' });
  expect(await scroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/signin');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.banner[role="alert"]')).toContainText(
    'Email or password is incorrect',
  );
  await signIn(page, 'admin@example.test');
  await page.goto('/admin');
  await row.getByRole('switch', { name: 'Account enabled for ' + name }).click();
  await row.getByRole('button', { name: 'Save user' }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('Permissions updated');
  await expect(row.getByRole('button', { name: 'Save user' })).toBeDisabled();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/signin');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Manage events', exact: true })).toBeVisible();
});

test('tables paginate on the server and retain controls for a single page', async ({ page }) => {
  await signIn(page, 'admin@example.test');
  await page.goto('/admin');
  const users = await (await page.request.get('/api/admin/users?size=100')).json();
  // Three 10-row pages keep Last page enabled after advancing to page two.
  for (let index = users.totalElements; index < 21; index++) {
    const created = await mutation(page.request, '/admin/users', {
      displayName: `Pagination user ${index}`,
      email: `pagination-${randomUUID()}@example.test`,
      password: randomUUID(),
      role: 'ATTENDEE',
    });
    expect(created.status()).toBe(201);
  }
  await page.reload();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(11);
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes('/api/admin/users?page=1&size=10') && response.ok(),
    ),
    page.getByRole('button', { name: 'Next page', exact: true }).click(),
  ]);
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 2 of');
  await expect(page.getByRole('button', { name: 'Last page' })).toBeEnabled();
  await page.getByRole('button', { name: 'Last page' }).click();
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Last page' })).toBeDisabled();
  await page.getByLabel('Go to page').fill('1');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByRole('button', { name: 'First page' })).toBeDisabled();
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes('/api/admin/users?page=0&size=100') && response.ok(),
    ),
    selectOption(page, page.getByLabel('Rows per page'), '100'),
  ]);
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toBeVisible();
  await expect(page.getByLabel('Rows per page')).toHaveValue('100');
  await page.goto('/manage');
  await expect(page.getByRole('region', { name: 'Managed events' })).toBeVisible();
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes('/api/manage/events?page=0&size=20') && response.ok(),
    ),
    selectOption(page, page.getByLabel('Rows per page'), '20'),
  ]);
});

test('appearance settings preserve drafts, persist on the server, and reset cleanly', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/Content Security Policy|violates.*directive|Refused to/.test(message.text()))
      errors.push(message.text());
  });
  await signIn(page, 'admin@example.test');
  await page.goto('/admin');
  await page.getByRole('button', { name: '+ Create user' }).click();
  await page.getByLabel('Full name').fill('Unsaved form');
  const trigger = page.getByRole('button', { name: 'Customize appearance' });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Appearance' });
  await drawer.getByRole('radio', { name: 'Night', exact: true }).check();
  await selectOption(page, drawer.getByRole('combobox', { name: 'Font family' }), 'Humanist sans');
  await selectOption(page, drawer.getByRole('combobox', { name: 'Heading font' }), 'Classic serif');
  const size = drawer.getByRole('slider', { name: 'Font size' });
  await size.focus();
  await size.press('End');
  await drawer.getByRole('slider', { name: 'Line height' }).focus();
  await page.keyboard.press('End');
  await drawer.getByLabel('Custom hex').fill('#7c3aed');
  await drawer.getByRole('radio', { name: 'Compact', exact: true }).check();
  await drawer.getByRole('radio', { name: 'Rounded', exact: true }).check();
  await drawer.getByRole('radio', { name: 'Wide', exact: true }).check();
  await drawer.getByRole('switch', { name: 'Reduce motion' }).click();
  await expect(drawer.getByRole('button', { name: 'Done', exact: true })).toHaveCSS(
    'background-color',
    'rgb(124, 58, 237)',
  );
  await drawer.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel('Full name')).toHaveValue('Unsaved form');
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await expect(page.locator('html')).toHaveCSS('line-height', '36px');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'humanist');

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await expect(page.locator('html')).toHaveAttribute('data-corners', 'round');
  await expect(page.locator('html')).toHaveAttribute('data-width', 'wide');
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await expect(page.getByRole('button', { name: '+ Create user' })).toHaveCSS(
    'background-color',
    'rgb(124, 58, 237)',
  );
  // The first HTML response carries the preference, before hydration runs.
  const html = await (await page.request.get('/admin')).text();
  expect(html).toContain('data-font="humanist"');
  expect(html).toContain('--color-primary:#7c3aed');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({
    fullPage: true,
    animations: 'disabled',
    path: testInfo.outputPath('large-type-mobile.png'),
  });
  await trigger.click();
  await drawer.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(drawer.getByRole('radio', { name: 'Emerald', exact: true })).toBeChecked();
  await expect(size).toHaveValue('16');
  await expect(drawer.getByLabel('Custom hex')).toHaveValue('');
  await expect(drawer.getByRole('switch', { name: 'Reduce motion' })).not.toBeChecked();
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('appearance-mobile.png'),
  });
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'emerald');
  await expect(page.locator('html')).toHaveCSS('font-size', '16px');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await trigger.click();
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('appearance-desktop.png'),
  });
  // A menu inside the drawer remains on top and Escape closes only the menu.
  const font = drawer.getByRole('combobox', { name: 'Font family' });
  await font.click();
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('dropdown-desktop.png'),
  });
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
  await expect(font).toBeFocused();
  await page.keyboard.press('Escape');
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('users-desktop.png') });
  // Native dialogs keep keyboard focus inside, restore it on dismissal, and lock page scrolling.
  await trigger.click();
  const done = drawer.getByRole('button', { name: 'Done', exact: true });
  await done.focus();
  // Native dialogs make background controls inert; browser chrome can still receive Tab focus.
  await trigger.evaluate((element) => element.focus());
  await expect(done).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.getByRole('button', { name: 'Reset defaults' })).toBeFocused();
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await page.mouse.click(20, 200);
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();

  expect(errors).toEqual([]);
});

test('dropdown keyboard selection and large text remain usable on a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Customize appearance' }).click();
  const drawer = page.getByRole('dialog', { name: 'Appearance' });
  const font = drawer.getByRole('combobox', { name: 'Font family' });
  await font.focus();
  await font.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'System sans', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('option', { name: 'Monospace', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(font).toHaveValue('mono');
  await drawer.getByRole('slider', { name: 'Font size' }).focus();
  await page.keyboard.press('End');
  await expect
    .poll(() => drawer.evaluate((element) => element.scrollWidth))
    .toBeLessThanOrEqual(320);
  expect(
    await drawer.locator('.drawer-body').evaluate((element) => element.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await drawer.getByLabel('Custom hex').fill('#ffffgg');
  await expect(drawer.getByLabel('Custom hex')).toHaveAttribute('aria-invalid', 'true');
  await drawer.getByLabel('Custom hex').fill('#ffffff');
  await expect(drawer.getByRole('button', { name: 'Done', exact: true })).toHaveCSS(
    'color',
    'rgb(0, 0, 0)',
  );
  await drawer.getByRole('button', { name: 'Done', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.getByLabel('Email address')).toBeVisible();
});
