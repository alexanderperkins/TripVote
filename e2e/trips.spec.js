import { test, expect } from '@playwright/test';
import { createTrip, LISBON_TRIP, newUser, openTrip, signUp } from './support/helpers.js';

test.describe('create, view, edit and delete trips (#4)', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, newUser('Riley'));
  });

  test('shows an empty state before the first trip', async ({ page }) => {
    await expect(page.getByText('No trips yet')).toBeVisible();
  });

  test('creates a trip and shows it on the dashboard as Organizer', async ({ page }) => {
    await createTrip(page, LISBON_TRIP);

    const card = page.getByRole('link', { name: /Lisbon Weekend/ });
    await expect(card).toContainText('Lisbon, Portugal');
    await expect(card).toContainText('Organizer');
    await expect(card).toContainText('Jun 10, 2027');
    await expect(card).toContainText('Jun 13, 2027');
    await expect(card).toContainText('1 member');
    await expect(page.getByText('No trips yet')).toBeHidden();
  });

  test('keeps the trip after a reload', async ({ page }) => {
    await createTrip(page, LISBON_TRIP);
    await page.reload();
    await expect(page.getByRole('link', { name: /Lisbon Weekend/ })).toBeVisible();
  });

  test('rejects an end date before the start date', async ({ page }) => {
    await page.getByRole('button', { name: 'New trip' }).click();
    const dialog = page.getByRole('dialog', { name: 'New trip' });
    await dialog.getByLabel('Destination').fill('Nowhere');
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.getByLabel('Start date').fill('2027-06-13');
    await dialog.getByLabel('End date').fill('2027-06-10');
    await dialog.getByRole('button', { name: 'Next' }).click();

    await expect(dialog.getByText("End date can't be before the start date.")).toBeVisible();
    await expect(dialog.getByLabel('Name')).toBeHidden();
  });

  test('opens the trip detail page with the organizer as a member', async ({ page }) => {
    await createTrip(page, LISBON_TRIP);
    await openTrip(page, LISBON_TRIP.name);

    await expect(page).toHaveURL(/\/trips\/[a-f0-9]{24}$/);
    await expect(page.getByText('Lisbon, Portugal')).toBeVisible();
    await expect(page.getByText('Jun 10 – Jun 13, 2027')).toBeVisible();
    const members = page.getByRole('list');
    await expect(members.getByRole('listitem')).toHaveCount(1);
    await expect(members).toContainText('Riley');
    await expect(members).toContainText(/organizer/i);
  });

  test('edits the trip', async ({ page }) => {
    await createTrip(page, LISBON_TRIP);
    await openTrip(page, LISBON_TRIP.name);

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Name').fill('Porto Weekend');
    await page.getByLabel('Destination').fill('Porto, Portugal');
    await page.getByLabel('End date').fill('2027-06-14');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Porto Weekend' })).toBeVisible();
    await expect(page.getByText('Porto, Portugal')).toBeVisible();
    await expect(page.getByText('Jun 10 – Jun 14, 2027')).toBeVisible();

    await page.goto('/trips');
    await expect(page.getByRole('link', { name: /Porto Weekend/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lisbon Weekend/ })).toBeHidden();
  });

  test('deletes the trip after confirming', async ({ page }) => {
    await createTrip(page, LISBON_TRIP);
    await openTrip(page, LISBON_TRIP.name);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page).toHaveURL('/trips');
    await expect(page.getByText('No trips yet')).toBeVisible();
  });

  test('keeps the trip when the delete is cancelled', async ({ page }) => {
    await createTrip(page, LISBON_TRIP);
    await openTrip(page, LISBON_TRIP.name);

    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { level: 1, name: LISBON_TRIP.name })).toBeVisible();
  });
});
