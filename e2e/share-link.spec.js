import { test, expect } from '@playwright/test';
import { createTrip, LISBON_TRIP, logIn, newUser, openTrip, signUp } from './support/helpers.js';

// The organizer copies the link from the trip page; the invitee opens it in their own browser.
async function copyShareLink(page) {
  await openTrip(page, LISBON_TRIP.name);
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('status')).toHaveText('Copied');
  return page.evaluate(() => window.navigator.clipboard.readText());
}

test.describe('share links and the viewer page (#5)', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  let shareLink;

  test.beforeEach(async ({ page }) => {
    await signUp(page, newUser('Jordan'));
    await createTrip(page, LISBON_TRIP);
    shareLink = await copyShareLink(page);
  });

  test('copies an invite link for the trip', async ({ baseURL }) => {
    expect(shareLink).toMatch(new RegExp(`^${baseURL}/join/[A-Za-z0-9_-]+$`));
  });

  test('shows the viewer page to a logged-in invitee', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signUp(page, newUser('Casey'));

    await page.goto(shareLink);

    await expect(page.getByRole('heading', { level: 1, name: LISBON_TRIP.name })).toBeVisible();
    await expect(page.getByText('Organized by Jordan')).toBeVisible();
    await expect(page.getByText('2027-06-10 – 2027-06-13')).toBeVisible();
    await expect(page.getByText(/Members-only/)).toBeVisible();
    const members = page.getByRole('list');
    await expect(members.getByRole('listitem')).toHaveCount(1);
    await expect(members).toContainText('Jordan');
    await context.close();
  });

  test('sends a logged-out invitee to log in and back to the invite', async ({ browser }) => {
    const invitee = newUser('Morgan');
    const context = await browser.newContext();
    const page = await context.newPage();
    await signUp(page, invitee);
    await page.getByRole('button', { name: 'Log out' }).click();

    await page.goto(shareLink);
    await expect(page).toHaveURL('/login');
    await logIn(page, invitee);

    await expect(page).toHaveURL(new URL(shareLink).pathname);
    await expect(page.getByRole('heading', { level: 1, name: LISBON_TRIP.name })).toBeVisible();
    await context.close();
  });

  test('shows an error for an invalid invite link', async ({ page }) => {
    await page.goto('/join/not-a-real-code');
    await expect(page.getByText('This invite link is invalid.')).toBeVisible();
  });
});
