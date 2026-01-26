import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

import dotenv from 'dotenv';

// Ensure this wrapper sees the same env that Next.js/Prisma typically read.
// `pnpm run dev` does NOT automatically load `.env` into `process.env`.
const rootDir = process.cwd();
try {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const envLocalPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    // Let .env.local override .env
    dotenv.config({ path: envLocalPath, override: true });
  }
} catch {
  // ignore dotenv load errors
}

function bin(name) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  return path.join(process.cwd(), 'node_modules', '.bin', `${name}${ext}`);
}

function spawnChild(command, args, label) {
  const needsShell =
    process.platform === 'win32' &&
    // Only enable shell for Windows .cmd shims (e.g. next.cmd, tsx.cmd).
    // For real executables like node.exe (often under "C:\\Program Files"),
    // using shell can break because the path isn't quoted.
    String(command).toLowerCase().endsWith('.cmd');

  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    // On Windows, only .cmd shims require a shell.
    shell: needsShell,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`);
      return;
    }
    console.log(`[${label}] exited with code ${code}`);
  });

  child.on('error', (err) => {
    console.error(`[${label}] failed to start`, err);
  });

  return child;
}

function killIfRunning(child) {
  if (!child || child.killed) return;
  try {
    child.kill('SIGTERM');
  } catch {
    // ignore
  }
}

const mode = process.argv[2] || 'dev';
if (mode !== 'dev' && mode !== 'start') {
  console.error('Usage: node scripts/runNextWithWorker.mjs <dev|start>');
  process.exit(1);
}

const shouldStartWorker = Boolean(process.env.RABBITMQ_URL);

// Next.js standalone output cannot be started with `next start`.
// Use the generated `.next/standalone/server.js` when present.
const standaloneServer = path.join(rootDir, '.next', 'standalone', 'server.js');

function ensureStandaloneAssets() {
  const standaloneDir = path.join(rootDir, '.next', 'standalone');
  if (!fs.existsSync(standaloneDir)) {
    return;
  }

  const staticSrc = path.join(rootDir, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
  }

  const publicSrc = path.join(rootDir, 'public');
  const publicDest = path.join(standaloneDir, 'public');
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
  }
}

const nextCmd =
  mode === 'start' && fs.existsSync(standaloneServer)
    ? process.execPath
    : bin('next');

const nextArgs =
  mode === 'dev'
    ? ['dev']
    : fs.existsSync(standaloneServer)
      ? [standaloneServer]
      : ['start'];

console.log('[runNextWithWorker] starting Next', { mode, worker: shouldStartWorker });

if (mode === 'start' && fs.existsSync(standaloneServer)) {
  ensureStandaloneAssets();
}

const nextProc = spawnChild(nextCmd, nextArgs, 'next');
let workerProc = null;

if (shouldStartWorker) {
  const tsxCmd = bin('tsx');
  workerProc = spawnChild(tsxCmd, ['src/workers/rabbitmqWorker.ts'], 'rabbitmq-worker');
}

function shutdown(code = 0) {
  killIfRunning(workerProc);
  killIfRunning(nextProc);
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

nextProc.on('exit', (code) => {
  // If Next stops, stop worker too.
  killIfRunning(workerProc);
  process.exit(code ?? 0);
});
