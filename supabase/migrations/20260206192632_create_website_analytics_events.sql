/*
  # Website Analytics Events Table

  1. New Tables
    - `website_analytics_events`
      - `id` (uuid, primary key) - unique event identifier
      - `dealer_id` (text, not null) - which dealer this event belongs to
      - `session_id` (text, not null) - browser session identifier
      - `visitor_id` (text, not null) - persistent visitor identifier (localStorage)
      - `event_type` (text, not null) - type of event (page_view, cta_click, lead_submission, etc.)
      - `event_data` (jsonb) - flexible payload with event-specific metadata
      - `page_url` (text) - full URL of the page where the event occurred
      - `page_title` (text) - document title at time of event
      - `referrer` (text) - document.referrer value
      - `user_agent` (text) - browser user agent string
      - `created_at` (timestamptz) - when the event was recorded

  2. Indexes
    - Composite index on (dealer_id, created_at DESC) for dashboard time-range queries
    - Composite index on (dealer_id, event_type) for filtering by event type
    - Index on visitor_id for unique visitor counting

  3. Security
    - Enable RLS on `website_analytics_events`
    - INSERT-only policy for anon role (website visitors can only write, never read)
    - SELECT policy for authenticated admin users via dealer_id lookup
*/

CREATE TABLE IF NOT EXISTS website_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id text NOT NULL,
  session_id text NOT NULL,
  visitor_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  page_url text,
  page_title text,
  referrer text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_dealer_created
  ON website_analytics_events (dealer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_dealer_event_type
  ON website_analytics_events (dealer_id, event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_visitor
  ON website_analytics_events (visitor_id);

ALTER TABLE website_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can insert analytics events"
  ON website_analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated admins can read analytics for their dealer"
  ON website_analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.dealer_id = website_analytics_events.dealer_id
    )
  );
