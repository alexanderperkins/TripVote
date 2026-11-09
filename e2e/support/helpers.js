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

export async function createTrip(page, trip) {
  await page.getByRole('button', { name: 'New trip' }).click();
  await page.getByLabel('Name').fill(trip.name);
  await page.getByLabel('Destination').fill(trip.destination);
  await page.getByLabel('Start date').fill(trip.startDate);
  await page.getByLabel('End date').fill(trip.endDate);
  await page.getByRole('button', { name: 'Create trip' }).click();
  await expect(page.getByRole('link', { name: new RegExp(trip.name) })).toBeVisible();
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
