import { z } from 'zod';

const tripDateSchema = z.iso.date({ error: 'Enter a valid date in YYYY-MM-DD format.' });

export const tripSchema = z
  .object({
    name: z.string({ error: 'Enter a trip name.' }).trim().min(1, 'Enter a trip name.'),
    destination: z.string({ error: 'Enter a destination.' }).trim().min(1, 'Enter a destination.'),
    startDate: tripDateSchema,
    endDate: tripDateSchema,
  })
  .refine((trip) => trip.endDate >= trip.startDate, {
    path: ['endDate'],
    error: "End date can't be before the start date.",
  });
