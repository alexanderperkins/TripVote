import { test, expect } from '@playwright/test';
import { createTrip, LISBON_TRIP, newUser, openTrip, signUp } from './support/helpers.js';

// Flow 3 in AGENTS.md: a Member adds an activity and other Members vote on it.
test.describe('voting on itinerary activities (#9)', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  let organizerPage;
  let itineraryUrl;
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
    await page.getByLabel('Title').fill('Tram 28');
    await page.getByLabel('Date').fill('2027-06-10');
    await page.getByLabel('Time').fill('15:00');
    await page.getByRole('button', { name: 'Add activity' }).click();
    await expect(page.getByRole('heading', { name: 'Tram 28' })).toBeVisible();
    itineraryUrl = page.url();
  });

  test.afterEach(async () => {
    await member.context.close();
  });

  function tramCard(page) {
    return page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Tram 28' }) });
  }

  test('Members vote, see the count and voters, and can remove their vote', async () => {
    const memberCard = tramCard(member.page);
    await member.page.goto(itineraryUrl);
    await expect(memberCard).toContainText('No votes yet');

    const voteButton = memberCard.getByRole('button', { name: 'Vote for Tram 28' });
    await voteButton.click();
    await expect(voteButton).toHaveAttribute('aria-pressed', 'true');
    await expect(memberCard).toContainText('1 vote');
    await expect(memberCard).toContainText('Voted by Casey');

    await organizerPage.reload();
    const organizerCard = tramCard(organizerPage);
    await expect(organizerCard).toContainText('1 vote');
    await expect(organizerCard).toContainText('Voted by Casey');
    await organizerCard.getByRole('button', { name: 'Vote for Tram 28' }).click();
    await expect(organizerCard).toContainText('2 votes');
    await expect(organizerCard).toContainText('Voted by Casey, Jordan');

    await member.page.reload();
    await expect(memberCard).toContainText('2 votes');
    await voteButton.click();
    await expect(voteButton).toHaveAttribute('aria-pressed', 'false');
    await expect(memberCard).toContainText('1 vote');
    await expect(memberCard).toContainText('Voted by Jordan');

    await member.page.reload();
    await expect(memberCard).toContainText('Voted by Jordan');
    await expect(voteButton).toHaveAttribute('aria-pressed', 'false');
  });
});
