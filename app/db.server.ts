import { createRequire } from 'module';

let db: any;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __db__: any;
}

// When running tests (Vitest) avoid importing @prisma/client at module-init time
// so tests can safely mock ~/db.server. Export a placeholder db object in test env.
if (process.env.VITEST) {
  db = {} as any;
} else {
  const require = createRequire(import.meta.url);
  // Use require to avoid static ESM import so missing generated client won't crash tests
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');

  if (process.env.NODE_ENV === 'production') {
    db = new PrismaClient();
  } else {
    if (!global.__db__) {
      global.__db__ = new PrismaClient();
    }
    db = global.__db__;
  }
}

export { db };
