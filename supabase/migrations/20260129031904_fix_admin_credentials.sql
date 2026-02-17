/*
  # Fix Admin User Credentials

  1. Updates
    - Reset password for trinitymotorcarcj@gmail.com to 'Baker1980!'
    - Add admin role to user metadata
    - Confirm email verification
  
  2. Security
    - Ensures admin has proper access privileges
*/

-- Update the admin user with correct password and role
UPDATE auth.users
SET 
  encrypted_password = crypt('Baker1980!', gen_salt('bf')),
  email_confirmed_at = now(),
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email'],
    'role', 'admin'
  ),
  updated_at = now()
WHERE email = 'trinitymotorcarcj@gmail.com';
