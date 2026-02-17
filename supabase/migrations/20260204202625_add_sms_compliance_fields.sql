/*
  # Add SMS Compliance Fields for Telnyx 10DLC Requirements
  
  1. Overview
    This migration adds required SMS compliance tracking fields to all customer contact tables
    to meet Telnyx 10DLC and A2P messaging standards. These fields track opt-in consent,
    opt-out requests, and compliance documentation for regulatory audits.
  
  2. New Columns Added to: leads, finance_applications, trade_ins
    - sms_opt_in_status: Current opt-in status (opted_in / opted_out / unknown)
    - sms_opt_in_method: How consent was obtained (web_form / inbound_text / verbal / paper)
    - sms_opt_in_timestamp: When consent was granted
    - sms_opt_in_language_snapshot: Exact disclosure text shown to customer
    - sms_opt_out_timestamp: When customer opted out (if applicable)
    - sms_opt_out_keyword: Keyword used to opt out (STOP, CANCEL, etc.)
  
  3. Security
    - No RLS changes needed (inherits existing table policies)
  
  4. Compliance Notes
    - These fields enable full TCPA/10DLC compliance
    - Required for Telnyx carrier audit trail
    - Stores proof of consent for legal protection
*/

-- Add SMS compliance fields to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'sms_opt_in_status'
  ) THEN
    ALTER TABLE leads 
    ADD COLUMN sms_opt_in_status text DEFAULT 'unknown',
    ADD COLUMN sms_opt_in_method text DEFAULT NULL,
    ADD COLUMN sms_opt_in_timestamp timestamptz DEFAULT NULL,
    ADD COLUMN sms_opt_in_language_snapshot text DEFAULT NULL,
    ADD COLUMN sms_opt_out_timestamp timestamptz DEFAULT NULL,
    ADD COLUMN sms_opt_out_keyword text DEFAULT NULL;
  END IF;
END $$;

-- Add SMS compliance fields to finance_applications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'finance_applications' AND column_name = 'sms_opt_in_status'
  ) THEN
    ALTER TABLE finance_applications 
    ADD COLUMN sms_opt_in_status text DEFAULT 'unknown',
    ADD COLUMN sms_opt_in_method text DEFAULT NULL,
    ADD COLUMN sms_opt_in_timestamp timestamptz DEFAULT NULL,
    ADD COLUMN sms_opt_in_language_snapshot text DEFAULT NULL,
    ADD COLUMN sms_opt_out_timestamp timestamptz DEFAULT NULL,
    ADD COLUMN sms_opt_out_keyword text DEFAULT NULL;
  END IF;
END $$;

-- Add SMS compliance fields to trade_ins table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trade_ins' AND column_name = 'sms_opt_in_status'
  ) THEN
    ALTER TABLE trade_ins 
    ADD COLUMN sms_opt_in_status text DEFAULT 'unknown',
    ADD COLUMN sms_opt_in_method text DEFAULT NULL,
    ADD COLUMN sms_opt_in_timestamp timestamptz DEFAULT NULL,
    ADD COLUMN sms_opt_in_language_snapshot text DEFAULT NULL,
    ADD COLUMN sms_opt_out_timestamp timestamptz DEFAULT NULL,
    ADD COLUMN sms_opt_out_keyword text DEFAULT NULL;
  END IF;
END $$;

-- Create index for fast opt-out lookups
CREATE INDEX IF NOT EXISTS idx_leads_phone_opt_status ON leads(phone, sms_opt_in_status);
CREATE INDEX IF NOT EXISTS idx_finance_phone_opt_status ON finance_applications(phone, sms_opt_in_status);
CREATE INDEX IF NOT EXISTS idx_trade_ins_phone_opt_status ON trade_ins(phone, sms_opt_in_status);