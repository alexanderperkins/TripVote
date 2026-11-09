import { test, expect } from '@playwright/test';
import { createTrip, LISBON_TRIP, newUser, openTrip, signUp } from './support/helpers.js';

// Flow 2 in AGENTS.md: the invitee asks to join from the share link and the Organizer decides.
test.describe('join requests and members (#6)', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  let organizerPage;
  let shareLink;

  test.beforeEach(async ({ page }) => {
    organizerPage = page;
    await signUp(page, newUser('Jordan'));
    await createTrip(page, LISBON_TRIP);
    await openTrip(page, LISBON_TRIP.name);
    await page.getByRole('button', { name: 'Copy link' }).click();
    shareLink = await page.evaluate(() => window.navigator.clipboard.readText());
  });

  async function inviteeRequestsToJoin(browser, name) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signUp(page, newUser(name));
    await page.goto(shareLink);
    await page.getByRole('button', { name: 'Request to join' }).click();
    await expect(page.getByText('Request sent')).toBeVisible();
    return { context, page };
  }

  function region(page, name) {
    return page.getByRole('region', { name });
  }

  test('the Organizer approves a request and the invitee becomes a Member', async ({ browser }) => {
    const invitee = await inviteeRequestsToJoin(browser, 'Casey');

    await organizerPage.reload();
    const requests = region(organizerPage, 'Join requests');
    await expect(requests).toContainText('Casey');
    await requests.getByRole('button', { name: 'Approve Casey' }).click();
    await expect(region(organizerPage, 'Members')).toContainText('Casey');
    await expect(requests).toContainText(/no pending requests/i);

    await invitee.page.reload();
    await invitee.page.getByRole('link', { name: 'Open trip' }).click();
    await expect(
      invitee.page.getByRole('heading', { level: 1, name: LISBON_TRIP.name }),
    ).toBeVisible();
    await expect(invitee.page.getByText('member', { exact: true }).first()).toBeVisible();

    invitee.page.once('dialog', (dialog) => dialog.accept());
    await invitee.page.getByRole('button', { name: 'Leave trip' }).click();
    await expect(invitee.page.getByRole('heading', { name: 'Your trips' })).toBeVisible();
    await expect(
      invitee.page.getByRole('link', { name: new RegExp(LISBON_TRIP.name) }),
    ).toHaveCount(0);
    await invitee.context.close();
  });

  test('the Organizer denies a request', async ({ browser }) => {
    const invitee = await inviteeRequestsToJoin(browser, 'Riley');

    await organizerPage.reload();
    await region(organizerPage, 'Join requests')
      .getByRole('button', { name: 'Deny Riley' })
      .click();
    await expect(region(organizerPage, 'Join requests')).toContainText(/no pending requests/i);
    await expect(region(organizerPage, 'Members')).not.toContainText('Riley');

    await invitee.page.reload();
    await expect(invitee.page.getByRole('button', { name: 'Request to join' })).toBeVisible();
    await invitee.context.close();
  });

  test('the Organizer removes a Member', async ({ browser }) => {
    const invitee = await inviteeRequestsToJoin(browser, 'Taylor');
    await organizerPage.reload();
    await region(organizerPage, 'Join requests')
      .getByRole('button', { name: 'Approve Taylor' })
      .click();

    organizerPage.once('dialog', (dialog) => dialog.accept());
    await region(organizerPage, 'Members').getByRole('button', { name: 'Remove Taylor' }).click();
    await expect(region(organizerPage, 'Members')).not.toContainText('Taylor');

    await invitee.page.goto('/trips');
    await expect(
      invitee.page.getByRole('link', { name: new RegExp(LISBON_TRIP.name) }),
    ).toHaveCount(0);
    await invitee.context.close();
  });
});
