import { test, expect } from '@playwright/test';
import { createTrip, LISBON_TRIP, newUser, openTrip, signUp } from './support/helpers.js';

// Flow 4 in AGENTS.md: Members mark the days they are free and see where they overlap.
test.describe('marking availability (#11)', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  let organizerPage;
  let member;

  test.beforeEach(async ({ page, browser }) => {
    organizerPage = page;
    await signUp(page, newUser('Jordan'));
    await createTrip(page, LISBON_TRIP);
    await openTrip(page, LISBON_TRIP.name);
    await page.getByRole('button', { name: 'Copy link' }).click();
    const shareLink = await page.evaluate(() => window.navigator.clipboard.readText());

    const context = await browser.newContext();
    member = { context, page: await context.newPage(), shareLink };
    await signUp(member.page, newUser('Casey'));
    await member.page.goto(shareLink);
    await member.page.getByRole('button', { name: 'Request to join' }).click();
    await expect(member.page.getByText('Request sent')).toBeVisible();

    await page.reload();
    await page
      .getByRole('region', { name: 'Join requests' })
      .getByRole('button', { name: 'Approve Casey' })
      .click();
    await expect(page.getByRole('region', { name: 'Members' })).toContainText('Casey');
  });

  test.afterEach(async () => {
    await member.context.close();
  });

  const day = (page, label) =>
    page
      .getByRole('group', { name: 'Trip days' })
      .getByRole('button', { name: new RegExp(`^${label}`) });

  test('Members mark free days, see the overlap and who has not responded', async () => {
    const page = organizerPage;
    await page.getByRole('link', { name: 'Availability' }).click();
    await expect(page).toHaveURL(/\/availability$/);
    await expect(page.getByRole('group', { name: 'Trip days' }).getByRole('button')).toHaveCount(4);
    await expect(page.getByRole('region', { name: 'Waiting on' })).toContainText('Casey');

    await day(page, 'Fri, Jun 11').click();
    await day(page, 'Sat, Jun 12').click();
    await expect(page.getByText('Saved')).toBeVisible();
    await expect(day(page, 'Fri, Jun 11')).toHaveAttribute('aria-pressed', 'true');

    // Casey sees Jordan's days live, then marks an overlapping day.
    await member.page.goto(page.url());
    await expect(day(member.page, 'Fri, Jun 11')).toHaveAccessibleName(/1 of 2 free/);
    await expect(member.page.getByText('Live')).toBeVisible();
    await day(member.page, 'Sat, Jun 12').click();
    await expect(member.page.getByText('Saved')).toBeVisible();

    await expect(day(page, 'Sat, Jun 12')).toHaveAccessibleName(/2 of 2 free.*Best day/);
    await expect(page.getByRole('region', { name: 'Best dates' })).toContainText('Jun 12');
    await expect(page.getByRole('region', { name: 'Waiting on' })).toContainText(
      'Everyone has responded.',
    );

    // Saved on the server, so it is still there after a reload.
    await page.reload();
    await expect(day(page, 'Fri, Jun 11')).toHaveAttribute('aria-pressed', 'true');
    await expect(day(page, 'Thu, Jun 10')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a Viewer who has not joined cannot see availability', async ({ browser }) => {
    const context = await browser.newContext();
    const viewerPage = await context.newPage();
    await signUp(viewerPage, newUser('Riley'));
    const url = organizerPage.url().replace(/\/?$/, '/availability');

    await viewerPage.goto(url);

    await expect(viewerPage.getByRole('alert')).toContainText('You do not have permission');
    await expect(viewerPage.getByRole('group', { name: 'Trip days' })).toHaveCount(0);
    await context.close();
  });
});
