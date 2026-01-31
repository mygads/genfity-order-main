#!/usr/bin/env node

/**
 * Upload parity smoke checks (Next.js vs Go)
 *
 * Focus: error codes/messages/statusCode parity for upload routes.
 *
 * Usage:
 *   node scripts/upload-parity-smoke.mjs --next http://localhost:3000 --go http://localhost:8086 --token <MERCHANT_BEARER>
 *
 * Or via env:
 *   NEXT_BASE_URL=... GO_BASE_URL=... MERCHANT_TOKEN=... node scripts/upload-parity-smoke.mjs
 */

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

const nextBase = (getArg('--next') || process.env.NEXT_BASE_URL || '').replace(/\/+$/, '');
const goBase = (getArg('--go') || process.env.GO_BASE_URL || '').replace(/\/+$/, '');
const merchantToken = getArg('--token') || process.env.MERCHANT_TOKEN || '';

if (!nextBase || !goBase) {
  console.error('Missing base URLs. Provide --next/--go or NEXT_BASE_URL/GO_BASE_URL');
  process.exit(2);
}
if (!merchantToken) {
  console.error('Missing merchant token. Provide --token or MERCHANT_TOKEN');
  process.exit(2);
}

function urlJoin(base, path) {
  return base.replace(/\/+$/, '') + path;
}

async function callEndpoint(base, test) {
  const url = urlJoin(base, test.path);
  const headers = new Headers(test.headers);
  const init = {
    method: test.method,
    headers,
    body: test.body,
  };

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    return { ok: false, status: 0, json: null, text: String(err) };
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json, text: null };
  }

  const text = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, json: null, text };
}

function stableErrorShape(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const { success, error, message, statusCode } = payload;
  return { success, error, message, statusCode };
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const authHeaders = { Authorization: `Bearer ${merchantToken}` };

function makeMultipart(parts) {
  const fd = new FormData();
  for (const part of parts) {
    if (part.kind === 'file') {
      fd.set(part.name, new Blob([part.data], { type: part.type }), part.filename);
    } else {
      fd.set(part.name, part.value);
    }
  }
  return fd;
}

const tests = [
  {
    name: 'merchant/upload/qris missing file',
    method: 'POST',
    path: '/api/merchant/upload/qris',
    headers: authHeaders,
    body: makeMultipart([]),
    compare: 'error',
  },
  {
    name: 'merchant/upload/promo-banner missing file',
    method: 'POST',
    path: '/api/merchant/upload/promo-banner',
    headers: authHeaders,
    body: makeMultipart([]),
    compare: 'error',
  },
  {
    name: 'merchant/upload/menu-image missing file',
    method: 'POST',
    path: '/api/merchant/upload/menu-image',
    headers: authHeaders,
    body: makeMultipart([]),
    compare: 'error',
  },
  {
    name: 'merchant/upload/merchant-image missing file',
    method: 'POST',
    path: '/api/merchant/upload/merchant-image',
    headers: authHeaders,
    body: makeMultipart([{ kind: 'field', name: 'type', value: 'logo' }]),
    compare: 'error',
  },
  {
    name: 'merchant/upload/merchant-image missing type',
    method: 'POST',
    path: '/api/merchant/upload/merchant-image',
    headers: authHeaders,
    body: makeMultipart([
      { kind: 'file', name: 'file', filename: 'x.txt', type: 'text/plain', data: 'x' },
      // intentionally omit `type`
    ]),
    compare: 'error',
  },
  {
    name: 'merchant/upload-logo missing file',
    method: 'POST',
    path: '/api/merchant/upload-logo',
    headers: authHeaders,
    body: makeMultipart([]),
    compare: 'error',
  },
  {
    name: 'merchant/upload/presign missing type',
    method: 'POST',
    path: '/api/merchant/upload/presign',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    compare: 'error',
  },
  {
    name: 'merchant/upload/confirm invalid type',
    method: 'POST',
    path: '/api/merchant/upload/confirm',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    compare: 'error',
  },
  {
    name: 'merchant/upload/delete-image missing url',
    method: 'POST',
    path: '/api/merchant/upload/delete-image',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    compare: 'error',
  },
  {
    name: 'merchant/upload/menu-image/confirm missing url',
    method: 'POST',
    path: '/api/merchant/upload/menu-image/confirm',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    compare: 'error',
  },
];

let failures = 0;

for (const test of tests) {
  const [nextRes, goRes] = await Promise.all([
    callEndpoint(nextBase, test),
    callEndpoint(goBase, test),
  ]);

  const nextPayload = test.compare === 'error' ? stableErrorShape(nextRes.json) : nextRes.json;
  const goPayload = test.compare === 'error' ? stableErrorShape(goRes.json) : goRes.json;

  const ok =
    nextRes.status === goRes.status &&
    deepEqual(nextPayload, goPayload);

  if (ok) {
    console.log(`PASS  ${test.name}`);
  } else {
    failures++;
    console.log(`FAIL  ${test.name}`);
    console.log('  Next:', { status: nextRes.status, payload: nextPayload, text: nextRes.text });
    console.log('  Go:  ', { status: goRes.status, payload: goPayload, text: goRes.text });
  }
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}

console.log('\nAll parity checks passed.');
