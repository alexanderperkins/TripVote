// Small wrapper so application code never calls console directly.
/* eslint-disable no-console -- this is the one place allowed to write to the console */
const isSilent = process.env.NODE_ENV === 'test';

export const logger = {
  info: (...args) => !isSilent && console.info('[info]', ...args),
  warn: (...args) => !isSilent && console.warn('[warn]', ...args),
  error: (...args) => !isSilent && console.error('[error]', ...args),
};
