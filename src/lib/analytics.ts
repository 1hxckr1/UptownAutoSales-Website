const STORAGE_KEYS = {
  VISITOR_ID: 'fdr_visitor_id',
  SESSION_ID: 'fdr_session_id',
};

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 25;

interface AnalyticsEvent {
  event_type: string;
  event_data?: Record<string, unknown>;
  page_url?: string;
  page_title?: string;
  referrer?: string;
  timestamp?: string;
}

interface AnalyticsConfig {
  endpoint: string;
  apiKey: string;
  enabled: boolean;
}

function generateId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEYS.VISITOR_ID, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!id) {
      id = generateId();
      sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

let config: AnalyticsConfig | null = null;
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function buildPayload(events: AnalyticsEvent[]) {
  return {
    session_id: getSessionId(),
    visitor_id: getVisitorId(),
    user_agent: navigator.userAgent,
    events,
  };
}

function flush() {
  if (!config?.enabled || eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, MAX_BATCH_SIZE);
  const payload = JSON.stringify({ ...buildPayload(batch), api_key: config.apiKey });

  try {
    fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fender-API-Key': config.apiKey,
      },
      body: payload,
      keepalive: true,
    })
      .then(async (res) => {
        if (!res.ok) {
          // Re-queue on failures to avoid data loss; cap queue growth.
          eventQueue = [...batch, ...eventQueue].slice(0, 2000);
          const snippet = await res.text().catch(() => '');
          console.warn('[Analytics] ingest failed', res.status, snippet.slice(0, 160));
        }
      })
      .catch((err) => {
        eventQueue = [...batch, ...eventQueue].slice(0, 2000);
        console.warn('[Analytics] ingest error', err?.message || err);
      });
  } catch (err: any) {
    eventQueue = [...batch, ...eventQueue].slice(0, 2000);
    console.warn('[Analytics] flush exception', err?.message || err);
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    flush();
  }
}

export function initAnalytics(cfg: AnalyticsConfig) {
  if (initialized) return;
  config = cfg;
  initialized = true;

  if (!config.enabled) return;

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', flush);
}

export function shutdownAnalytics() {
  flush();
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', flush);
  initialized = false;
}

function enqueue(event: AnalyticsEvent) {
  if (!config?.enabled) return;
  eventQueue.push(event);
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    flush();
  }
}

export function trackPageView(url: string, title: string) {
  enqueue({
    event_type: 'page_view',
    page_url: url,
    page_title: title,
    referrer: document.referrer,
    timestamp: new Date().toISOString(),
  });
}

export function trackEvent(eventType: string, data?: Record<string, unknown>) {
  enqueue({
    event_type: eventType,
    event_data: data,
    page_url: window.location.href,
    page_title: document.title,
    timestamp: new Date().toISOString(),
  });
}

export function trackCtaClick(ctaType: string, meta?: Record<string, unknown>) {
  trackEvent('cta_click', { cta_type: ctaType, ...meta });
}

export function trackLeadSubmission(
  formType: string,
  success: boolean,
  meta?: Record<string, unknown>,
) {
  trackEvent('lead_submission', { form_type: formType, success, ...meta });
}

export function trackScrollDepth(depth: number) {
  trackEvent('scroll_depth', { depth_percent: depth });
}

export function trackTimeOnPage(seconds: number, url: string, scrollDepth?: number) {
  trackEvent('time_on_page', { seconds, url, scroll_depth: scrollDepth ?? 0 });
}
