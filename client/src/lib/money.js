export function parseDollarsToCents(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;

  const dollars = parseInt(match[1], 10);
  const centsPart = (match[2] ?? '').padEnd(2, '0');
  const cents = parseInt(centsPart || '0', 10);
  const totalCents = dollars * 100 + cents;

  if (totalCents <= 0) return null;
  return totalCents;
}

export function formatCents(cents) {
  const amount = (typeof cents === 'number' && !Number.isNaN(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
