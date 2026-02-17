/*
  # Create Reviews Table

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key) - Unique identifier for the review
      - `author_name` (text, required) - Name of the person who wrote the review
      - `rating` (integer, required) - Star rating (1-5)
      - `review_text` (text, required) - The actual review content
      - `review_date` (date, required) - Date the review was posted
      - `is_featured` (boolean, default false) - Whether to display on homepage
      - `display_order` (integer, default 0) - Order to display featured reviews
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `reviews` table
    - Add policy for public read access to featured reviews
    - Add policy for authenticated admin users to manage reviews

  3. Sample Data
    - Insert 3 sample reviews for display
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  review_date date NOT NULL,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public can read featured reviews
CREATE POLICY "Anyone can view featured reviews"
  ON reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_featured = true);

-- Authenticated users can view all reviews
CREATE POLICY "Authenticated users can view all reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert reviews
CREATE POLICY "Authenticated users can insert reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update reviews
CREATE POLICY "Authenticated users can update reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete reviews
CREATE POLICY "Authenticated users can delete reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(is_featured, display_order);

-- Insert 3 sample reviews
INSERT INTO reviews (author_name, rating, review_text, review_date, is_featured, display_order) VALUES
  (
    'Sarah Johnson',
    5,
    'Absolutely incredible experience at Trinity Motorcar! The team went above and beyond to help me find the perfect vehicle. The selection was outstanding, and the customer service was second to none. I drove away in my dream car and couldn''t be happier!',
    '2024-01-15',
    true,
    1
  ),
  (
    'Michael Rodriguez',
    5,
    'Best car buying experience I''ve ever had. The staff was knowledgeable, professional, and genuinely cared about finding the right fit for me. No pressure, just excellent service. The financing process was smooth and transparent. Highly recommend Trinity Motorcar!',
    '2024-01-08',
    true,
    2
  ),
  (
    'Emily Chen',
    5,
    'Trinity Motorcar exceeded all my expectations! From the moment I walked in, I felt valued as a customer. They took the time to understand what I was looking for and presented options that perfectly matched my needs. The entire process was seamless and enjoyable.',
    '2023-12-20',
    true,
    3
  );