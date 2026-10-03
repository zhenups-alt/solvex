import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const python = resolve(cwd, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
if (!existsSync(python)) {
  console.error('Backend environment missing. Follow the Python setup in README.md first.');
  process.exit(1);
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const [command, args] of [
  [python, ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', '8080']],
  [process.execPath, ['node_modules/vite/bin/vite.js', '--port', '3000', '--host', '127.0.0.1', '--strictPort']],
]) {
  const child = spawn(command, args, { cwd, stdio: 'inherit' });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code || 0); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('Solvex: http://localhost:3000/autopilot · API: http://localhost:8080/docs');
console.log('Keep this process running for the autonomous virtual portfolio. Ctrl+C stops both services.');
