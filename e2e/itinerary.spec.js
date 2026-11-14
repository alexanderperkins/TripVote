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

// The Undo window after Delete (5 s) plus time for the request to finish.
const DELETE_TIMEOUT = { timeout: 8_000 };

test.describe('shared itinerary (#8)', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, newUser('Morgan'));
    await createTrip(page, LISBON_TRIP);
    await openTrip(page, LISBON_TRIP.name);
    await page
      .getByRole('navigation', { name: 'Trip sections' })
      .getByRole('link', { name: 'Itinerary' })
      .click();
    await expect(page).toHaveURL(/\/itinerary$/);
    await expect(page.getByRole('heading', { level: 1, name: LISBON_TRIP.name })).toBeVisible();
  });

  function activityCard(page, title) {
    return page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) });
  }

  function daySection(page, name) {
    return page.getByRole('region', { name });
  }

  test('shows an empty state before the first activity', async ({ page }) => {
    await expect(page.getByText('No activities yet')).toBeVisible();
  });

  test('requires a title, date and time', async ({ page }) => {
    await page.getByRole('button', { name: 'Add activity' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add activity' });
    await dialog.getByLabel('Date').fill('');
    await dialog.getByRole('button', { name: 'Add activity' }).click();

    await expect(dialog.getByText('Enter a title.')).toBeVisible();
    await expect(dialog.getByText('Enter a date.')).toBeVisible();
    await expect(dialog.getByText('Enter a time.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('No activities yet')).toBeVisible();
  });

  test('groups activities by day in chronological order and keeps them after a reload', async ({
    page,
  }) => {
    await addActivity(page, { title: 'Dinner in Alfama', date: '2027-06-11', time: '19:30' });
    await addActivity(page, { title: 'Tram 28', date: '2027-06-10', time: '15:00' });
    await addActivity(page, { title: 'Pastéis de Belém', date: '2027-06-11', time: '09:00' });

    const check = async () => {
      await expect(page.getByRole('heading', { level: 3 })).toHaveText([
        'Tram 28',
        'Pastéis de Belém',
        'Dinner in Alfama',
      ]);
      await expect(
        daySection(page, 'Day 1 · Thu, Jun 10').getByRole('heading', { level: 3 }),
      ).toHaveText(['Tram 28']);
      await expect(
        daySection(page, 'Day 2 · Fri, Jun 11').getByRole('heading', { level: 3 }),
      ).toHaveText(['Pastéis de Belém', 'Dinner in Alfama']);
      await expect(daySection(page, 'Day 1 · Thu, Jun 10')).toContainText('15:00');
    };

    await check();
    await page.reload();
    await check();
  });

  test('shows the location and notes of an activity', async ({ page }) => {
    await page.getByRole('button', { name: 'Add activity' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add activity' });
    await dialog.getByLabel('Title').fill('Tram 28');
    await dialog.getByLabel('Date').fill('2027-06-10');
    await dialog.getByLabel('Time').fill('15:00');
    await dialog.getByLabel('Location').fill('Martim Moniz');
    await dialog.getByLabel('Notes').fill('Go early to get a seat');
    await dialog.getByRole('button', { name: 'Add activity' }).click();
    await expect(dialog).toBeHidden();

    const tram = activityCard(page, 'Tram 28');
    await expect(tram).toContainText('Martim Moniz');
    await expect(tram).toContainText('Go early to get a seat');
  });

  test('edits an activity', async ({ page }) => {
    await addActivity(page, { title: 'Tram 28', date: '2027-06-10', time: '15:00' });

    await openActivityMenu(page, 'Tram 28');
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const editForm = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Save' }) });
    await editForm.getByLabel('Title').fill('Tram 28 to Graça');
    await editForm.getByLabel('Time').fill('16:30');
    await editForm.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { level: 3, name: 'Tram 28 to Graça' })).toBeVisible();
    await expect(daySection(page, 'Day 1 · Thu, Jun 10')).toContainText('16:30');
    await page.reload();
    await expect(daySection(page, 'Day 1 · Thu, Jun 10')).toContainText('Tram 28 to Graça');
    await expect(daySection(page, 'Day 1 · Thu, Jun 10')).toContainText('16:30');
  });

  test('deletes an activity once the Undo window closes', async ({ page }) => {
    await addActivity(page, { title: 'Tram 28', date: '2027-06-10', time: '15:00' });

    const deleted = page.waitForResponse(
      (response) => response.request().method() === 'DELETE' && response.ok(),
      DELETE_TIMEOUT,
    );
    await openActivityMenu(page, 'Tram 28');
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    await expect(page.getByText('Deleted Tram 28')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tram 28' })).toBeHidden();
    await expect(page.getByText('No activities yet')).toBeVisible();
    await deleted;
    await page.reload();
    await expect(page.getByText('No activities yet')).toBeVisible();
  });

  test('a non-member cannot see the itinerary', async ({ page, browser }) => {
    await addActivity(page, { title: 'Tram 28', date: '2027-06-10', time: '15:00' });
    const itineraryUrl = page.url();

    const context = await browser.newContext();
    const stranger = await context.newPage();
    await signUp(stranger, newUser('Sam'));
    await stranger.goto(itineraryUrl);
    await expect(stranger.getByRole('alert')).toContainText('You do not have permission');
    await expect(stranger.getByRole('heading', { name: 'Tram 28' })).toBeHidden();
    await expect(stranger.getByRole('heading', { level: 1, name: LISBON_TRIP.name })).toBeHidden();
    await context.close();
  });
});
