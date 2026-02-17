/*
  # Create Admin User Account

  1. Creates admin user in auth.users
    - Email: trinitymotorcarcj@gmail.com
    - Password: Baker1980!
    - Email confirmed automatically
  
  2. Adds entry to admin_users table
    - Links to auth user
    - Sets role as 'admin'
    - Associates with 'trinity' dealer
  
  3. Security
    - User can immediately log in
    - Admin privileges granted via admin_users table
*/

DO $$
DECLARE
  new_user_id uuid;
  user_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'trinitymotorcarcj@gmail.com'
  ) INTO user_exists;

  IF NOT user_exists THEN
    -- Create the admin user in auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'trinitymotorcarcj@gmail.com',
      crypt('Baker1980!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;
  ELSE
    -- User exists, get their ID
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'trinitymotorcarcj@gmail.com';
  END IF;

  -- Ensure user is in admin_users table
  INSERT INTO public.admin_users (id, email, role, dealer_id)
  VALUES (new_user_id, 'trinitymotorcarcj@gmail.com', 'admin', 'trinity')
  ON CONFLICT (id) DO NOTHING;
  
END $$;
