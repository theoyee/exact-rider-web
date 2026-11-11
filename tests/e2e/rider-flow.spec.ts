import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const quoteId = '12345678-1234-4234-8234-123456789abc';
const requestId = '87654321-4321-4321-8321-123456789abc';
async function mockService(page: Page, options: { incomplete?: boolean; rejectIncomplete?: boolean; expired?: boolean } = {}) {
  const pricingStatus = options.incomplete ? 'unresolved_charges' : 'complete';
  const estimatedFareMinor = options.incomplete ? null : 320000;
  let created = 0;
  let phase = 'submitted';
  const pickup = { latitude: 6.6018, longitude: 3.3515 };
  const destination = { latitude: 6.5834, longitude: 3.3527 };
  await page.route('**/api/places?**', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('id')) return route.fulfill({ json: { coordinates: url.searchParams.get('id') === 'pickup-place' ? pickup : destination } });
    const q = url.searchParams.get('q') || '';
    return route.fulfill({ json: { suggestions: [{ placeId: q.includes('Allen') ? 'pickup-place' : 'destination-place', label: q.includes('Allen') ? 'Allen Avenue, Ikeja, Lagos' : 'Ikeja City Mall, Lagos' }] } });
  });
  const status = () => ({ requestId, quoteId, status: phase, estimatedFareMinor, knownSubtotalMinor: 320000, counterFareMinor: phase === 'countered' ? 350000 : null, acceptedFareMinor: phase === 'accepted' ? 350000 : null, acceptedDriverName: phase === 'accepted' ? 'Ada Okafor' : null, offerExpiresAt: new Date(Date.now() + 120000).toISOString(), pricingStatus, searchMode: 'real_driver', simulatedReference: null, createdAt: new Date().toISOString() });
  await page.route('**/api/backend/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/validity') && options.expired) return route.fulfill({ status: 410, json: { error: { code: 'QUOTE_EXPIRED' } } });
    if (path.endsWith('/validity')) return route.fulfill({ json: { quoteId, valid: true, expiresAt: new Date(Date.now() + 120000).toISOString() } });
    if (path.endsWith('/quotes')) return route.fulfill({ json: {
      quoteId, pickup, destination, driverAssignment: 'none', status: pricingStatus,
      pricing: { knownSubtotalMinor: 320000, estimatedFareMinor, completeness: pricingStatus, vehicleCategory: 'standard', currency: 'NGN', pricingVersion: 1 },
      referenceEstimate: { referenceId: 'driver-id', source: 'driver_presence', distanceMeters: 1000, durationSeconds: 180 },
      passengerTrip: { provider: 'mapbox', geometry: { type: 'LineString', coordinates: [[3.3515, 6.6018], [3.352, 6.59], [3.3527, 6.5834]] }, distanceMeters: 3200, durationSeconds: 600, traffic: { aware: false, condition: 'unknown', source: 'unavailable' }, trafficSegments: { type: 'FeatureCollection', features: [] }, calculatedAt: new Date().toISOString() },
      expiresAt: new Date(Date.now() + 120000).toISOString(), serverNow: new Date().toISOString(),
    } });
    if (path.endsWith('/requests') && route.request().method() === 'POST') {
      created++;
      if (options.rejectIncomplete) return route.fulfill({ status: 422, json: { error: { code: 'QUOTE_INCOMPLETE' } } });
      expect(JSON.parse(route.request().postData() || '{}')).toMatchObject({ quoteId, fullName: 'Ada Rider' });
      return route.fulfill({ json: { ...status(), actionToken: 'action-token' } });
    }
    if (path.endsWith('/accept-counter')) { phase = 'accepted'; return route.fulfill({ json: status() }); }
    if (path.endsWith('/counter')) { phase = 'countered'; return route.fulfill({ json: status() }); }
    if (path.endsWith('/cancel')) { phase = 'cancelled'; return route.fulfill({ json: status() }); }
    return route.fulfill({ json: status() });
  });
  return { created: () => created, counter: () => { phase = 'countered'; } };
}
async function requestRide(page: Page, expectSearch = true) {
  await page.goto('/ride');
  await page.getByRole('combobox', { name: 'Pick up', exact: true }).fill('Allen');
  await page.getByRole('option', { name: 'Allen Avenue, Ikeja, Lagos' }).click();
  await page.getByRole('combobox', { name: 'Destination', exact: true }).fill('Ikeja');
  await page.getByRole('option', { name: 'Ikeja City Mall, Lagos' }).click();
  await page.getByRole('button', { name: 'See my estimate' }).click();
  await expect(page).toHaveURL(/\/ride\/estimate/);
  await expect(page.getByText('₦3,200', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Full name').fill('Ada Rider');
  await page.getByLabel('Email address').fill('ada@example.com');
  await page.getByLabel('Phone number').fill('08012345678');
  await page.getByRole('button', { name: 'Find my driver' }).click();
  if (expectSearch) await expect(page).toHaveURL(/\/ride\/search/);
}
test('request, negotiate, accept, recover session, and guard unconfirmed payment', async ({ page }) => {
  const service = await mockService(page);
  await requestRide(page);
  expect(service.created()).toBe(1);
  await page.getByRole('button', { name: 'Increase offer' }).click();
  await page.getByRole('button', { name: 'Send counter offer' }).click();
  await expect(page.getByText('Driver’s counter offer')).toBeVisible();
  await page.getByRole('button', { name: 'Accept ₦3,500' }).click();
  await expect(page).toHaveURL(/\/ride\/track/);
  await expect(page.getByRole('heading', { name: 'Ada is on the way.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ada is on the way.' })).toBeVisible();
  expect(service.created()).toBe(1);
  await page.getByRole('link', { name: 'Go back', exact: true }).click();
  await expect(page).toHaveURL('/');
  await page.getByRole('link', { name: 'You have an active ride. Continue' }).click();
  await expect(page).toHaveURL(/\/ride\/track/);
  await page.getByRole('link', { name: 'View payment information' }).click();
  await expect(page.getByRole('status')).toContainText('No payment has been collected or confirmed');
  await expect(page.getByRole('button', { name: /paid|pay now/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('cancel only clears the request after server confirmation', async ({ page }) => {
  await mockService(page); await requestRide(page);
  await page.getByRole('button', { name: 'Cancel request', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel request', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your request is cancelled.' })).toBeVisible();
  await page.getByRole('button', { name: 'Plan another trip' }).click();
  await expect(page).toHaveURL(/\/ride$/);
});
test('welcome and direct-entry guards work on this viewport', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your everyday,');
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: `docs/screenshots/welcome-${testInfo.project.name}.png`, fullPage: testInfo.project.name === 'mobile' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/ride/track');
  await expect(page.getByRole('heading', { name: 'Your ride starts here.' })).toBeVisible();
  await page.goto('/ride/estimate');
  await expect(page.getByRole('heading', { name: 'Let’s plan your trip first.' })).toBeVisible();
});

test('subtotal quotes can continue to backend-authorized driver search', async ({ page }) => {
  const service = await mockService(page, { incomplete: true });
  await requestRide(page);
  expect(service.created()).toBe(1);
  await expect(page.getByLabel('Want to suggest a different fare?')).toHaveValue('3200');
  await page.getByRole('button', { name: 'Send counter offer' }).click();
  await expect(page.getByText('Driver’s counter offer')).toBeVisible();
});
test('backend incomplete-quote rejection stays on details with recovery', async ({ page }) => {
  const service = await mockService(page, { incomplete: true, rejectIncomplete: true });
  await requestRide(page, false);
  await expect(page.getByRole('alert').filter({ hasText: 'unresolved charges' })).toBeVisible();
  await expect(page).toHaveURL(/\/ride\/details/);
  expect(service.created()).toBe(1);
  await page.getByRole('link', { name: 'Refresh estimate' }).click();
  await expect(page).toHaveURL(/\/ride\/estimate/);
  await expect(page.getByRole('status').filter({ hasText: 'This is a subtotal' })).toBeVisible();
});
test('expired subtotal quote cannot proceed to details', async ({ page }) => {
  const service = await mockService(page, { incomplete: true, expired: true });
  await page.goto('/ride');
  await page.getByRole('combobox', { name: 'Pick up', exact: true }).fill('Allen');
  await page.getByRole('option', { name: 'Allen Avenue, Ikeja, Lagos' }).click();
  await page.getByRole('combobox', { name: 'Destination', exact: true }).fill('Ikeja');
  await page.getByRole('option', { name: 'Ikeja City Mall, Lagos' }).click();
  await page.getByRole('button', { name: 'See my estimate' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Your estimate expired.' })).toBeVisible();
  await expect(page).toHaveURL(/\/ride\/estimate/);
  expect(service.created()).toBe(0);
});
