import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

const encryptionKey = Deno.env.get("API_ENCRYPTION_KEY") || "trinity-secure-key-2024";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error_code: "method_not_allowed", message: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "missing_auth",
          message: "Missing Authorization Bearer token"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error details:", {
        error: authError,
        hasUser: !!user,
        authHeader: authHeader?.substring(0, 20) + "..."
      });
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "invalid_token",
          message: "Invalid session token",
          debug: {
            errorMessage: authError?.message,
            errorName: authError?.name,
            hasAuthHeader: !!authHeader
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: adminUser } = await serviceClient
      .from("admin_users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "forbidden",
          message: "Admin access required"
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    let { endpoint_base, api_key, is_enabled, sync_interval_minutes } = body;

    if (!endpoint_base) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "missing_endpoint",
          message: "Endpoint base URL is required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    endpoint_base = endpoint_base.trim();
    if (endpoint_base.endsWith('/')) {
      endpoint_base = endpoint_base.slice(0, -1);
    }
    if (endpoint_base.endsWith('/functions/v1')) {
      endpoint_base = endpoint_base.slice(0, -13);
    }

    try {
      new URL(endpoint_base);
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "invalid_url",
          message: "Invalid URL format. Please provide a valid Supabase base URL"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: existingConfig } = await serviceClient
      .from("dealer_api_config")
      .select("*")
      .eq("dealer_id", "trinity")
      .maybeSingle();

    // Check if existing key is a placeholder and no new key provided
    const existingKey = existingConfig?.api_key_encrypted;
    const isPlaceholder = !existingKey ||
                          existingKey === "PLACEHOLDER" ||
                          existingKey.startsWith("PLACEHOL") ||
                          existingKey.length < 40; // Real encrypted keys are much longer

    if (!api_key && isPlaceholder) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "missing_api_key",
          message: "API key required — please paste the Fender key again",
          debug: {
            hasExistingKey: !!existingKey,
            existingKeyLength: existingKey?.length || 0,
            existingKeyPrefix: existingKey?.substring(0, 10) || "none"
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (api_key && api_key.trim().length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "invalid_api_key",
          message: "Invalid API key format. API key must be at least 10 characters"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let apiKeyEncrypted = existingConfig?.api_key_encrypted;

    if (api_key) {
      const encoder = new TextEncoder();
      const data = encoder.encode(api_key);
      const keyData = encoder.encode(encryptionKey.padEnd(32, "0").substring(0, 32));
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        data
      );
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      apiKeyEncrypted = btoa(String.fromCharCode(...combined));
    }

    if (!apiKeyEncrypted && !existingConfig) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "missing_api_key",
          message: "API key is required for initial setup"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const configData = {
      dealer_id: "trinity",
      endpoint_base,
      api_key_encrypted: apiKeyEncrypted,
      is_enabled: is_enabled ?? true,
      sync_interval_minutes: sync_interval_minutes ?? 15,
      updated_at: new Date().toISOString(),
    };

    if (existingConfig) {
      const { error: updateError } = await serviceClient
        .from("dealer_api_config")
        .update(configData)
        .eq("id", existingConfig.id);

      if (updateError) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "db_error",
            message: `Failed to update configuration: ${updateError.message}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } else {
      const { error: insertError } = await serviceClient
        .from("dealer_api_config")
        .insert({ ...configData, created_at: new Date().toISOString() });

      if (insertError) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "db_error",
            message: `Failed to create configuration: ${insertError.message}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        saved_at: new Date().toISOString(),
        dealer_id: "trinity"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error saving config:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error_code: "server_error",
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
