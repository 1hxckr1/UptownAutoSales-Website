/*
  # Update Admin User Password

  1. Updates the password for the admin user
    - Email: trinitymotorcarcj@gmail.com
    - Password: Baker1980!
    - Uses extensions.crypt for proper password encryption
  
  2. Security
    - Password is properly hashed using bcrypt
    - User can immediately log in with new password
*/

-- Update the admin user's password
UPDATE auth.users 
SET 
  encrypted_password = extensions.crypt('Baker1980!', extensions.gen_salt('bf')),
  updated_at = now()
WHERE email = 'trinitymotorcarcj@gmail.com';
