# Fender-AI Website Analytics Integration

## Overview

Trinity's dealer website now sends real-time analytics events to a Supabase database via a dedicated edge function. Every page view, CTA click, lead submission, scroll depth milestone, and time-on-page measurement is captured and stored with full dealer attribution. This document explains the architecture end-to-end so Fender-AI knows exactly what to expect.

---

## Architecture

```
Browser (analytics.ts)
  |
  |  POST JSON (batched every 3s or on page hide)
  v
Supabase Edge Function: public-analytics-ingest
  |
  |  Validates API key via dealer_api_config table
  |  Checks analytics_enabled flag on dealer_info
  |  Bulk-inserts into website_analytics_events
  v
Supabase Postgres: website_analytics_events table
```

---

## Edge Function Endpoint

**URL:** `{SUPABASE_URL}/functions/v1/public-analytics-ingest`

**Method:** `POST`

**Authentication:** The dealer's Fender API key, sent via:
- `X-Fender-API-Key` header (primary), OR
- `api_key` field in the JSON body (fallback for keepalive requests)

The edge function validates the key against the `dealer_api_config.public_api_key` column, the same table and key used by all other public endpoints (inventory, forms, etc).

**JWT Verification:** Disabled (public endpoint -- website visitors are anonymous).

---

## Request Payload

```json
{
  "dealer_id": "trinity",
  "session_id": "a1b2c3d4-...",
  "visitor_id": "e5f6g7h8-...",
  "user_agent": "Mozilla/5.0 ...",
  "api_key": "fdr_...",
  "events": [
    {
      "event_type": "page_view",
      "event_data": {},
      "page_url": "https://honestcardeal.com/inventory",
      "page_title": "Inventory | Trinity Motorcar Company",
      "referrer": "https://google.com",
      "timestamp": "2026-02-06T14:30:00.000Z"
    },
    {
      "event_type": "cta_click",
      "event_data": { "cta_type": "call", "source": "vehicle_detail", "vehicle_id": "abc-123" },
      "page_url": "https://honestcardeal.com/inventory/2024-toyota-camry",
      "page_title": "2024 Toyota Camry | Trinity Motorcar Company",
      "timestamp": "2026-02-06T14:30:05.000Z"
    }
  ]
}
```

**Constraints:**
- Max 50 events per batch
- `session_id`, `visitor_id`, and `events[]` are required
- `dealer_id` in the body is informational; the actual dealer_id used for storage comes from the API key lookup

---

## Response

**Success (200):**
```json
{ "success": true, "count": 2 }
```

**Error (400/401/405/500):**
```json
{ "error": "description of issue" }
```

---

## Database Table: `website_analytics_events`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated event ID |
| `dealer_id` | text | Dealer identifier (from API key lookup) |
| `session_id` | text | Browser session ID (regenerated per tab/session) |
| `visitor_id` | text | Persistent visitor ID (stored in localStorage) |
| `event_type` | text | Event category (see Event Types below) |
| `event_data` | jsonb | Event-specific metadata |
| `page_url` | text | Full URL where the event fired |
| `page_title` | text | Document title at time of event |
| `referrer` | text | `document.referrer` value |
| `user_agent` | text | Browser user agent |
| `created_at` | timestamptz | Timestamp of event |

**Indexes:**
- `(dealer_id, created_at DESC)` -- time-range dashboard queries
- `(dealer_id, event_type)` -- filtering by event type
- `(visitor_id)` -- unique visitor counting

**Row Level Security:**
- `anon` role: INSERT only (website visitors can write events but never read)
- `authenticated` role: SELECT only, scoped to the admin's dealer_id via `admin_users` table

---

## Dealer Settings: `dealer_info` Columns

| Column | Type | Description |
|---|---|---|
| `analytics_enabled` | boolean (default: true) | Kill switch. Set to `false` to silently drop all incoming events. |
| `analytics_allowed_domains` | text[] | Whitelist of hostnames allowed to send analytics. Currently set to `['honestcardeal.com', 'www.honestcardeal.com', 'localhost', '127.0.0.1']` for Trinity. |

---

