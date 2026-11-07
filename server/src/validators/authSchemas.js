import { z } from 'zod';

const MAX_PASSWORD_BYTES = 72; // bcrypt ignores anything longer

const NAME_MESSAGE = 'Enter your name.';
const EMAIL_MESSAGE = 'Enter a valid email address.';
const PASSWORD_LENGTH_MESSAGE = 'Password must be at least 8 characters.';

const email = z
  .string({ error: EMAIL_MESSAGE })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: EMAIL_MESSAGE }));

export const registerSchema = z.object({
  name: z
    .string({ error: NAME_MESSAGE })
    .trim()
    .min(1, NAME_MESSAGE)
    .max(60, 'Name must be 60 characters or fewer.'),
  email,
  password: z
    .string({ error: PASSWORD_LENGTH_MESSAGE })
    .min(8, PASSWORD_LENGTH_MESSAGE)
    .refine((value) => Buffer.byteLength(value) <= MAX_PASSWORD_BYTES, {
      error: 'Password must be 72 characters or fewer.',
    }),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.'),
});
