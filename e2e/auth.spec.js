import { test, expect } from '@playwright/test';
import { logIn, newUser, signUp } from './support/helpers.js';

test.describe('sign up, log in and log out (#3)', () => {
  test('a new user signs up and lands on their trips', async ({ page }) => {
    const user = newUser('Sam');
    await signUp(page, user);

    await expect(page).toHaveURL('/trips');
    await expect(page.getByText(`Signed in as ${user.name}`)).toBeVisible();
  });

  test('shows inline errors for an empty sign-up form', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Enter your name.')).toBeVisible();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();
    await expect(page).toHaveURL('/signup');
  });

  test('rejects an email that is already registered', async ({ page, browser }) => {
    const user = newUser('Dana');
    await signUp(page, user);

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await otherPage.goto('/signup');
    await otherPage.getByLabel('Name').fill('Someone Else');
    await otherPage.getByLabel('Email').fill(user.email);
    await otherPage.getByLabel('Password').fill(user.password);
    await otherPage.getByRole('button', { name: 'Create account' }).click();

    await expect(otherPage.getByText('An account with this email already exists.')).toBeVisible();
    await otherContext.close();
  });

  test('logs out and logs back in', async ({ page }) => {
    const user = newUser('Lee');
    await signUp(page, user);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await logIn(page, user);
    await expect(page.getByRole('heading', { name: 'Your trips' })).toBeVisible();
    await expect(page.getByText(`Signed in as ${user.name}`)).toBeVisible();
  });

  test('stays logged out after a reload', async ({ page }) => {
    await signUp(page, newUser('Kim'));
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login');

    await page.goto('/trips');
    await expect(page).toHaveURL('/login');
  });

  test('rejects a wrong password', async ({ page }) => {
    const user = newUser('Max');
    await signUp(page, user);
    await page.getByRole('button', { name: 'Log out' }).click();

    await logIn(page, { ...user, password: 'not-my-password' });
    await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('sends a logged-out visitor to log in', async ({ page }) => {
    await page.goto('/trips');
    await expect(page).toHaveURL('/login');
  });
});
