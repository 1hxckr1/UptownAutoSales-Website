import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders, getCorsHeaders, handleOptions } from "./cors.ts";

export { corsHeaders, getCorsHeaders, handleOptions };

interface AuthResult {
  success: boolean;
  dealerId?: string;
  error?: string;
}

export async function authenticateRequest(req: Request, bodyApiKey?: string): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");

  const xApiKey = req.headers.get("X-API-Key");
  const xApiKeyLower = req.headers.get("x-api-key");
  const xFenderApiKey = req.headers.get("X-Fender-API-Key");
  const xFenderApiKeyLower = req.headers.get("x-fender-api-key");

  const apiKey = bodyApiKey || xFenderApiKey || xFenderApiKeyLower || xApiKey || xApiKeyLower;

  const apiKeyPreview = apiKey
    ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
    : "none";

  console.log("[AUTH] START - Auth check initiated", {
    hasAuthHeader: !!authHeader,
    hasApiKey: !!apiKey,
    whichHeader: xFenderApiKey ? "X-Fender-API-Key" : xFenderApiKeyLower ? "x-fender-api-key" : xApiKey ? "X-API-Key" : xApiKeyLower ? "x-api-key" : "none",
    apiKeyPreview,
    apiKeyLength: apiKey?.length || 0,
  });

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let dealerId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      console.log("[AUTH] STEP 1 - JWT mode selected");
      const token = authHeader.replace("Bearer ", "");

      console.log("[AUTH] STEP 2 - Verifying JWT token...", {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + "...",
      });

      const { data: { user }, error: authError } = await authClient.auth.getUser(token);

      if (authError || !user) {
        console.error("[AUTH] STEP 2 FAILED - JWT verification failed:", {
          hasError: !!authError,
          errorMessage: authError?.message,
          errorName: authError?.name,
          hasUser: !!user,
        });
        return {
          success: false,
          error: `JWT verification failed: ${authError?.message || "Token invalid or expired"}`,
        };
      }

      console.log("[AUTH] STEP 2 SUCCESS - JWT verified", {
        userId: user.id,
        email: user.email,
      });

      console.log("[AUTH] STEP 3 - Looking up admin user...", {
        userId: user.id,
      });

      const { data: adminUser, error: adminError } = await supabaseClient
        .from("admin_users")
        .select("dealer_id")
        .eq("id", user.id)
        .maybeSingle();

      console.log("[AUTH] STEP 3 - Admin lookup result:", {
        found: !!adminUser,
        hasError: !!adminError,
        errorMessage: adminError?.message,
        dealerId: adminUser?.dealer_id,
      });

      if (adminError) {
        console.error("[AUTH] STEP 3 FAILED - Database error:", {
          userId: user.id,
          errorMessage: adminError.message,
          errorCode: adminError.code,
        });
        return {
          success: false,
          error: `Admin lookup database error: ${adminError.message}`,
        };
      }

      if (!adminUser) {
        console.error("[AUTH] STEP 3 FAILED - User is not an admin:", {
          userId: user.id,
          email: user.email,
        });
        return {
          success: false,
          error: "User is not an admin",
        };
      }

      if (!adminUser.dealer_id) {
        console.error("[AUTH] STEP 4 FAILED - Admin has no dealer_id:", {
          userId: user.id,
          email: user.email,
        });
        return {
          success: false,
          error: "Admin user has no dealer_id",
        };
      }

      console.log("[AUTH] STEP 4 SUCCESS - Dealer ID resolved:", {
        userId: user.id,
        dealerId: adminUser.dealer_id,
      });

      dealerId = adminUser.dealer_id;
    } else if (apiKey) {
      console.log("[AUTH] STEP 1 - API Key mode selected", {
        apiKeyLength: apiKey.length,
        apiKeyPreview: apiKey.substring(0, 10) + "...",
      });

      console.log("[AUTH] STEP 2 - Looking up API key in database...");

      const { data: config, error } = await supabaseClient
        .from("dealer_api_config")
        .select("dealer_id, is_enabled")
        .eq("public_api_key", apiKey)
        .eq("is_enabled", true)
        .maybeSingle();

      console.log("[AUTH] STEP 2 - API key lookup result:", {
        found: !!config,
        hasError: !!error,
        errorMessage: error?.message,
        isEnabled: config?.is_enabled,
        dealerId: config?.dealer_id,
      });

      if (error) {
        console.error("[AUTH] STEP 2 FAILED - Database error:", {
          errorMessage: error.message,
          errorCode: error.code,
        });
        return {
          success: false,
          error: `API key lookup database error: ${error.message}`,
        };
      }

      if (!config) {
        console.error("[AUTH] STEP 2 FAILED - Invalid or disabled API key");
        return {
          success: false,
          error: "Invalid API key",
        };
      }

      console.log("[AUTH] STEP 3 SUCCESS - Dealer ID resolved via API key:", {
        dealerId: config.dealer_id,
      });

      dealerId = config.dealer_id;
    } else {
      console.error("[AUTH] FAILED - No authentication provided:", {
        hasAuthHeader: !!authHeader,
        hasApiKey: !!apiKey,
      });
      return {
        success: false,
        error: "Missing Authorization header",
      };
    }

    console.log("[AUTH] STEP 5 - Logging API usage...");

    await supabaseClient
      .from("api_usage_logs")
      .insert({
        dealer_id: dealerId,
        endpoint: new URL(req.url).pathname,
        method: req.method,
        timestamp: new Date().toISOString(),
      });

    console.log("[AUTH] SUCCESS - Authentication complete:", {
      dealerId,
      endpoint: new URL(req.url).pathname,
      method: req.method,
    });

    return {
      success: true,
      dealerId: dealerId,
    };
  } catch (error) {
    console.error("[AUTH] EXCEPTION - Unexpected error during authentication:", {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });
    return {
      success: false,
      error: `Authentication exception: ${error.message}`,
    };
  }
}

export async function logApiRequest(
  dealerId: string,
  endpoint: string,
  method: string
): Promise<void> {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    await supabaseClient
      .from("api_usage_logs")
      .insert({
        dealer_id: dealerId,
        endpoint,
        method,
        timestamp: new Date().toISOString(),
      });
  } catch (error) {
    console.error("Failed to log API request:", error);
  }
}
