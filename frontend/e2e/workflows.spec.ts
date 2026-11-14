import { test, expect, request } from '@playwright/test';
import type { Page, APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const seedPassword = process.env.DEV_SEED_PASSWORD;
const webURL = 'http://127.0.0.1:3000';
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
  const card = page.locator('.user-card').filter({ hasText: 'Taylor Attendee' });
  await card.getByRole('combobox').selectOption('ORGANIZER');
  await card.getByRole('button', { name: 'Save user' }).click();
  await expect(page.locator('.banner[role="status"]')).toContainText('updated');
  await expect(card.getByRole('combobox')).toHaveValue('ORGANIZER');
  await card.getByRole('combobox').selectOption('ATTENDEE');
  await card.getByRole('button', { name: 'Save user' }).click();
  await expect(card.getByRole('combobox')).toHaveValue('ATTENDEE');
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