## Event Types and Their `event_data` Payloads

### 1. `page_view`
Fired automatically on every route change.

```json
{ }
```
Context is captured in top-level fields (`page_url`, `page_title`, `referrer`).

### 2. `inventory_list_view`
Fired once when the inventory page finishes loading data.

```json
{
  "total_vehicles": 42,
  "active_filters": 0
}
```

### 3. `vehicle_detail_view`
Fired once when a vehicle detail page loads. Only on initial view.

```json
{
  "vehicle_id": "uuid",
  "vin": "1HGBH41JXMN109186",
  "stock_number": "T1234",
  "year": 2024,
  "make": "Toyota",
  "model": "Camry",
  "trim": "SE",
  "price": 24995
}
```

### 4. `cta_click`
Fired when a visitor clicks a call-to-action button. The `cta_type` field distinguishes them.

| `cta_type` | Where | Description |
|---|---|---|
| `call` | Vehicle detail, homepage hero, footer, mobile FAB | Phone call initiated |
| `inquiry` | Vehicle detail | "Inquire About This Vehicle" clicked |
| `finance` | Vehicle detail | "Get Pre-Approved" clicked |
| `trade` | Vehicle detail | "Trade-In Your Vehicle" clicked |
| `carfax_view` | Vehicle detail | "View CARFAX Report" clicked |
| `browse_inventory` | Homepage hero | "Browse Inventory" CTA |
| `get_approved` | Homepage hero | "Get Approved Instantly" CTA |
| `contact` | Navigation bar | "Contact Us" button |

Additional fields vary by source:
```json
{
  "cta_type": "call",
  "source": "vehicle_detail",
  "vehicle_id": "uuid"
}
```

### 5. `lead_submission`
Fired after a form submission attempt completes (success or failure).

| `form_type` | Page | Description |
|---|---|---|
| `lead` | Homepage, Vehicle Detail, Vehicle Inquiry | General lead form |
| `contact` | Contact page | Contact message form |
| `credit_application` | Financing page | Full credit application |
| `trade_inquiry` | Trade-In page | Trade-in appraisal request |

```json
{
  "form_type": "lead",
  "success": true,
  "source": "vehicle_detail",
  "vehicle_id": "uuid"
}
```

The `source` field is present for `lead` type submissions:
- `homepage` -- homepage quick contact form
- `vehicle_detail` -- inline form on vehicle detail page
- `inquiry_page` -- dedicated vehicle inquiry page (also includes `inquiry_type`)

### 6. `scroll_depth`
Fired when the visitor scrolls past 25%, 50%, 75%, or 100% of the page. Each milestone fires only once per page view.

```json
{
  "depth_percent": 75
}
```

### 7. `time_on_page`
Fired when the visitor navigates away from a page (route change or tab close).

```json
{
  "seconds": 47,
  "url": "https://honestcardeal.com/inventory/2024-toyota-camry"
}
```

---

## Client-Side Behavior

### Session and Visitor Identity
- **`visitor_id`**: Stored in `localStorage` as `fdr_visitor_id`. Persists across sessions until the user clears browser data. Use this for unique visitor counts.
- **`session_id`**: Stored in `sessionStorage` as `fdr_session_id`. Resets when the tab/window closes. Use this for session-level analysis.

### Event Batching
- Events are queued in memory and flushed every **3 seconds** via `fetch()` with `keepalive: true`.
- If the queue reaches **20 events**, it flushes immediately.
- On page hide (`visibilitychange` to `hidden` or `pagehide`), the queue is flushed immediately.
- All tracking is **fire-and-forget** -- errors are silently swallowed and never block the UI.

### Kill Switch
Set `VITE_ANALYTICS_ENABLED=false` in the `.env` file (or set `analytics_enabled = false` on the dealer_info row) to disable all tracking. The client-side tracker will not enqueue or send any events.

---

## Environment Variables (Client-Side)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Base URL for the edge function endpoint |
| `VITE_FENDER_API_KEY` | API key sent with every analytics request |
| `VITE_DEALER_ID` | Dealer identifier (defaults to `trinity`) |
| `VITE_ANALYTICS_ENABLED` | Set to `false` to disable (defaults to `true`) |

