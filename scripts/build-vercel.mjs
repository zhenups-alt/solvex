import { spawnSync } from 'node:child_process';

// A public build must never silently call the visitor's localhost API.
let api;
try { api = new URL(process.env.VITE_API_URL || ''); } catch { /* validated below */ }
if (!api || api.protocol !== 'https:' || api.username || api.password || api.search || api.hash
    || api.pathname !== '/' || ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) {
  console.error('Set VITE_API_URL to the public HTTPS API origin before deploying (no keys or paths).');
  process.exit(1);
}
process.env.VITE_API_URL = api.origin;
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  stdio: 'inherit', env: process.env,
});
if (result.error) console.error('Unable to start the frontend build.');
process.exit(result.status ?? 1);
