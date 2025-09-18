import { createHash } from 'crypto';

export const hashState = (s: unknown): string => {
  return createHash('sha256').update(JSON.stringify(s)).digest('base64').slice(0, 8);
};