---

## Querying the Data

### Example: Page views in the last 24 hours
```sql
SELECT page_url, COUNT(*) as views
FROM website_analytics_events
WHERE dealer_id = 'trinity'
  AND event_type = 'page_view'
  AND created_at > now() - interval '24 hours'
GROUP BY page_url
ORDER BY views DESC;
```

### Example: Most clicked CTAs
```sql
SELECT event_data->>'cta_type' as cta, COUNT(*) as clicks
FROM website_analytics_events
WHERE dealer_id = 'trinity'
  AND event_type = 'cta_click'
  AND created_at > now() - interval '7 days'
GROUP BY cta
ORDER BY clicks DESC;
```

### Example: Lead submission success rate by form type
```sql
SELECT
  event_data->>'form_type' as form,
  COUNT(*) FILTER (WHERE (event_data->>'success')::boolean = true) as successes,
  COUNT(*) FILTER (WHERE (event_data->>'success')::boolean = false) as failures
FROM website_analytics_events
WHERE dealer_id = 'trinity'
  AND event_type = 'lead_submission'
GROUP BY form;
```

### Example: Unique visitors per day
```sql
SELECT
  DATE(created_at) as day,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM website_analytics_events
WHERE dealer_id = 'trinity'
  AND created_at > now() - interval '30 days'
GROUP BY day
ORDER BY day DESC;
```

### Example: Average time on page by URL
```sql
SELECT
  event_data->>'url' as page,
  AVG((event_data->>'seconds')::int) as avg_seconds,
  COUNT(*) as samples
FROM website_analytics_events
WHERE dealer_id = 'trinity'
  AND event_type = 'time_on_page'
GROUP BY page
ORDER BY avg_seconds DESC;
```

### Example: Most viewed vehicles
```sql
SELECT
  event_data->>'year' || ' ' || event_data->>'make' || ' ' || event_data->>'model' as vehicle,
  event_data->>'vehicle_id' as id,
  COUNT(*) as views
FROM website_analytics_events
WHERE dealer_id = 'trinity'
  AND event_type = 'vehicle_detail_view'
GROUP BY vehicle, id
ORDER BY views DESC
LIMIT 20;
```

---

## Files Modified / Created

### New Files
| File | Purpose |
|---|---|
| `src/lib/analytics.ts` | Core analytics tracker (queue, flush, event helpers) |
| `src/hooks/useAnalytics.ts` | React hook wrapping tracker functions |
| `src/hooks/usePageTracking.ts` | Auto page view, scroll depth, time-on-page tracking |
| `supabase/functions/public-analytics-ingest/index.ts` | Edge function for receiving and storing events |

### Modified Files
| File | Change |
|---|---|
| `src/App.tsx` | Init analytics on mount; use `TrackedPublicLayout` with `usePageTracking` |
| `src/pages/Home.tsx` | CTA click tracking (hero buttons); lead submission tracking |
| `src/pages/Inventory.tsx` | `inventory_list_view` event on data load |
| `src/pages/VehicleDetails.tsx` | `vehicle_detail_view` on load; CTA clicks (call, inquiry, finance, trade, carfax); lead submission |
| `src/pages/Contact.tsx` | Lead submission tracking |
| `src/pages/Financing.tsx` | Lead submission tracking |
| `src/pages/TradeIn.tsx` | Lead submission tracking |
| `src/pages/VehicleInquiry.tsx` | Lead submission tracking |
| `src/components/Navigation.tsx` | CTA click tracking (Contact Us button) |
| `src/components/Footer.tsx` | CTA click tracking (phone link) |
| `src/components/MobileCallButton.tsx` | CTA click tracking (mobile call FAB) |
| `.env` | Added `VITE_DEALER_ID` and `VITE_ANALYTICS_ENABLED` |

### Database Migrations
| Migration | Description |
|---|---|
| `create_website_analytics_events` | Creates the events table with indexes and RLS policies |
| `add_analytics_settings_to_dealer_info` | Adds `analytics_enabled` and `analytics_allowed_domains` columns to `dealer_info` |
