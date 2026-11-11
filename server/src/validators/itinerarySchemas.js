import { z } from 'zod';

export const activitySchema = z.object({
  title: z.string({ error: 'Enter a title.' }).trim().min(1, 'Enter a title.'),
  date: z.iso.date({ error: 'Enter a valid date in YYYY-MM-DD format.' }),
  time: z.iso.time({ error: 'Enter a valid time in HH:mm format.' }),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const updateActivitySchema = activitySchema.partial();
