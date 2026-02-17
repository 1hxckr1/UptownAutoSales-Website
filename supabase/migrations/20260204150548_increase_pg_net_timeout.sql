/*
  # Increase pg_net Timeout for Inventory Sync
  
  1. Changes
    - Increase timeout_milliseconds to 120000 (120 seconds)
    - Edge Function needs time to:
      - Fetch from Fender-AI API
      - Process and upsert vehicles
      - Update sync history
  
  2. Default pg_net timeout is 5000ms (5 seconds)
    - This is too short for a full inventory sync
    - Sync can take 30-60 seconds for large inventories
*/

-- Update trigger_inventory_sync with longer timeout
DROP FUNCTION IF EXISTS trigger_inventory_sync() CASCADE;

CREATE OR REPLACE FUNCTION trigger_inventory_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  cron_secret text;
  anon_key text;
  supabase_url text := 'https://apaaabypiufsboprsqvn.supabase.co';
  edge_function_url text;
  request_id bigint;
  log_id bigint;
  http_response RECORD;
  poll_attempts int := 0;
  max_polls int := 10;
BEGIN
  -- Get the cron secret for internal authentication
  SELECT value INTO cron_secret
  FROM internal_secrets
  WHERE key = 'INTERNAL_CRON_SECRET';
  
  IF cron_secret IS NULL THEN
    RAISE EXCEPTION 'INTERNAL_CRON_SECRET not found';
  END IF;
  
  -- Get the anon key for gateway authentication
  SELECT value INTO anon_key
  FROM internal_secrets
  WHERE key = 'SUPABASE_ANON_KEY';
  
  IF anon_key IS NULL THEN
    RAISE EXCEPTION 'SUPABASE_ANON_KEY not found';
  END IF;
  
  -- Construct Edge Function URL
  edge_function_url := supabase_url || '/functions/v1/inventory-sync-run';
  
  -- Log the attempt
  RAISE NOTICE 'Triggering inventory sync via pg_net to % with anon key auth + cron secret', edge_function_url;
  
  -- Make HTTP POST request to Edge Function with 120 second timeout
  SELECT INTO request_id net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key,
      'X-Cron-Secret', cron_secret
    ),
    body := jsonb_build_object(
      'trigger_source', 'cron',
      'timestamp', extract(epoch from now())
    ),
    timeout_milliseconds := 120000
  );
  
  -- Create initial log entry
  INSERT INTO cron_sync_logs (request_id, created_at)
  VALUES (request_id, NOW())
  RETURNING id INTO log_id;
  
  -- Poll for response (with bounded retries)
  WHILE poll_attempts < max_polls LOOP
    SELECT * INTO http_response
    FROM net._http_response
    WHERE id = request_id;
    
    IF FOUND THEN
      -- Update log with response
      UPDATE cron_sync_logs
      SET 
        http_status = http_response.status_code,
        response_body = LEFT(http_response.content, 5000),
        error_msg = http_response.error_msg
      WHERE id = log_id;
      
      -- Return success with details
      RETURN jsonb_build_object(
        'success', true,
        'message', 'HTTP request completed',
        'request_id', request_id,
        'log_id', log_id,
        'http_status', http_response.status_code,
        'response_preview', LEFT(http_response.content, 200),
        'edge_function_url', edge_function_url,
        'timestamp', now()
      );
    END IF;
    
    -- Wait before next poll (0.5 seconds)
    PERFORM pg_sleep(0.5);
    poll_attempts := poll_attempts + 1;
  END LOOP;
  
  -- If we get here, response wasn't received in time (async)
  UPDATE cron_sync_logs
  SET error_msg = 'Response pending (async)'
  WHERE id = log_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'HTTP request initiated (async)',
    'request_id', request_id,
    'log_id', log_id,
    'note', 'Response will be logged asynchronously',
    'edge_function_url', edge_function_url,
    'timestamp', now()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    IF log_id IS NOT NULL THEN
      UPDATE cron_sync_logs
      SET error_msg = SQLERRM
      WHERE id = log_id;
    END IF;
    
    RAISE WARNING 'Error in trigger_inventory_sync: % %', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'timestamp', now()
    );
END;
$$;

-- Update test_cron_sync with longer timeout
DROP FUNCTION IF EXISTS test_cron_sync() CASCADE;

CREATE OR REPLACE FUNCTION test_cron_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  cron_secret text;
  anon_key text;
  supabase_url text := 'https://apaaabypiufsboprsqvn.supabase.co';
  edge_function_url text;
  request_id bigint;
  log_id bigint;
  http_response RECORD;
  poll_attempts int := 0;
  max_polls int := 240;  -- 240 polls x 0.5s = 120 seconds max wait
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
  
  -- Check for ANON_KEY
  SELECT value INTO anon_key
  FROM internal_secrets
  WHERE key = 'SUPABASE_ANON_KEY';
  
  diagnostics := diagnostics || jsonb_build_object(
    'anon_key_found', anon_key IS NOT NULL,
    'anon_key_prefix', CASE 
      WHEN anon_key IS NOT NULL THEN LEFT(anon_key, 20) || '...'
      ELSE NULL
    END
  );
  
  IF anon_key IS NULL THEN
    diagnostics := diagnostics || jsonb_build_object('error', 'SUPABASE_ANON_KEY not found');
    RETURN diagnostics;
  END IF;
  
  -- Construct Edge Function URL
  edge_function_url := supabase_url || '/functions/v1/inventory-sync-run';
  
  diagnostics := diagnostics || jsonb_build_object(
    'edge_function_url', edge_function_url,
    'request_method', 'POST',
    'auth_method', 'anon_key + X-Cron-Secret',
    'timeout_ms', 120000
  );
  
  -- Make HTTP POST request to Edge Function with 120 second timeout
  SELECT INTO request_id net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key,
      'X-Cron-Secret', cron_secret
    ),
    body := jsonb_build_object(
      'trigger_source', 'manual_test',
      'timestamp', extract(epoch from now())
    ),
    timeout_milliseconds := 120000
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
  
  -- Poll for response (up to 120 seconds)
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
        'poll_attempts', poll_attempts + 1,
        'wait_time_seconds', (poll_attempts + 1) * 0.5
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
  SET error_msg = 'Manual test - response pending after ' || max_polls || ' polls (120s)'
  WHERE id = log_id;
  
  diagnostics := diagnostics || jsonb_build_object(
    'response_received', false,
    'note', 'Response not received after ' || max_polls || ' polling attempts (120 seconds)',
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

GRANT EXECUTE ON FUNCTION test_cron_sync() TO authenticated;

COMMENT ON FUNCTION test_cron_sync() IS 'Manual test function with 120s timeout for full inventory sync testing';
