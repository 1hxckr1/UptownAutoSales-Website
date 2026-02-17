import { useState, useEffect } from 'react';
import { Settings, History, Save, TestTube, RefreshCw, CheckCircle, XCircle, Clock, Loader2, FileSearch } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { auditInventoryVins } from '../../lib/carfax';

type Tab = 'settings' | 'history' | 'cron' | 'vin-audit';

interface ApiConfig {
  id?: string;
  endpoint_base: string;
  api_key_encrypted: string;
  is_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at?: string;
}

interface SyncHistory {
  id: string;
  status: string;
  records_created: number;
  records_updated: number;
  records_disabled: number;
  total_records_processed: number;
  duration_ms: number;
  triggered_by: string;
  trigger_source?: string;
  invoked_by_user_id?: string;
  started_at: string;
  completed_at: string;
}

interface CronSyncLog {
  id: number;
  cron_run_id?: string;
  request_id: number;
  http_status?: number;
  response_body?: string;
  error_msg?: string;
  created_at: string;
}

interface CronHealthStats {
  lastCronExecution?: string;
  lastHttpStatus?: number;
  lastSuccessfulSync?: string;
  failedAttemptsLast24h: number;
  recentLogs: CronSyncLog[];
}

export default function InventorySync() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [config, setConfig] = useState<ApiConfig>({
    endpoint_base: '',
    api_key_encrypted: '',
    is_enabled: true,
    sync_interval_minutes: 15,
  });
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [lastSync, setLastSync] = useState<SyncHistory | null>(null);
  const [cronHealth, setCronHealth] = useState<CronHealthStats | null>(null);
  const [testingCron, setTestingCron] = useState(false);
  const [cronTestResult, setCronTestResult] = useState<any>(null);
  const [vinAudit, setVinAudit] = useState<any>(null);
  const [auditingVins, setAuditingVins] = useState(false);

  useEffect(() => {
    loadConfig();
    loadSyncHistory();
    loadCronHealth();
    validateProjectSetup();
  }, []);

  const validateProjectSetup = () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 SUPABASE PROJECT VALIDATION');
    console.log('═══════════════════════════════════════════════════════════');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('📌 VITE_SUPABASE_URL:', supabaseUrl);

    // Extract project ref from URL
    const urlMatch = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/);
    const projectRef = urlMatch ? urlMatch[1] : 'unknown';
    console.log('📌 Project Ref:', projectRef);

    // Decode anon key to verify project ref
    try {
      const parts = anonKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('📌 Anon Key Payload:', {
          iss: payload.iss,
          ref: payload.ref,
          role: payload.role,
          exp: new Date(payload.exp * 1000).toISOString(),
        });

        if (payload.ref !== projectRef) {
          console.error('❌ MISMATCH: Anon key ref does not match URL project ref!');
          console.error('   URL Project Ref:', projectRef);
          console.error('   Anon Key Ref:', payload.ref);
        } else {
          console.log('✅ Project ref matches between URL and anon key');
        }
      }
    } catch (err) {
      console.error('❌ Failed to decode anon key:', err);
    }

    console.log('');
    console.log('📋 NEXT STEPS IF GETTING 401 ERRORS:');
    console.log('1. Run "Test Gateway" button below');
    console.log('2. If both functions return 401:');
    console.log('   → Supabase Dashboard → Project Settings → API');
    console.log('   → Check if JWT_SECRET was recently rotated');
    console.log('   → If rotated, click "Hard Auth Reset" and re-login');
    console.log('3. Check Edge Functions configuration:');
    console.log('   → Supabase Dashboard → Edge Functions');
    console.log('   → Verify functions are deployed correctly');
    console.log('   → Check for any global JWT enforcement settings');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_api_config')
        .select('*')
        .eq('dealer_id', 'trinity')
        .maybeSingle();

      if (!error && data) {
        setConfig(data);
        setShowApiKey(false);
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  };

  const loadSyncHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setSyncHistory(data);
        if (data.length > 0) {
          setLastSync(data[0]);
        }
      }
    } catch (err) {
      console.error('Error loading sync history:', err);
    }
  };

  const loadCronHealth = async () => {
    try {
      const { data: logs, error: logsError } = await supabase
        .from('cron_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.error('Error loading cron logs:', logsError);
        return;
      }

      const { data: cronSyncs, error: cronSyncsError } = await supabase
        .from('sync_history')
        .select('*')
        .eq('trigger_source', 'cron')
        .eq('status', 'success')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cronSyncsError) {
        console.error('Error loading cron syncs:', cronSyncsError);
      }

      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const failedCount = logs?.filter(log =>
        log.created_at > last24h &&
        (log.http_status !== 200 || log.error_msg)
      ).length || 0;

      const lastLog = logs && logs.length > 0 ? logs[0] : null;

      setCronHealth({
        lastCronExecution: lastLog?.created_at,
        lastHttpStatus: lastLog?.http_status,
        lastSuccessfulSync: cronSyncs?.started_at,
        failedAttemptsLast24h: failedCount,
        recentLogs: logs || []
      });
    } catch (err) {
      console.error('Error loading cron health:', err);
    }
  };

  const handleTestCronPath = async () => {
    setTestingCron(true);
    setCronTestResult(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('test_cron_sync');

      if (error) {
        setMessage({ type: 'error', text: `Test failed: ${error.message}` });
        console.error('Test cron sync error:', error);
        return;
      }

      setCronTestResult(data);

      if (data.http_status === 200) {
        setMessage({ type: 'success', text: 'Cron path test successful! Gateway auth is working.' });
      } else if (data.http_status) {
        setMessage({ type: 'error', text: `Cron path returned HTTP ${data.http_status}. Check test results below.` });
      } else if (data.error) {
        setMessage({ type: 'error', text: `Test error: ${data.error}` });
      } else {
        setMessage({ type: 'error', text: 'Test completed but response not received. Check logs table.' });
      }

      await loadCronHealth();
    } catch (err) {
      setMessage({ type: 'error', text: `Test failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
      console.error('Exception testing cron:', err);
    } finally {
      setTestingCron(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Validate required fields
      if (!config.endpoint_base.trim()) {
        setMessage({ type: 'error', text: 'Fender DMS Base URL is required' });
        setLoading(false);
        return;
      }

      // If no existing key and no new key provided, show error
      if (!config.api_key_encrypted && !apiKey.trim()) {
        setMessage({ type: 'error', text: 'API Key is required. Please paste your Fender API key.' });
        setLoading(false);
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session?.access_token || sessionError) {
        setMessage({ type: 'error', text: 'Please sign in again' });
        setLoading(false);
        return;
      }

      const payload: any = {
        endpoint_base: config.endpoint_base.trim(),
        is_enabled: config.is_enabled,
        sync_interval_minutes: config.sync_interval_minutes,
      };

      // Only include api_key if user typed something
      if (apiKey.trim()) {
        payload.api_key = apiKey.trim();
      }

      const { data: result, error: invokeError } = await supabase.functions.invoke('api-config-save', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        console.error('[SAVE SETTINGS] Error:', invokeError);
        setMessage({
          type: 'error',
          text: `Failed to save: ${invokeError.message}`
        });
        return;
      }

      if (result?.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setApiKey('');
        await loadConfig();
      } else {
        const errorMsg = result?.error || result?.message || 'Unknown error';
        const debugInfo = result?.debug ? ` (Debug: ${JSON.stringify(result.debug)})` : '';
        setMessage({ type: 'error', text: `Failed to save: ${errorMsg}${debugInfo}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save settings: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (!session?.access_token || error) {
        setMessage({ type: 'error', text: 'Session expired. Please refresh the page and sign in again.' });
        setTesting(false);
        return;
      }

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const accessToken = session.access_token;

      console.log('[DIAGNOSTICS] === Header Comparison ===');
      console.log('[DIAGNOSTICS] A) ANON KEY (from env, used as apikey):', {
        first12: anonKey.substring(0, 12),
        last6: anonKey.substring(anonKey.length - 6),
        length: anonKey.length,
        fullKey: anonKey,
      });

      console.log('[DIAGNOSTICS] B) ACCESS TOKEN (from session, used in Authorization):', {
        first12: accessToken.substring(0, 12),
        last6: accessToken.substring(accessToken.length - 6),
        length: accessToken.length,
        fullToken: accessToken,
      });

      console.log('[DIAGNOSTICS] C) Are they different?', {
        sameFirst12: anonKey.substring(0, 12) === accessToken.substring(0, 12),
        sameLast6: anonKey.substring(anonKey.length - 6) === accessToken.substring(accessToken.length - 6),
        sameLength: anonKey.length === accessToken.length,
        areIdentical: anonKey === accessToken,
      });

      const jwtParts = accessToken.split('.');
      if (jwtParts.length === 3) {
        const payload = JSON.parse(atob(jwtParts[1]));
        console.log('[DIAGNOSTICS] D) JWT Payload (access token):', {
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          expDate: new Date(payload.exp * 1000).toISOString(),
          isExpired: payload.exp * 1000 < Date.now(),
          role: payload.role,
        });
      }

      console.log('[DIAGNOSTICS] E) Supabase client config:', {
        url: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      });

      console.log('[DIAGNOSTICS] F) Calling supabase.functions.invoke with explicit Authorization header...');
      const { data: result, error: invokeError } = await supabase.functions.invoke('inventory-sync-run', {
        body: { test_only: true },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[DIAGNOSTICS] G) Invoke result:', {
        hasError: !!invokeError,
        error: invokeError,
        hasData: !!result,
        data: result,
      });

      if (invokeError) {
        console.error('[DIAGNOSTICS] Invoke error details:', invokeError);
        console.error('[DIAGNOSTICS] Full error object:', JSON.stringify(invokeError, null, 2));
        console.error('[DIAGNOSTICS] Result/body:', result);

        const statusCode = (invokeError as any).status || (invokeError as any).statusCode || 'unknown';
        let errorMessage = `Authentication failed (${statusCode}): ${invokeError.message}`;
        if (result) {
          errorMessage += ` | Response: ${JSON.stringify(result)}`;
        }

        setMessage({
          type: 'error',
          text: `${errorMessage}. Check console for full diagnostics (A-G).`
        });
        setTesting(false);
        return;
      }

      if (result?.success) {
        setMessage({ type: 'success', text: `Connection test successful! Found ${result.vehicle_count || 0} vehicles in Fender-AI inventory.` });
      } else {
        const errorDetails = result?.debug ? ` Debug: ${JSON.stringify(result.debug)}` : '';
        const fenderDetails = result?.bodyPreview ? ` Fender response: ${result.bodyPreview.substring(0, 200)}` : '';
        setMessage({ type: 'error', text: `Test failed: ${result?.error || result?.message || 'Connection test failed'}${errorDetails}${fenderDetails}` });
      }
    } catch (err) {
      console.error('[DIAGNOSTICS] Exception:', err);
      setMessage({ type: 'error', text: `Connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setTesting(false);
    }
  };

  const testGateway = async () => {
    console.log('[GATEWAY TEST] ========================================');
    console.log('[GATEWAY TEST] Testing Edge Functions Gateway Directly');
    console.log('[GATEWAY TEST] ========================================');
    setMessage(null);

    const baseUrl = import.meta.env.VITE_SUPABASE_URL;

    try {
      // Test 1: Raw fetch to ping (NO auth, NO headers)
      console.log('[GATEWAY TEST] Test 1: Raw fetch to /ping with NO headers');
      const pingUrl = `${baseUrl}/functions/v1/ping`;
      console.log('[GATEWAY TEST] URL:', pingUrl);

      const pingResponse = await fetch(pingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[GATEWAY TEST] Ping Response Status:', pingResponse.status);
      console.log('[GATEWAY TEST] Ping Response Headers:', Object.fromEntries(pingResponse.headers.entries()));

      const pingText = await pingResponse.text();
      console.log('[GATEWAY TEST] Ping Response Body:', pingText);

      let pingData;
      try {
        pingData = JSON.parse(pingText);
      } catch {
        pingData = { raw: pingText };
      }

      // Test 2: Raw fetch to hello-world (nuclear test)
      console.log('[GATEWAY TEST] Test 2: Raw fetch to /hello-world with NO headers');
      const helloUrl = `${baseUrl}/functions/v1/hello-world`;
      console.log('[GATEWAY TEST] URL:', helloUrl);

      const helloResponse = await fetch(helloUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[GATEWAY TEST] Hello Response Status:', helloResponse.status);
      const helloText = await helloResponse.text();
      console.log('[GATEWAY TEST] Hello Response Body:', helloText);

      // Analyze results
      if (pingResponse.status === 401 || helloResponse.status === 401) {
        console.error('[GATEWAY TEST] ❌ GATEWAY IS ENFORCING JWT ON ALL FUNCTIONS');
        console.error('[GATEWAY TEST] This is a Supabase project-level configuration issue');
        console.error('[GATEWAY TEST] Check: Dashboard → Edge Functions → JWT enforcement settings');

        setMessage({
          type: 'error',
          text: `🚨 GATEWAY JWT ENFORCEMENT: Both ping (${pingResponse.status}) and hello-world (${helloResponse.status}) failed. Supabase is enforcing JWT on ALL functions. Check Dashboard → Edge Functions settings.`
        });
      } else if (pingResponse.status === 200 && helloResponse.status === 200) {
        console.log('[GATEWAY TEST] ✅ Gateway is healthy! Public functions work without auth');
        console.log('[GATEWAY TEST] JWT issue is isolated to admin functions only');

        setMessage({
          type: 'success',
          text: `✅ Gateway healthy! Ping: ${pingResponse.status}, Hello: ${helloResponse.status}. Public functions work. Issue is isolated to admin JWT validation.`
        });
      } else {
        setMessage({
          type: 'error',
          text: `Mixed results: Ping ${pingResponse.status}, Hello ${helloResponse.status}. Check console for details.`
        });
      }

    } catch (err) {
      console.error('[GATEWAY TEST] Exception:', err);
      setMessage({
        type: 'error',
        text: `Gateway test failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  };

  const hardAuthReset = async () => {
    console.log('[HARD AUTH RESET] Starting complete auth reset...');

    try {
      // 1. Sign out from Supabase
      await supabase.auth.signOut();
      console.log('[HARD AUTH RESET] Signed out from Supabase');

      // 2. Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      console.log('[HARD AUTH RESET] Cleared localStorage and sessionStorage');

      // 3. Clear cookies (best effort)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      console.log('[HARD AUTH RESET] Cleared cookies');

      setMessage({
        type: 'success',
        text: 'Auth reset complete. Redirecting to login...'
      });

      // 4. Redirect to login after short delay
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 1500);
    } catch (err) {
      console.error('[HARD AUTH RESET] Error:', err);
      setMessage({
        type: 'error',
        text: `Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session?.access_token || sessionError) {
        setMessage({ type: 'error', text: 'Session expired. Please refresh the page and sign in again.' });
        setSyncing(false);
        return;
      }

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const accessToken = session.access_token;

      // Decode JWT to verify structure and issuer
      try {
        const parts = accessToken.split('.');
        console.log('[SYNC NOW] JWT Structure:', {
          hasThreParts: parts.length === 3,
          partLengths: parts.map(p => p.length),
          totalLength: accessToken.length,
        });

        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('[SYNC NOW] JWT Payload:', {
            iss: payload.iss,
            sub: payload.sub,
            email: payload.email,
            exp: payload.exp,
            expiresAt: new Date(payload.exp * 1000).toISOString(),
            role: payload.role,
          });

          const expectedIssuer = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1`;
          if (payload.iss !== expectedIssuer) {
            console.error('[SYNC NOW] JWT ISSUER MISMATCH:', {
              expected: expectedIssuer,
              actual: payload.iss,
            });
            setMessage({
              type: 'error',
              text: `JWT issuer mismatch. Expected: ${expectedIssuer}, Got: ${payload.iss}. Please sign out and sign in again.`
            });
            setSyncing(false);
            return;
          }
        }
      } catch (decodeErr) {
        console.error('[SYNC NOW] Failed to decode JWT:', decodeErr);
      }

      console.log('[SYNC NOW] Auth check:', {
        hasAuthorization: true,
        authTokenLen: accessToken.length,
        hasApikey: !!anonKey,
        apikeyLen: anonKey.length,
        timestamp: new Date().toISOString(),
      });

      // Method A: Let Supabase client handle auth automatically (RECOMMENDED)
      console.log('[SYNC NOW] Attempting invoke WITHOUT manual Authorization header...');
      const { data: result, error: invokeError } = await supabase.functions.invoke('inventory-sync-run', {
        body: { test_only: false },
      });

      console.log('[SYNC NOW] Response:', {
        hasError: !!invokeError,
        error: invokeError,
        result: result,
      });

      if (invokeError) {
        console.error('[SYNC NOW] Invoke error:', invokeError);
        console.error('[SYNC NOW] Full error object:', JSON.stringify(invokeError, null, 2));
        console.error('[SYNC NOW] Result/body from invoke:', result);

        const statusCode = (invokeError as any).status || (invokeError as any).statusCode || 'unknown';

        try {
          console.log('[SYNC NOW] Attempting raw fetch to get full error body...');
          const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inventory-sync-run`;
          const rawResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'apikey': anonKey,
            },
            body: JSON.stringify({ test_only: false }),
          });

          const rawText = await rawResponse.text();
          console.error('[SYNC NOW] RAW 401 RESPONSE BODY:', rawText);
          console.error('[SYNC NOW] RAW response status:', rawResponse.status);
          console.error('[SYNC NOW] RAW response headers:', Object.fromEntries(rawResponse.headers.entries()));

          let parsedBody;
          try {
            parsedBody = JSON.parse(rawText);
            console.error('[SYNC NOW] PARSED ERROR BODY:', parsedBody);
          } catch (parseErr) {
            console.error('[SYNC NOW] Failed to parse response as JSON:', parseErr);
          }

          const displayError = parsedBody?.error || result?.error || invokeError.message;
          const displayStep = parsedBody?.step || result?.step || 'unknown';

          setMessage({
            type: 'error',
            text: `Sync failed (${statusCode}) at step "${displayStep}": ${displayError}`
          });
        } catch (fetchErr) {
          console.error('[SYNC NOW] Raw fetch also failed:', fetchErr);

          const errorContext = (invokeError as any).context;
          let errorMessage = invokeError.message;
          if (result) {
            errorMessage += ` | Response: ${JSON.stringify(result)}`;
          }
          if (errorContext) {
            errorMessage += ` | Context: ${JSON.stringify(errorContext)}`;
          }

          setMessage({
            type: 'error',
            text: `Sync failed (${statusCode}): ${errorMessage}`
          });
        }

        setSyncing(false);
        return;
      }

      if (result?.success) {
        setMessage({ type: 'success', text: `Sync completed: ${result.created} created, ${result.updated} updated, ${result.disabled} disabled` });
        await loadSyncHistory();
      } else {
        const step = result?.step ? ` [Step: ${result.step}]` : '';
        const errorDetails = result?.debug ? ` Debug: ${JSON.stringify(result.debug)}` : '';
        const errorMsg = result?.error || result?.message || 'Unknown error';
        setMessage({ type: 'error', text: `Sync failed${step}: ${errorMsg}${errorDetails}` });
      }
    } catch (err) {
      console.error('[SYNC NOW] Exception:', err);
      setMessage({ type: 'error', text: `Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setSyncing(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 4) return '****';
    return '****' + key.slice(-4);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const runVinAudit = async () => {
    setAuditingVins(true);
    setMessage(null);
    try {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, year, make, model, vin, stock_number')
        .eq('is_active', true);

      if (error) throw error;

      const audit = auditInventoryVins(vehicles || []);
      setVinAudit(audit);

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔍 VIN AUDIT REPORT');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Total Vehicles: ${audit.total}`);
      console.log(`✅ Valid VINs: ${audit.valid}`);
      console.log(`❌ Invalid VINs: ${audit.invalid}`);
      console.log(`⚠️  Missing VINs: ${audit.missing}`);
      console.log('');

      if (audit.invalidVehicles.length > 0) {
        console.log('🚨 INVALID/MISSING VIN DETAILS (showing first 10):');
        console.log('═══════════════════════════════════════════════════════════');
        audit.invalidVehicles.slice(0, 10).forEach((v: any, i: number) => {
          console.log(`${i + 1}. ID: ${v.id}`);
          console.log(`   VIN: ${v.vin || 'NULL'}`);
          console.log(`   Reason: ${v.reason}`);
          console.log('');
        });
      }

      if (audit.validVehicles.length > 0) {
        console.log('✅ VALID VIN SAMPLES (showing first 5):');
        console.log('═══════════════════════════════════════════════════════════');
        audit.validVehicles.slice(0, 5).forEach((v: any, i: number) => {
          console.log(`${i + 1}. ID: ${v.id}, VIN: ${v.vin}`);
        });
        console.log('');
      }

      console.log('═══════════════════════════════════════════════════════════');

      setMessage({
        type: audit.invalid > 0 || audit.missing > 0 ? 'error' : 'success',
        text: `Audit complete: ${audit.valid} valid, ${audit.invalid} invalid, ${audit.missing} missing. Check console for details.`
      });
    } catch (err) {
      console.error('[VIN AUDIT ERROR]', err);
      setMessage({ type: 'error', text: `Audit failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setAuditingVins(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Inventory Sync</h1>
        <p className="text-slate-600">Manage automatic inventory updates from Fender-AI</p>
      </div>

      {lastSync && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Last Sync</span>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {lastSync.last_sync_at ? new Date(lastSync.started_at).toLocaleTimeString() : 'Never'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{formatDate(lastSync.started_at)}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Status</span>
              {lastSync.status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className="text-2xl font-bold capitalize text-slate-900">{lastSync.status}</p>
            <p className="text-xs text-slate-500 mt-1">{formatDuration(lastSync.duration_ms)}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Records</span>
              <RefreshCw className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{lastSync.total_records_processed}</p>
            <p className="text-xs text-slate-500 mt-1">
              {lastSync.records_created} new, {lastSync.records_updated} updated
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Disabled</span>
              <XCircle className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{lastSync.records_disabled}</p>
            <p className="text-xs text-slate-500 mt-1">No longer in feed</p>
          </div>
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex gap-8 px-6">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 inline mr-2" />
              History
            </button>
            <button
              onClick={() => setActiveTab('cron')}
              className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'cron'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Cron Monitor
            </button>
            <button
              onClick={() => setActiveTab('vin-audit')}
              className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'vin-audit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSearch className="w-4 h-4 inline mr-2" />
              VIN Audit
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fender DMS Base URL
                </label>
                <input
                  type="text"
                  value={config.endpoint_base}
                  onChange={(e) => setConfig({ ...config, endpoint_base: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://your-fender-dms.supabase.co"
                />
                <p className="text-xs text-slate-500 mt-1">The base URL for your Fender DMS Supabase instance (without /functions/v1)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  API Key {config.api_key_encrypted && !apiKey && <span className="text-green-600">(saved)</span>}
                </label>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={config.api_key_encrypted ? "Enter new API key to update (or leave blank to keep existing)" : "Enter your Fender API key (required)"}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {config.api_key_encrypted
                    ? "Leave blank to keep existing key, or paste a new key to update"
                    : "Required: Paste your Fender API key"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sync Interval (minutes)
                </label>
                <select
                  value={config.sync_interval_minutes}
                  onChange={(e) => setConfig({ ...config, sync_interval_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                >
                  <option value={5} className="bg-white text-gray-900">Every 5 minutes</option>
                  <option value={15} className="bg-white text-gray-900">Every 15 minutes</option>
                  <option value={30} className="bg-white text-gray-900">Every 30 minutes</option>
                  <option value={60} className="bg-white text-gray-900">Every hour</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_enabled"
                  checked={config.is_enabled}
                  onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_enabled" className="ml-2 text-sm font-medium text-slate-700">
                  Enable automatic sync
                </label>
              </div>

              {/* JWT Diagnostics Section */}
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mt-6">
                <h3 className="font-bold text-red-900 mb-2 text-lg">🚨 Gateway JWT Enforcement Test</h3>
                <p className="text-sm text-red-800 mb-3">
                  <strong>If getting "Invalid JWT" on every request:</strong> The Supabase gateway may be enforcing JWT globally.
                </p>
                <div className="bg-white border border-red-200 rounded p-3 mb-4 text-xs space-y-2">
                  <p className="text-slate-700">
                    <strong>This test calls 2 public functions with ZERO auth headers:</strong>
                  </p>
                  <ul className="list-disc ml-5 text-slate-600 space-y-1">
                    <li><code className="bg-slate-100 px-1 rounded">/ping</code> - Deployed with verify_jwt=false</li>
                    <li><code className="bg-slate-100 px-1 rounded">/hello-world</code> - Nuclear minimal test</li>
                  </ul>
                  <p className="text-red-700 font-semibold mt-2">
                    If BOTH return 401 → Gateway is enforcing JWT on ALL functions (project-level config issue)
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={testGateway}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all flex items-center gap-2 text-sm shadow-md"
                  >
                    <TestTube className="w-4 h-4" />
                    Test Gateway (Raw Fetch)
                  </button>
                  <button
                    onClick={hardAuthReset}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-all flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Hard Auth Reset
                  </button>
                </div>
                <p className="text-xs text-red-700 mt-3 font-medium">
                  Run "Test Gateway" first. Check browser console for detailed results. If 401s persist, check Supabase Dashboard → Edge Functions → Settings.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Save Settings
                </button>

                <button
                  onClick={handleTestConnection}
                  disabled={testing || !config.api_key_encrypted}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {testing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <TestTube className="w-5 h-5" />
                  )}
                  Test Connection
                </button>

                <button
                  onClick={handleSyncNow}
                  disabled={syncing || !config.api_key_encrypted}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  {syncing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                  Sync Now
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {syncHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No sync history yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Started</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Duration</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Created</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Updated</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Disabled</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Trigger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncHistory.map((sync) => (
                        <tr key={sync.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              sync.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {sync.status === 'success' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {sync.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {formatDate(sync.started_at)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {formatDuration(sync.duration_ms)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                            {sync.records_created}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                            {sync.records_updated}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                            {sync.records_disabled}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                            {sync.total_records_processed}
                          </td>
                          <td className="py-3 px-4">
                            {sync.trigger_source === 'cron' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <Clock className="w-3 h-3" />
                                Cron
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <RefreshCw className="w-3 h-3" />
                                Manual
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cron' && (
            <div className="space-y-6">
              {cronHealth && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">Last Cron Execution</span>
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {cronHealth.lastCronExecution ? formatDate(cronHealth.lastCronExecution) : 'Never'}
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">Last HTTP Status</span>
                        {cronHealth.lastHttpStatus === 200 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {cronHealth.lastHttpStatus || 'N/A'}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {cronHealth.lastHttpStatus === 200 ? 'Gateway auth working' : 'Check logs below'}
                      </p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-green-900">Last Successful Cron Sync</span>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-lg font-bold text-green-900">
                        {cronHealth.lastSuccessfulSync ? formatDate(cronHealth.lastSuccessfulSync) : 'Never'}
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${
                      cronHealth.failedAttemptsLast24h > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-semibold ${
                          cronHealth.failedAttemptsLast24h > 0 ? 'text-red-900' : 'text-green-900'
                        }`}>Failed Attempts (24h)</span>
                        {cronHealth.failedAttemptsLast24h > 0 ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <p className={`text-lg font-bold ${
                        cronHealth.failedAttemptsLast24h > 0 ? 'text-red-900' : 'text-green-900'
                      }`}>
                        {cronHealth.failedAttemptsLast24h}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Test Cron Path</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      This button triggers the exact same code path that the scheduled cron job uses.
                      It will test gateway authentication and return detailed diagnostics.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleTestCronPath}
                        disabled={testingCron}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        {testingCron ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <TestTube className="w-5 h-5" />
                        )}
                        Test Cron Path
                      </button>
                      <button
                        onClick={loadCronHealth}
                        className="px-6 py-3 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Refresh
                      </button>
                    </div>
                  </div>

                  {cronTestResult && (
                    <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
                      <h3 className="font-semibold text-slate-900 mb-3">Test Results</h3>
                      <pre className="bg-slate-50 p-4 rounded text-xs overflow-x-auto">
                        {JSON.stringify(cronTestResult, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Recent Cron Sync Logs (Last 50)</h3>
                    {cronHealth.recentLogs.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No cron sync logs yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">ID</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Timestamp</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Request ID</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">HTTP Status</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Response Preview</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cronHealth.recentLogs.map((log) => (
                              <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4 text-xs text-slate-600">{log.id}</td>
                                <td className="py-3 px-4 text-xs text-slate-600">
                                  {formatDate(log.created_at)}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">{log.request_id}</td>
                                <td className="py-3 px-4 text-xs">
                                  {log.http_status ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${
                                      log.http_status === 200
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {log.http_status === 200 ? (
                                        <CheckCircle className="w-3 h-3" />
                                      ) : (
                                        <XCircle className="w-3 h-3" />
                                      )}
                                      {log.http_status}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Pending</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600 max-w-md truncate">
                                  {log.response_body ? log.response_body.substring(0, 100) : '-'}
                                </td>
                                <td className="py-3 px-4 text-xs text-red-600">
                                  {log.error_msg || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'vin-audit' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">VIN Audit Tool</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Scan your active inventory to identify vehicles with missing or invalid VINs.
                  This helps ensure CARFAX links work correctly for all vehicles.
                </p>
                <button
                  onClick={runVinAudit}
                  disabled={auditingVins}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {auditingVins ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Auditing...</span>
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-4 h-4" />
                      <span>Run VIN Audit</span>
                    </>
                  )}
                </button>
              </div>

              {vinAudit && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">Total Vehicles</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{vinAudit.total}</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">Valid VINs</span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{vinAudit.valid}</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">Invalid VINs</span>
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{vinAudit.invalid}</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">Missing VINs</span>
                      <XCircle className="w-5 h-5 text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{vinAudit.missing}</p>
                  </div>
                </div>
              )}

              {vinAudit && vinAudit.invalidVehicles.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Problem Vehicles</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Vehicles with missing or invalid VINs (showing first 10)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Vehicle ID</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">VIN</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {vinAudit.invalidVehicles.slice(0, 10).map((v: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-900 font-mono">{v.id.substring(0, 8)}...</td>
                            <td className="py-3 px-4 text-sm text-slate-600 font-mono">{v.vin || 'NULL'}</td>
                            <td className="py-3 px-4 text-sm text-slate-600">{v.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {vinAudit && vinAudit.validVehicles.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Valid VIN Samples</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Example vehicles with valid VINs (showing first 5)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Vehicle ID</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">VIN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {vinAudit.validVehicles.slice(0, 5).map((v: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-900 font-mono">{v.id.substring(0, 8)}...</td>
                            <td className="py-3 px-4 text-sm text-green-600 font-mono">{v.vin}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Tip:</strong> Full audit details are logged to your browser console.
                  Open Developer Tools (F12) to view the complete report.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
