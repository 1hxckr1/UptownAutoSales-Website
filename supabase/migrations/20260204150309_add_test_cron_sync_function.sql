/*
  # Add Test Cron Sync Function
  
  1. New Function
    - `test_cron_sync()` - Manual testing function that mimics cron behavior
      - Performs the exact same pg_net call as the cron job
      - Returns full diagnostics for debugging
      - Shows secret status, headers (redacted), request details, response
  
  2. Purpose
    - Allow admins to test cron sync path without waiting for scheduled run
    - Provides detailed diagnostics for troubleshooting
    - Validates gateway authentication is working
  
  3. Security
    - SECURITY DEFINER to access internal_secrets
    - Only callable by authenticated users
*/

CREATE OR REPLACE FUNCTION test_cron_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  cron_secret text;
  service_role_key text;
  anon_key text;
  supabase_url text := 'https://apaaabypiufsboprsqvn.supabase.co';
  edge_function_url text;
  request_id bigint;
  log_id bigint;
  http_response RECORD;
  poll_attempts int := 0;
  max_polls int := 15;
  diagnostics jsonb;
BEGIN
  -- Build diagnostics object
  diagnostics := jsonb_build_object();
  
  -- Check for INTERNAL_CRON_SECRET
  SELECT value INTO cron_secret
  FROM internal_secrets
  WHERE key = 'INTERNAL_CRON_SECRET';
  
  diagnostics := diagnostics || jsonb_build_object(
    'cron_secret_found', cron_secret IS NOT NULL,
    'cron_secret_length', CASE WHEN cron_secret IS NOT NULL THEN LENGTH(cron_secret) ELSE 0 END
  );
  
  IF cron_secret IS NULL THEN
    diagnostics := diagnostics || jsonb_build_object('error', 'INTERNAL_CRON_SECRET not found');
    RETURN diagnostics;
  END IF;
  
  -- Check for SERVICE_ROLE_KEY
  SELECT value INTO service_role_key
  FROM internal_secrets
  WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';
  
  diagnostics := diagnostics || jsonb_build_object(
    'service_role_key_found', service_role_key IS NOT NULL,
    'service_role_key_prefix', CASE 
      WHEN service_role_key IS NOT NULL THEN LEFT(service_role_key, 20) || '...'
      ELSE NULL
    END
  );
  
  -- Check for ANON_KEY
  SELECT value INTO anon_key
  FROM internal_secrets
  WHERE key = 'SUPABASE_ANON_KEY';
  
  diagnostics := diagnostics || jsonb_build_object(
    'anon_key_found', anon_key IS NOT NULL
  );
  
  -- Construct Edge Function URL
  edge_function_url := supabase_url || '/functions/v1/inventory-sync-run';
  
  diagnostics := diagnostics || jsonb_build_object(
    'edge_function_url', edge_function_url,
    'request_method', 'POST'
  );
  
  -- Show which auth method will be used
  diagnostics := diagnostics || jsonb_build_object(
    'auth_method', CASE 
      WHEN service_role_key IS NOT NULL THEN 'service_role'
      WHEN anon_key IS NOT NULL THEN 'anon_key'
      ELSE 'none'
    END
  );
  
  -- Make HTTP POST request to Edge Function
  SELECT INTO request_id net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CASE 
        WHEN service_role_key IS NOT NULL THEN 'Bearer ' || service_role_key
        ELSE 'Bearer ' || anon_key
      END,
      'apikey', COALESCE(anon_key, ''),
      'X-Cron-Secret', cron_secret
    ),
    body := jsonb_build_object(
      'trigger_source', 'manual_test',
      'timestamp', extract(epoch from now())
    )
  );
  
  diagnostics := diagnostics || jsonb_build_object(
    'request_id', request_id,
    'request_initiated_at', now()
  );
  
  -- Create log entry
  INSERT INTO cron_sync_logs (request_id, error_msg, created_at)
  VALUES (request_id, 'Manual test via test_cron_sync()', NOW())
  RETURNING id INTO log_id;
  
  diagnostics := diagnostics || jsonb_build_object('log_id', log_id);
  
  -- Poll for response
  WHILE poll_attempts < max_polls LOOP
    SELECT * INTO http_response
    FROM net._http_response
    WHERE id = request_id;
    
    IF FOUND THEN
      -- Update log with response
      UPDATE cron_sync_logs
      SET 
        http_status = http_response.status_code,
        response_body = http_response.content,
        error_msg = COALESCE(http_response.error_msg, 'Manual test via test_cron_sync()')
      WHERE id = log_id;
      
      -- Add response to diagnostics
      diagnostics := diagnostics || jsonb_build_object(
        'http_status', http_response.status_code,
        'content_type', http_response.content_type,
        'response_received', true,
        'timed_out', http_response.timed_out,
        'error_msg', http_response.error_msg,
        'response_body', http_response.content,
        'response_body_length', LENGTH(http_response.content),
        'poll_attempts', poll_attempts + 1
      );
      
      -- Parse response if JSON
      IF http_response.content_type LIKE '%json%' AND http_response.content IS NOT NULL THEN
        BEGIN
          diagnostics := diagnostics || jsonb_build_object(
            'response_parsed', http_response.content::jsonb
          );
        EXCEPTION WHEN OTHERS THEN
          diagnostics := diagnostics || jsonb_build_object(
            'response_parse_error', SQLERRM
          );
        END;
      END IF;
      
      RETURN diagnostics;
    END IF;
    
    PERFORM pg_sleep(0.5);
    poll_attempts := poll_attempts + 1;
  END LOOP;
  
  -- Response not received in time
  UPDATE cron_sync_logs
  SET error_msg = 'Manual test - response pending after ' || max_polls || ' polls'
  WHERE id = log_id;
  
  diagnostics := diagnostics || jsonb_build_object(
    'response_received', false,
    'note', 'Response not received after ' || max_polls || ' polling attempts',
    'poll_attempts', poll_attempts
  );
  
  RETURN diagnostics;
  
EXCEPTION
  WHEN OTHERS THEN
    diagnostics := diagnostics || jsonb_build_object(
      'exception', true,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
    RETURN diagnostics;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_cron_sync() TO authenticated;

COMMENT ON FUNCTION test_cron_sync() IS 'Manual test function that mimics cron sync behavior and returns detailed diagnostics';
