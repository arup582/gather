import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const path = fileURLToPath(new URL('../.env', import.meta.url));
const secret = () => randomBytes(24).toString('base64url');
try {
  writeFileSync(path, `POSTGRES_DB=gather\nPOSTGRES_USER=gather\nPOSTGRES_PASSWORD=${secret()}\nDEV_SEED_PASSWORD=${secret()}\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created .env with random local passwords. Read DEV_SEED_PASSWORD there to sign in.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('.env already exists; left unchanged.');
  else throw error;
}
