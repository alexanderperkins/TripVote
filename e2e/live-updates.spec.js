import { test, expect } from '@playwright/test';
import { createTrip, LISBON_TRIP, newUser, openTrip, signUp } from './support/helpers.js';

// Flow 3 in AGENTS.md: every open client sees changes within ~2 s without a reload.
const LIVE_TIMEOUT = { timeout: 2_000 };

test.describe('live updates on the itinerary (#10)', () => {
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
    member = { context, page: await context.newPage() };
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

    await page.getByRole('link', { name: 'Itinerary' }).click();
    await expect(page.getByRole('status')).toContainText('Live');
    await member.page.goto(page.url());
    await expect(member.page.getByRole('status')).toContainText('Live');
  });

  test.afterEach(async () => {
    await member.context.close();
  });

  function card(page, title) {
    return page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) });
  }

  test('a new activity, an edit and a vote show up for the other Member without a reload', async () => {
    await member.page.getByLabel('Title').fill('Tram 28');
    await member.page.getByLabel('Date').fill('2027-06-10');
    await member.page.getByLabel('Time').fill('15:00');
    await member.page.getByRole('button', { name: 'Add activity' }).click();
    await expect(organizerPage.getByRole('heading', { name: 'Tram 28' })).toBeVisible(LIVE_TIMEOUT);

    await card(member.page, 'Tram 28').getByRole('button', { name: 'Edit' }).click();
    const editForm = member.page
      .locator('form')
      .filter({ has: member.page.getByRole('button', { name: 'Save' }) });
    await editForm.getByLabel('Title').fill('Tram 28 to Graça');
    await editForm.getByRole('button', { name: 'Save' }).click();
    await expect(organizerPage.getByRole('heading', { name: 'Tram 28 to Graça' })).toBeVisible(
      LIVE_TIMEOUT,
    );

    await card(member.page, 'Tram 28 to Graça')
      .getByRole('button', { name: 'Vote for Tram 28 to Graça' })
      .click();
    const organizerCard = card(organizerPage, 'Tram 28 to Graça');
    await expect(organizerCard).toContainText('1 vote', LIVE_TIMEOUT);
    await expect(organizerCard).toContainText('Voted by Casey');
    await expect(
      organizerCard.getByRole('button', { name: 'Vote for Tram 28 to Graça' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('a deleted activity disappears for the other Member without a reload', async () => {
    await organizerPage.getByLabel('Title').fill('Dinner in Alfama');
    await organizerPage.getByLabel('Date').fill('2027-06-11');
    await organizerPage.getByLabel('Time').fill('19:30');
    await organizerPage.getByRole('button', { name: 'Add activity' }).click();
    await expect(member.page.getByRole('heading', { name: 'Dinner in Alfama' })).toBeVisible(
      LIVE_TIMEOUT,
    );

    organizerPage.once('dialog', (dialog) => dialog.accept());
    await card(organizerPage, 'Dinner in Alfama').getByRole('button', { name: 'Delete' }).click();
    await expect(member.page.getByRole('heading', { name: 'Dinner in Alfama' })).toBeHidden(
      LIVE_TIMEOUT,
    );
  });
});
