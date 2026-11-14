import { test, expect } from '@playwright/test';
import { createTrip, LISBON_TRIP, newUser, openTrip, signUp } from './support/helpers.js';

test.describe('shared itinerary (#8)', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, newUser('Morgan'));
    await createTrip(page, LISBON_TRIP);
    await openTrip(page, LISBON_TRIP.name);
    await page.getByRole('link', { name: 'Itinerary' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Itinerary' })).toBeVisible();
  });

  function addForm(page) {
    return page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: 'Add activity' }) });
  }

  async function addActivity(page, { title, date, time, location, notes }) {
    const form = addForm(page);
    await form.getByLabel('Title').fill(title);
    await form.getByLabel('Date').fill(date);
    await form.getByLabel('Time').fill(time);
    if (location) await form.getByLabel('Location').fill(location);
    if (notes) await form.getByLabel('Notes').fill(notes);
    await form.getByRole('button', { name: 'Add activity' }).click();
    await expect(page.getByRole('heading', { level: 3, name: title })).toBeVisible();
  }

  function activityCard(page, title) {
    return page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) });
  }

  test('shows an empty state before the first activity', async ({ page }) => {
    await expect(page.getByText('No activities yet')).toBeVisible();
  });

  test('requires a title, date and time', async ({ page }) => {
    await addForm(page).getByRole('button', { name: 'Add activity' }).click();

    await expect(page.getByText('Enter a title.')).toBeVisible();
    await expect(page.getByText('Enter a date.')).toBeVisible();
    await expect(page.getByText('Enter a time.')).toBeVisible();
    await expect(page.getByText('No activities yet')).toBeVisible();
  });

  test('groups activities by day in chronological order and keeps them after a reload', async ({
    page,
  }) => {
    await addActivity(page, { title: 'Dinner in Alfama', date: '2027-06-11', time: '19:30' });
    await addActivity(page, {
      title: 'Tram 28',
      date: '2027-06-10',
      time: '15:00',
      location: 'Martim Moniz',
      notes: 'Go early to get a seat',
    });
    await addActivity(page, { title: 'Pastéis de Belém', date: '2027-06-11', time: '09:00' });

    const check = async () => {
      await expect(page.getByRole('heading', { level: 2 })).toHaveText([
        'Add activity',
        '2027-06-10',
        '2027-06-11',
      ]);
      await expect(page.getByRole('heading', { level: 3 })).toHaveText([
        'Tram 28',
        'Pastéis de Belém',
        'Dinner in Alfama',
      ]);
      const tram = activityCard(page, 'Tram 28');
      await expect(tram).toContainText('15:00');
      await expect(tram).toContainText('Martim Moniz');
      await expect(tram).toContainText('Go early to get a seat');
    };

    await check();
    await page.reload();
    await check();
  });

  test('edits an activity', async ({ page }) => {
    await addActivity(page, { title: 'Tram 28', date: '2027-06-10', time: '15:00' });

    await activityCard(page, 'Tram 28').getByRole('button', { name: 'Edit' }).click();
    const editForm = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Save' }) });
    await editForm.getByLabel('Title').fill('Tram 28 to Graça');
    await editForm.getByLabel('Time').fill('16:30');
    await editForm.getByRole('button', { name: 'Save' }).click();

    const card = activityCard(page, 'Tram 28 to Graça');
    await expect(card).toContainText('16:30');
    await page.reload();
    await expect(activityCard(page, 'Tram 28 to Graça')).toContainText('16:30');
  });

  test('deletes an activity after confirming', async ({ page }) => {
    await addActivity(page, { title: 'Tram 28', date: '2027-06-10', time: '15:00' });

    page.once('dialog', (dialog) => dialog.accept());
    await activityCard(page, 'Tram 28').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'Tram 28' })).toBeHidden();
    await expect(page.getByText('No activities yet')).toBeVisible();
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
    await expect(stranger.getByRole('heading', { name: 'Tram 28' })).toBeHidden();
    await expect(stranger.getByRole('heading', { level: 1, name: 'Itinerary' })).toBeHidden();
    await context.close();
  });
});
