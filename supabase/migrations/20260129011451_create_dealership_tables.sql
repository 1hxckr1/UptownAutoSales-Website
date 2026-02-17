/*
  # Trinity Motorcar Company Database Schema
  
  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `year` (integer) - Vehicle year
      - `make` (text) - Vehicle manufacturer
      - `model` (text) - Vehicle model
      - `trim` (text, optional) - Vehicle trim level
      - `price` (numeric) - Listing price
      - `mileage` (integer) - Current mileage
      - `vin` (text, unique) - Vehicle identification number
      - `exterior_color` (text) - Exterior color
      - `interior_color` (text) - Interior color
      - `transmission` (text) - Transmission type
      - `fuel_type` (text) - Fuel type
      - `body_style` (text) - Body style (sedan, SUV, truck, etc.)
      - `images` (jsonb) - Array of image URLs
      - `features` (jsonb) - Array of vehicle features
      - `description` (text) - Vehicle description
      - `is_featured` (boolean) - Whether shown on homepage
      - `status` (text) - Available, Sold, Pending
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `leads`
      - `id` (uuid, primary key)
      - `name` (text) - Customer name
      - `phone` (text) - Phone number
      - `email` (text, optional) - Email address
      - `message` (text) - Customer message
      - `source` (text) - Form source (contact, hero, inventory)
      - `status` (text) - New, Contacted, Converted, Closed
      - `created_at` (timestamptz)
    
    - `finance_applications`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `email` (text)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip` (text)
      - `ssn_last_four` (text)
      - `date_of_birth` (date)
      - `employment_status` (text)
      - `employer_name` (text, optional)
      - `monthly_income` (numeric)
      - `housing_status` (text) - Rent, Own, Other
      - `monthly_housing_payment` (numeric)
      - `vehicle_interest` (uuid, optional) - References vehicles
      - `status` (text) - Pending, Approved, Denied, In Review
      - `created_at` (timestamptz)
    
    - `trade_ins`
      - `id` (uuid, primary key)
      - `customer_name` (text)
      - `phone` (text)
      - `email` (text, optional)
      - `vehicle_year` (integer)
      - `vehicle_make` (text)
      - `vehicle_model` (text)
      - `mileage` (integer)
      - `condition` (text) - Excellent, Good, Fair, Poor
      - `vin` (text, optional)
      - `payoff_amount` (numeric, optional)
      - `estimated_value` (numeric, optional)
      - `notes` (text, optional)
      - `status` (text) - New, Reviewed, Offered, Accepted, Declined
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Public read access for vehicles (inventory is public)
    - Authenticated write access for admin operations
    - Public insert for leads, finance applications, and trade-ins (customer submissions)
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  trim text DEFAULT '',
  price numeric NOT NULL,
  mileage integer NOT NULL,
  vin text UNIQUE,
  exterior_color text DEFAULT '',
  interior_color text DEFAULT '',
  transmission text DEFAULT 'Automatic',
  fuel_type text DEFAULT 'Gasoline',
  body_style text DEFAULT '',
  images jsonb DEFAULT '[]'::jsonb,
  features jsonb DEFAULT '[]'::jsonb,
  description text DEFAULT '',
  is_featured boolean DEFAULT false,
  status text DEFAULT 'Available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text DEFAULT '',
  message text DEFAULT '',
  source text DEFAULT 'contact',
  status text DEFAULT 'New',
  created_at timestamptz DEFAULT now()
);

-- Create finance_applications table
CREATE TABLE IF NOT EXISTS finance_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  zip text DEFAULT '',
  ssn_last_four text DEFAULT '',
  date_of_birth date,
  employment_status text DEFAULT '',
  employer_name text DEFAULT '',
  monthly_income numeric DEFAULT 0,
  housing_status text DEFAULT '',
  monthly_housing_payment numeric DEFAULT 0,
  vehicle_interest uuid,
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

-- Create trade_ins table
CREATE TABLE IF NOT EXISTS trade_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text DEFAULT '',
  vehicle_year integer NOT NULL,
  vehicle_make text NOT NULL,
  vehicle_model text NOT NULL,
  mileage integer NOT NULL,
  condition text DEFAULT 'Good',
  vin text DEFAULT '',
  payoff_amount numeric DEFAULT 0,
  estimated_value numeric DEFAULT 0,
  notes text DEFAULT '',
  status text DEFAULT 'New',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ins ENABLE ROW LEVEL SECURITY;

-- Vehicles policies (public read)
CREATE POLICY "Anyone can view available vehicles"
  ON vehicles FOR SELECT
  USING (status = 'Available');

CREATE POLICY "Authenticated users can manage vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Leads policies (public insert, authenticated read)
CREATE POLICY "Anyone can submit leads"
  ON leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Finance applications policies (public insert, authenticated read)
CREATE POLICY "Anyone can submit finance applications"
  ON finance_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view finance applications"
  ON finance_applications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update finance applications"
  ON finance_applications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trade-ins policies (public insert, authenticated read)
CREATE POLICY "Anyone can submit trade-ins"
  ON trade_ins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view trade-ins"
  ON trade_ins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update trade-ins"
  ON trade_ins FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_featured ON vehicles(is_featured);
CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_finance_applications_status ON finance_applications(status);