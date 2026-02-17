import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  mileage: number;
  vin: string;
  exterior_color: string;
  interior_color: string;
  transmission: string;
  fuel_type: string;
  body_style: string;
  images: string[];
  features: string[];
  description: string;
  is_featured: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  source: string;
}

export interface FinanceApplication {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ssn_last_four: string;
  date_of_birth: string;
  employment_status: string;
  employer_name?: string;
  monthly_income: number;
  housing_status: string;
  monthly_housing_payment: number;
  vehicle_interest?: string;
}

export interface TradeIn {
  customer_name: string;
  phone: string;
  email?: string;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  mileage: number;
  condition: string;
  vin?: string;
  payoff_amount?: number;
  notes?: string;
}
