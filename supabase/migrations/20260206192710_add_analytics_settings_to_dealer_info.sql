/*
  # Add Analytics Settings to dealer_info

  1. Modified Tables
    - `dealer_info`
      - Added `analytics_enabled` (boolean, default true) - kill switch for analytics collection
      - Added `analytics_allowed_domains` (text array) - whitelist of domains allowed to send analytics

  2. Data Update
    - Sets Trinity's allowed domains to include production and local development

  3. Important Notes
    - analytics_enabled defaults to true so analytics works immediately
    - The edge function validates Origin/Referer against analytics_allowed_domains
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dealer_info' AND column_name = 'analytics_enabled'
  ) THEN
    ALTER TABLE dealer_info ADD COLUMN analytics_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dealer_info' AND column_name = 'analytics_allowed_domains'
  ) THEN
    ALTER TABLE dealer_info ADD COLUMN analytics_allowed_domains text[] DEFAULT '{}';
  END IF;
END $$;

UPDATE dealer_info
SET
  analytics_enabled = true,
  analytics_allowed_domains = ARRAY['honestcardeal.com', 'www.honestcardeal.com', 'localhost', '127.0.0.1']
WHERE analytics_allowed_domains IS NULL OR analytics_allowed_domains = '{}';
