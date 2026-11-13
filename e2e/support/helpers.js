import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';

export const PASSWORD = 'correct-horse-42';

// Each test makes its own users, so specs can run in parallel on one database.
export function newUser(name = 'Alex') {
  return { name, email: `${name.toLowerCase()}-${randomUUID()}@example.com`, password: PASSWORD };
}

export async function signUp(page, user) {
  await page.goto('/signup');
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your trips' })).toBeVisible();
}

export async function logIn(page, user) {
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

// Goes through the three-step New trip dialog, then closes it on the "ready" screen.
export async function createTrip(page, trip) {
  await page.getByRole('button', { name: 'New trip' }).click();
  const dialog = page.getByRole('dialog', { name: 'New trip' });
  await dialog.getByLabel('Destination', { exact: true }).fill(trip.destination);
  await dialog.getByRole('button', { name: 'Next' }).click();
  await dialog.getByLabel('Start date', { exact: true }).fill(trip.startDate);
  await dialog.getByLabel('End date', { exact: true }).fill(trip.endDate);
  await dialog.getByRole('button', { name: 'Next' }).click();
  await dialog.getByLabel('Name', { exact: true }).fill(trip.name);
  await dialog.getByRole('button', { name: 'Create trip' }).click();
  await expect(dialog.getByText(`${trip.name} is ready`)).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('link', { name: new RegExp(trip.name) })).toBeVisible();
}

// Opens the Add activity dialog on the itinerary page and submits it.
export async function addActivity(page, activity) {
  await page.getByRole('button', { name: 'Add activity' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add activity' });
  await dialog.getByLabel('Title').fill(activity.title);
  await dialog.getByLabel('Date').fill(activity.date);
  await dialog.getByLabel('Time').fill(activity.time);
  await dialog.getByRole('button', { name: 'Add activity' }).click();
  await expect(dialog).toBeHidden();
}

export async function openActivityMenu(page, title) {
  await page.getByRole('button', { name: `More actions for ${title}`, exact: true }).click();
}

export async function openTrip(page, tripName) {
  await page.getByRole('link', { name: new RegExp(tripName) }).click();
  await expect(page.getByRole('heading', { level: 1, name: tripName })).toBeVisible();
}

export const LISBON_TRIP = {
  name: 'Lisbon Weekend',
  destination: 'Lisbon, Portugal',
  startDate: '2027-06-10',
  endDate: '2027-06-13',
};
