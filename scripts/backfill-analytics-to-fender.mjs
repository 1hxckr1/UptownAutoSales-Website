#!/usr/bin/env node
/**
 * Safe backfill: copy historical analytics events from Trinity Supabase table
 * into Fender ingest endpoint in batches. No deletes/updates on source side.
 *
 * Required env:
 * - TRINITY_SUPABASE_URL
 * - TRINITY_SERVICE_ROLE_KEY
 * - FENDER_INGEST_ENDPOINT  (e.g. https://<fender>/functions/v1/public-analytics-ingest)
 * - FENDER_API_KEY
 *
 * Optional:
 * - FENDER_SERVICE_ROLE_KEY (enables target-side dedupe guard)
 * - BACKFILL_DEALER_ID
 * - BACKFILL_FROM_ISO (default: 30 days ago)
 * - BACKFILL_TO_ISO   (default: now)
 * - BATCH_SIZE        (default: 50)
 * - DRY_RUN           (true/false, default true)
 */

const {
  TRINITY_SUPABASE_URL,
  TRINITY_SERVICE_ROLE_KEY,
  FENDER_INGEST_ENDPOINT,
  FENDER_API_KEY,
  FENDER_SERVICE_ROLE_KEY,
  BACKFILL_DEALER_ID,
  BACKFILL_FROM_ISO,
  BACKFILL_TO_ISO,
  BATCH_SIZE,
  DRY_RUN,
} = process.env;

if (!TRINITY_SUPABASE_URL || !TRINITY_SERVICE_ROLE_KEY || !FENDER_INGEST_ENDPOINT || !FENDER_API_KEY) {
  console.error('Missing required env vars. See script header.');
  process.exit(1);
}

const now = new Date();
const from = BACKFILL_FROM_ISO ? new Date(BACKFILL_FROM_ISO) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const to = BACKFILL_TO_ISO ? new Date(BACKFILL_TO_ISO) : now;
const batchSize = Math.max(1, Math.min(50, Number(BATCH_SIZE || 50)));
const dryRun = String(DRY_RUN ?? 'true').toLowerCase() !== 'false';

const restBase = `${TRINITY_SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
const targetBase = (() => {
  try {
    const u = new URL(FENDER_INGEST_ENDPOINT);
    return `${u.origin}/rest/v1`;
  } catch {
    return null;
  }
})();

function encode(v) { return encodeURIComponent(v); }

function dedupeKey(r) {
  return [
    r.dealer_id || '',
    r.session_id || '',
    r.visitor_id || '',
    r.event_type || '',
    r.page_url || '',
    r.created_at || '',
  ].join('||');
}

async function fetchExistingTargetKeys(offset) {
  if (!FENDER_SERVICE_ROLE_KEY || !targetBase) return new Set();

  const filters = [
    `created_at=gte.${encode(from.toISOString())}`,
    `created_at=lte.${encode(to.toISOString())}`,
    `select=dealer_id,session_id,visitor_id,event_type,page_url,created_at`,
    `order=created_at.asc`,
    `limit=1000`,
    `offset=${offset}`,
  ];
  if (BACKFILL_DEALER_ID) filters.push(`dealer_id=eq.${encode(BACKFILL_DEALER_ID)}`);

  const url = `${targetBase}/website_analytics_events?${filters.join('&')}`;
  const res = await fetch(url, {
    headers: {
      apikey: FENDER_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${FENDER_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Target dedupe fetch failed ${res.status}: ${text.slice(0, 200)}`);
  }

  const rows = await res.json();
  return new Set((rows || []).map(dedupeKey));
}

async function fetchSourceEvents(offset) {
  const filters = [
    `created_at=gte.${encode(from.toISOString())}`,
    `created_at=lte.${encode(to.toISOString())}`,
    `order=created_at.asc`,
    `limit=${batchSize}`,
    `offset=${offset}`,
  ];
  if (BACKFILL_DEALER_ID) filters.push(`dealer_id=eq.${encode(BACKFILL_DEALER_ID)}`);

  const url = `${restBase}/website_analytics_events?${filters.join('&')}`;
  const res = await fetch(url, {
    headers: {
      apikey: TRINITY_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${TRINITY_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Source fetch failed ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function toPayloadBatch(rows) {
  const grouped = new Map();
  for (const r of rows) {
    const key = `${r.dealer_id}::${r.session_id}::${r.visitor_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        dealer_id: r.dealer_id,
        session_id: r.session_id,
        visitor_id: r.visitor_id,
        user_agent: r.user_agent || undefined,
        events: [],
      });
    }
    grouped.get(key).events.push({
      event_type: r.event_type,
      event_data: r.event_data || {},
      page_url: r.page_url || undefined,
      page_title: r.page_title || undefined,
      referrer: r.referrer || undefined,
      timestamp: r.created_at,
    });
  }
  return [...grouped.values()];
}

async function postToFender(payload) {
  const res = await fetch(FENDER_INGEST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Fender-API-Key': FENDER_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Fender ingest failed ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function main() {
  console.log('[Backfill] starting', {
    dryRun,
    from: from.toISOString(),
    to: to.toISOString(),
    batchSize,
    dedupeGuard: Boolean(FENDER_SERVICE_ROLE_KEY && targetBase),
  });

  const existingKeys = new Set();
  if (FENDER_SERVICE_ROLE_KEY && targetBase) {
    let dedupeOffset = 0;
    while (true) {
      const keys = await fetchExistingTargetKeys(dedupeOffset);
      keys.forEach((k) => existingKeys.add(k));
      if (keys.size < 1000) break;
      dedupeOffset += 1000;
    }
    console.log('[Backfill] dedupe index loaded', { existing: existingKeys.size });
  }

  let offset = 0;
  let totalRows = 0;
  let totalPosted = 0;
  let totalSkipped = 0;

  while (true) {
    const rows = await fetchSourceEvents(offset);
    if (!rows.length) break;

    totalRows += rows.length;

    const filteredRows = existingKeys.size
      ? rows.filter((r) => {
          const key = dedupeKey(r);
          const seen = existingKeys.has(key);
          if (!seen) existingKeys.add(key);
          return !seen;
        })
      : rows;

    totalSkipped += rows.length - filteredRows.length;
    const payloads = toPayloadBatch(filteredRows);

    if (dryRun) {
      totalPosted += filteredRows.length;
      console.log(`[Backfill][DRY] rows=${rows.length} to_post=${filteredRows.length} skipped=${rows.length - filteredRows.length} grouped_payloads=${payloads.length} offset=${offset}`);
    } else {
      for (const payload of payloads) {
        await postToFender(payload);
      }
      totalPosted += filteredRows.length;
      console.log(`[Backfill] rows=${rows.length} posted=${filteredRows.length} skipped=${rows.length - filteredRows.length} grouped_payloads=${payloads.length} offset=${offset}`);
    }

    offset += rows.length;
    if (rows.length < batchSize) break;
  }

  console.log('[Backfill] done', { totalRows, totalPosted, totalSkipped, dryRun });
}

main().catch((err) => {
  console.error('[Backfill] failed', err.message || err);
  process.exit(1);
});
