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
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    // On Windows, .cmd shims require a shell to execute reliably.
    shell: process.platform === 'win32',
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

const nextCmd = bin('next');
const nextArgs = mode === 'dev' ? ['dev'] : ['start'];

console.log('[runNextWithWorker] starting Next', { mode, worker: shouldStartWorker });

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
