import { test, expect } from '@playwright/test';
import {
  addActivity,
  createTrip,
  LISBON_TRIP,
  newUser,
  openActivityMenu,
  openTrip,
  signUp,
} from './support/helpers.js';

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
    await addActivity(member.page, { title: 'Tram 28', date: '2027-06-10', time: '15:00' });
    await expect(organizerPage.getByRole('heading', { name: 'Tram 28' })).toBeVisible(LIVE_TIMEOUT);
    await expect(organizerPage.getByText('Casey added Tram 28')).toBeVisible(LIVE_TIMEOUT);
    // The author's automatic vote reaches the other Member too.
    await expect(card(organizerPage, 'Tram 28')).toContainText('Voted by Casey', LIVE_TIMEOUT);

    await openActivityMenu(member.page, 'Tram 28');
    await member.page.getByRole('menuitem', { name: 'Edit' }).click();
    const editForm = member.page
      .locator('form')
      .filter({ has: member.page.getByRole('button', { name: 'Save' }) });
    await editForm.getByLabel('Title').fill('Tram 28 to Graça');
    await editForm.getByRole('button', { name: 'Save' }).click();
    await expect(organizerPage.getByRole('heading', { name: 'Tram 28 to Graça' })).toBeVisible(
      LIVE_TIMEOUT,
    );

    await card(organizerPage, 'Tram 28 to Graça')
      .getByRole('button', { name: 'Vote for Tram 28 to Graça' })
      .click();
    const memberCard = card(member.page, 'Tram 28 to Graça');
    await expect(memberCard).toContainText('2 votes', LIVE_TIMEOUT);
    await expect(memberCard).toContainText('Voted by Casey, Jordan');
    await expect(member.page.getByText('Jordan voted for Tram 28 to Graça')).toBeVisible();
    await expect(
      memberCard.getByRole('button', { name: 'Vote for Tram 28 to Graça' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('a deleted activity disappears for the other Member without a reload', async () => {
    await addActivity(organizerPage, {
      title: 'Dinner in Alfama',
      date: '2027-06-11',
      time: '19:30',
    });
    await expect(member.page.getByRole('heading', { name: 'Dinner in Alfama' })).toBeVisible(
      LIVE_TIMEOUT,
    );

    await openActivityMenu(organizerPage, 'Dinner in Alfama');
    await organizerPage.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(organizerPage.getByText('Deleted Dinner in Alfama')).toBeVisible();
    // The delete is sent once the 5-second Undo window closes, then reaches others live.
    await expect(member.page.getByRole('heading', { name: 'Dinner in Alfama' })).toBeHidden({
      timeout: 5_000 + LIVE_TIMEOUT.timeout,
    });
  });

  test('Undo keeps a deleted activity for everyone', async () => {
    await addActivity(organizerPage, { title: 'Fado night', date: '2027-06-12', time: '21:00' });
    await openActivityMenu(organizerPage, 'Fado night');
    await organizerPage.getByRole('menuitem', { name: 'Delete' }).click();
    await organizerPage.getByRole('button', { name: 'Undo' }).click();

    await organizerPage.waitForTimeout(6_000);
    await member.page.reload();
    await expect(member.page.getByRole('heading', { name: 'Fado night' })).toBeVisible();
    await expect(organizerPage.getByRole('heading', { name: 'Fado night' })).toBeVisible();
  });
});
