import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

// Load env deterministically from the app root, not process.cwd().
// This prevents missing SMTP/RabbitMQ config when the worker is started from a different directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(appRoot, '.env') });

// Prevent enqueue recursion: the worker should execute side-effects directly.
process.env.RABBITMQ_WORKER = '1';

import completedEmailQueueWorkerService from '../lib/services/CompletedEmailQueueWorkerService';
import notificationJobsQueueWorkerService from '../lib/services/NotificationJobsQueueWorkerService';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_MAX = 50;
const DEFAULT_IDLE_SLEEP_MS = 2_000;
const DEFAULT_ERROR_SLEEP_MS = 10_000;

async function runForever() {
  const maxMessages = Number(process.env.RABBITMQ_WORKER_MAX || DEFAULT_MAX);
  const idleSleepMs = Number(process.env.RABBITMQ_WORKER_IDLE_SLEEP_MS || DEFAULT_IDLE_SLEEP_MS);
  const errorSleepMs = Number(process.env.RABBITMQ_WORKER_ERROR_SLEEP_MS || DEFAULT_ERROR_SLEEP_MS);

  console.log('[RabbitMQWorker] starting', {
    maxMessages,
    idleSleepMs,
    errorSleepMs,
    rabbitmqEnabled: Boolean(process.env.RABBITMQ_URL),
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const notif = await notificationJobsQueueWorkerService.runBatch({ maxMessages });
      const completed = await completedEmailQueueWorkerService.runBatch({ maxMessages });

      const processed = (notif.processed || 0) + (completed.processed || 0);
      const disabled = Boolean((notif as any).disabled) && Boolean((completed as any).disabled);

      if (disabled) {
        await sleep(idleSleepMs);
        continue;
      }

      if (processed === 0) {
        await sleep(idleSleepMs);
        continue;
      }
    } catch (err) {
      console.error('[RabbitMQWorker] loop error', err);
      await sleep(errorSleepMs);
    }
  }
}

process.on('SIGINT', () => {
  console.log('[RabbitMQWorker] SIGINT received, exiting');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[RabbitMQWorker] SIGTERM received, exiting');
  process.exit(0);
});

runForever().catch((err) => {
  console.error('[RabbitMQWorker] fatal error', err);
  process.exit(1);
});
