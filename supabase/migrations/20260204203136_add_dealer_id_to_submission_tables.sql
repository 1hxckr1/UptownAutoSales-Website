/*
  # Add dealer_id to submission tables
  
  1. Changes
    - Add dealer_id column to leads table
    - Add dealer_id column to finance_applications table
    - Add dealer_id column to trade_ins table
    - Set default value to 'trinity' for backward compatibility
    
  2. Security
    - No RLS changes needed (tables already have RLS enabled)
*/

-- Add dealer_id to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS dealer_id text DEFAULT 'trinity' NOT NULL;

-- Add dealer_id to finance_applications table
ALTER TABLE finance_applications 
ADD COLUMN IF NOT EXISTS dealer_id text DEFAULT 'trinity' NOT NULL;

-- Add dealer_id to trade_ins table
ALTER TABLE trade_ins 
ADD COLUMN IF NOT EXISTS dealer_id text DEFAULT 'trinity' NOT NULL;
