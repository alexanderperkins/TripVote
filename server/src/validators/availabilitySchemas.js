import { z } from 'zod';

// A trip can't usefully be longer than a year, so this also caps the request size.
const MAX_DATES = 366;

export const availabilitySchema = z.object({
  dates: z
    .array(z.iso.date({ error: 'Enter dates in YYYY-MM-DD format.' }), {
      error: 'Send the list of dates you are free.',
    })
    .max(MAX_DATES, 'Pick fewer dates.'),
});
