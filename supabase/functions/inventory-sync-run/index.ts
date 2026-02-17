import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders, authenticateRequest } from "../_shared/publicApiAuth.ts";

interface FenderVehicle {
  id: string;
  stock_number?: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
  asking_price?: number;
  compare_price?: number;
  mileage: number;
  mpg?: { city: number; highway: number };
  color?: string;
  exterior_color?: string;
  interior_color?: string;
  transmission?: string;
  drivetrain?: string;
  fuel_type?: string;
  body_style?: string;
  engine?: string;
  engine_type?: string;
  description?: string;
  primary_photo_url?: string;
  photo_urls?: string[];
  video_urls?: string[];
  features?: string[];
  ai_detected_features?: { confirmed?: string[]; suggested?: string[] } | string[];
  media?: Array<{ type: string; url: string; thumbnail?: string }>;
}

interface FenderResponse {
  vehicles: FenderVehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

async function decryptApiKey(encryptedKey: string, encryptionKey: string): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(encryptionKey.padEnd(32, "0").substring(0, 32));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

function getFileExtension(url: string, contentType?: string): string {
  if (contentType) {
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    if (map[contentType]) return map[contentType];
  }
  const match = url.match(/\.(jpe?g|png|webp|gif)/i);
  return match ? match[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

async function copyPhotosToLocalStorage(
  supabaseClient: ReturnType<typeof createClient>,
  vin: string,
  sourceUrls: string[],
  supabaseUrl: string,
): Promise<string[]> {
  if (sourceUrls.length === 0) return [];

  const bucket = "vehicle-photos";
  const folder = `vehicles/${vin}`;

  const { data: existingFiles } = await supabaseClient.storage
    .from(bucket)
    .list(folder);

  const existingNames = new Set(existingFiles?.map(f => f.name) || []);
  const localUrls: string[] = [];

  for (let i = 0; i < sourceUrls.length; i++) {
    const sourceUrl = sourceUrls[i];
    const ext = getFileExtension(sourceUrl);
    const fileName = `${i}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    if (existingNames.has(fileName)) {
      localUrls.push(`${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`);
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(sourceUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[PHOTO COPY] Failed to download ${sourceUrl}: ${response.status}`);
        localUrls.push(sourceUrl);
        continue;
      }

      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || "image/jpeg";

      const { error: uploadError } = await supabaseClient.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.warn(`[PHOTO COPY] Upload failed for ${filePath}: ${uploadError.message}`);
        localUrls.push(sourceUrl);
      } else {
        localUrls.push(`${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`);
      }
    } catch (err) {
      console.warn(`[PHOTO COPY] Error copying ${sourceUrl}: ${err.message}`);
      localUrls.push(sourceUrl);
    }
  }

  return localUrls;
}

async function cleanupVehiclePhotos(
  supabaseClient: ReturnType<typeof createClient>,
  vins: string[],
): Promise<number> {
  if (vins.length === 0) return 0;

  let cleaned = 0;
  const bucket = "vehicle-photos";

  for (const vin of vins) {
    const folder = `vehicles/${vin}`;
    const { data: files } = await supabaseClient.storage
      .from(bucket)
      .list(folder);

    if (files && files.length > 0) {
      const paths = files.map(f => `${folder}/${f.name}`);
      const { error } = await supabaseClient.storage
        .from(bucket)
        .remove(paths);

      if (!error) {
        cleaned += paths.length;
        console.log(`[PHOTO CLEANUP] Removed ${paths.length} photos for VIN ${vin}`);
      }
    }
  }

  return cleaned;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const startTime = Date.now();
  let syncHistoryId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");
    const xFenderApiKey = req.headers.get("X-Fender-API-Key");
    const xCronSecret = req.headers.get("X-Cron-Secret");

    console.log("[AUTH] === Request Auth Diagnostics ===");
    console.log("[AUTH] hasAuthorizationHeader:", !!authHeader);
    console.log("[AUTH] hasApikeyHeader:", !!apikeyHeader);
    console.log("[AUTH] hasXFenderApiKey:", !!xFenderApiKey);
    console.log("[AUTH] hasXCronSecret:", !!xCronSecret);
    console.log("[AUTH] authHeaderPreview:", authHeader ? authHeader.substring(0, 25) + "..." : "none");
    console.log("[AUTH] apikeyLength:", apikeyHeader ? apikeyHeader.length : 0);
    console.log("[AUTH] timestamp:", new Date().toISOString());

    if (apikeyHeader) {
      console.log("[AUTH] === apikey Header Analysis ===");
      console.log("[AUTH] apikeyFirst10:", apikeyHeader.substring(0, 10));
      console.log("[AUTH] apikeyLen:", apikeyHeader.length);

      try {
        const apikeyParts = apikeyHeader.split(".");
        if (apikeyParts.length === 3) {
          const apikeyPayload = JSON.parse(atob(apikeyParts[1]));
          console.log("[AUTH] apikeyJwtPayload.iss:", apikeyPayload.iss);
          console.log("[AUTH] apikeyJwtPayload.role:", apikeyPayload.role);
          console.log("[AUTH] apikeyJwtPayload.iat:", apikeyPayload.iat);
          console.log("[AUTH] apikeyJwtPayload.exp:", apikeyPayload.exp);
          console.log("[AUTH] Expected iss:", "https://apaaabypiufsboprsqvn.supabase.co/auth/v1");
          console.log("[AUTH] Issuer Match:", apikeyPayload.iss === "https://apaaabypiufsboprsqvn.supabase.co/auth/v1");
        } else {
          console.log("[AUTH] apikey is NOT a valid JWT (expected 3 parts, got " + apikeyParts.length + ")");
        }
      } catch (apikeyDecodeErr) {
        console.error("[AUTH] Failed to decode apikey JWT:", apikeyDecodeErr.message);
      }
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      console.log("[AUTH] === Authorization Bearer Token Analysis ===");
      const token = authHeader.replace("Bearer ", "");
      const parts = token.split(".");
      console.log("[AUTH] JWT Structure Check:", {
        hasThreeParts: parts.length === 3,
        partLengths: parts.map(p => p.length),
        totalLength: token.length,
        isWellFormed: parts.length === 3 && parts.every(p => p.length > 0),
      });

      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          console.log("[AUTH] Authorization JWT Payload:");
          console.log("[AUTH]   iss:", payload.iss);
          console.log("[AUTH]   aud:", payload.aud);
          console.log("[AUTH]   sub:", payload.sub?.substring(0, 10) + "...");
          console.log("[AUTH]   exp:", payload.exp);
          console.log("[AUTH]   role:", payload.role);
          console.log("[AUTH] Expected iss:", "https://apaaabypiufsboprsqvn.supabase.co/auth/v1");
          console.log("[AUTH] Expected aud:", "authenticated");
          console.log("[AUTH] Issuer Match:", payload.iss === "https://apaaabypiufsboprsqvn.supabase.co/auth/v1");
          console.log("[AUTH] Audience Match:", payload.aud === "authenticated");
        } catch (decodeErr) {
          console.error("[AUTH] Failed to decode Authorization JWT payload:", decodeErr.message);
        }
      }
    }

    console.log("[AUTH] === Header Comparison ===");
    console.log("[AUTH] Headers are different:", authHeader !== apikeyHeader);
    if (authHeader && apikeyHeader) {
      console.log("[AUTH] authHeader starts with 'Bearer ':", authHeader.startsWith("Bearer "));
      console.log("[AUTH] apikeyHeader starts with 'eyJ':", apikeyHeader.startsWith("eyJ"));
    }

    let isCronTrigger = false;
    let dealerId: string | null = null;
    let userId: string | null = null;
    let triggerSource: 'manual' | 'cron' = 'manual';

    if (xCronSecret) {
      console.log("[AUTH] === Cron Authentication Path ===");
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const { data: secretRecord } = await supabaseClient
        .from("internal_secrets")
        .select("value")
        .eq("key", "INTERNAL_CRON_SECRET")
        .maybeSingle();

      if (!secretRecord || secretRecord.value !== xCronSecret) {
        console.error("[AUTH] Invalid cron secret");
        return new Response(
          JSON.stringify({
            success: false,
            step: "auth",
            error: "Invalid cron secret",
            message: "Cron authentication failed",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("[AUTH] Cron secret validated successfully");
      isCronTrigger = true;
      triggerSource = 'cron';

      const { data: dealers } = await supabaseClient
        .from("dealer_api_config")
        .select("dealer_id")
        .limit(1)
        .maybeSingle();

      if (dealers) {
        dealerId = dealers.dealer_id;
        console.log("[AUTH] Cron trigger - using dealer_id:", dealerId);
      } else {
        console.error("[AUTH] No dealer configuration found for cron trigger");
        return new Response(
          JSON.stringify({
            success: false,
            step: "auth",
            error: "No dealer configuration found",
            message: "Cron trigger requires at least one dealer configuration",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } else {
      console.log("[AUTH] === Manual Authentication Path ===");
      const authResult = await authenticateRequest(req);

      console.log("[AUTH] === Auth Result ===");
      console.log("[AUTH] authSuccess:", authResult.success);
      console.log("[AUTH] dealerIdResolved:", authResult.dealerId || "null");
      console.log("[AUTH] error:", authResult.error || "none");

      if (!authResult.success) {
        console.error("[AUTH] Authentication FAILED:", {
          error: authResult.error,
          hasAuthHeader: !!authHeader,
          hasApikey: !!apikeyHeader,
        });

        return new Response(
          JSON.stringify({
            success: false,
            step: "auth",
            error: authResult.error || "Unauthorized",
            message: "Authentication failed",
            hasAuthHeader: !!authHeader,
            hasApikey: !!apikeyHeader,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("[AUTH] Authentication SUCCEEDED, proceeding with sync...");
      dealerId = authResult.dealerId!;
      userId = authResult.userId || null;
      triggerSource = 'manual';
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    const body = await req.json().catch(() => ({}));
    const { test_only = false } = body;

    const { data: config, error: configError } = await supabaseClient
      .from("dealer_api_config")
      .select("*")
      .eq("dealer_id", dealerId)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "load_config",
          error: "No active configuration found",
          message: "Unable to load dealer API configuration. Please check your settings.",
          details: configError?.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!config.endpoint_base || !config.api_key_encrypted) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "load_config",
          error: "Missing Fender Base URL or API Key. Save settings first.",
          message: "Configuration incomplete",
          missingFields: {
            endpoint_base: !config.endpoint_base,
            api_key: !config.api_key_encrypted
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const encryptionKey = Deno.env.get("API_ENCRYPTION_KEY") || "trinity-secure-key-2024";
    let apiKey: string;
    try {
      apiKey = await decryptApiKey(config.api_key_encrypted, encryptionKey);
    } catch (decryptError) {
      console.error("API key decryption failed:", {
        error: decryptError.message,
        has_encryption_key: !!Deno.env.get("API_ENCRYPTION_KEY"),
        encrypted_key_length: config.api_key_encrypted?.length || 0,
      });
      return new Response(
        JSON.stringify({
          success: false,
          step: "decrypt_key",
          error: "Failed to decrypt API key",
          message: "API key decrypt failed; re-save key after resetting API_ENCRYPTION_KEY",
          errorDetails: decryptError.message,
          debug: {
            has_encryption_key: !!Deno.env.get("API_ENCRYPTION_KEY"),
            encrypted_key_length: config.api_key_encrypted?.length || 0,
            encrypted_key_preview: config.api_key_encrypted?.substring(0, 10) || "empty"
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let fenderRoot = config.endpoint_base.trim();
    if (fenderRoot.endsWith('/')) {
      fenderRoot = fenderRoot.slice(0, -1);
    }
    if (fenderRoot.endsWith('/functions/v1')) {
      fenderRoot = fenderRoot.slice(0, -13);
    }

    try {
      new URL(fenderRoot);
    } catch (urlError) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "normalize_url",
          error: "Invalid Fender Base URL",
          message: "The configured base URL is not valid. Please check your settings.",
          configuredUrl: config.endpoint_base,
          normalizedUrl: fenderRoot
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let allVehicles: FenderVehicle[] = [];
    let page = 1;
    const limit = test_only ? 1 : 100;
    let totalPages = 1;

    while (true) {
      const queryParams = test_only
        ? `limit=${limit}&page=${page}&sort_by=created_at&sort_order=desc`
        : `limit=${limit}&page=${page}`;
      const fenderUrl = `${fenderRoot}/functions/v1/public-inventory?${queryParams}`;

      const timeoutMs = test_only ? 120000 : 15000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const fetchStartedAt = new Date().toISOString();
      const fetchStartMs = Date.now();

      console.log(`[FENDER FETCH] Initiating request to Fender:`, {
        url: fenderUrl,
        method: "GET",
        page,
        limit,
        timeoutMs,
        startedAt: fetchStartedAt,
        curlEquivalent: `curl -X GET "${fenderUrl}" -H "X-API-Key: ***REDACTED***" -H "Content-Type: application/json"`,
      });

      let fenderResponse: Response;
      let aborted = false;
      try {
        fenderResponse = await fetch(fenderUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        const elapsedMs = Date.now() - fetchStartMs;
        aborted = fetchError.name === "AbortError";

        console.error(`[FENDER FETCH ERROR]`, {
          fenderUrl,
          method: "GET",
          page,
          limit,
          timeoutMs,
          startedAt: fetchStartedAt,
          elapsedMs,
          aborted,
          errorName: fetchError.name,
          errorMessage: fetchError.message,
        });

        if (aborted) {
          return new Response(
            JSON.stringify({
              success: false,
              step: "fetch_fender",
              errorName: "AbortError",
              error: "Request to Fender-AI timed out",
              message: `The request to Fender-AI was aborted after ${elapsedMs}ms (timeout: ${timeoutMs}ms). This may indicate network issues or a slow Fender API.`,
              fenderUrl,
              timeoutMs,
              elapsedMs,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            step: "fetch_fender",
            error: "Failed to connect to Fender-AI",
            message: "Unable to reach the Fender-AI API. Check the base URL and network connectivity.",
            fenderUrl,
            errorMessage: fetchError.message,
            errorName: fetchError.name,
            elapsedMs,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      clearTimeout(timeoutId);

      const elapsedMs = Date.now() - fetchStartMs;
      const responseHeaders = {
        contentType: fenderResponse.headers.get("content-type"),
        contentLength: fenderResponse.headers.get("content-length"),
        server: fenderResponse.headers.get("server"),
      };

      console.log(`[FENDER RESPONSE]`, {
        fenderUrl,
        method: "GET",
        page,
        limit,
        timeoutMs,
        startedAt: fetchStartedAt,
        elapsedMs,
        aborted: false,
        status: fenderResponse.status,
        statusText: fenderResponse.statusText,
        responseHeadersSubset: responseHeaders,
      });

      if (!fenderResponse.ok) {
        let bodyPreview = "";
        let errorText = "";
        try {
          errorText = await fenderResponse.text();
          bodyPreview = errorText.substring(0, 2000);
        } catch (readError) {
          bodyPreview = `[Unable to read response body: ${readError.message}]`;
        }

        console.error(`[FENDER ERROR RESPONSE]`, {
          fenderUrl,
          status: fenderResponse.status,
          statusText: fenderResponse.statusText,
          bodyPreviewFirst2000: bodyPreview,
          elapsedMs,
        });

        return new Response(
          JSON.stringify({
            success: false,
            step: "fetch_fender",
            error: "Fender-AI API returned an error",
            message: `The Fender-AI API responded with status ${fenderResponse.status}. Check your API key and permissions.`,
            fenderUrl,
            status: fenderResponse.status,
            statusText: fenderResponse.statusText,
            bodyPreview,
            elapsedMs,
            authHeaderUsed: "X-API-Key"
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      let fenderData: FenderResponse;
      try {
        fenderData = await fenderResponse.json();
      } catch (jsonError) {
        let rawText = "";
        let bodyPreview = "";
        try {
          rawText = await fenderResponse.text();
          bodyPreview = rawText.substring(0, 2000);
        } catch (readError) {
          bodyPreview = `[Unable to read response body: ${readError.message}]`;
        }

        console.error(`[FENDER JSON PARSE ERROR]`, {
          fenderUrl,
          status: fenderResponse.status,
          statusText: fenderResponse.statusText,
          bodyPreviewFirst2000: bodyPreview,
          jsonError: jsonError.message,
          elapsedMs,
        });

        return new Response(
          JSON.stringify({
            success: false,
            step: "fetch_fender",
            error: "Invalid JSON from Fender",
            message: "The Fender-AI API returned invalid JSON. This may indicate a server error on their side.",
            fenderUrl,
            status: fenderResponse.status,
            statusText: fenderResponse.statusText,
            bodyPreview,
            authHeaderUsed: "X-API-Key",
            jsonError: jsonError.message,
            elapsedMs,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(`[FENDER SUCCESS]`, {
        fenderUrl,
        elapsedMs,
        vehiclesReceived: fenderData.vehicles?.length || 0,
        page: fenderData.pagination.page,
        totalPages: fenderData.pagination.total_pages,
        total: fenderData.pagination.total,
      });

      allVehicles = allVehicles.concat(fenderData.vehicles || []);
      totalPages = fenderData.pagination.total_pages;

      if (test_only) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Connection successful",
            vehicle_count: fenderData.pagination.total || 0,
            fenderUrl,
            elapsedMs,
            pagination: fenderData.pagination,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (page >= totalPages) {
        break;
      }
      page++;
    }

    const { data: syncHistory, error: syncHistoryError } = await supabaseClient
      .from("sync_history")
      .insert({
        config_id: config.id,
        status: "pending",
        triggered_by: triggerSource === 'cron' ? 'cron' : 'api',
        trigger_source: triggerSource,
        invoked_by_user_id: userId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (syncHistoryError || !syncHistory) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "upsert",
          error: "Failed to create sync history record",
          message: "Unable to initialize sync tracking in database.",
          errorDetails: syncHistoryError?.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    syncHistoryId = syncHistory.id;

    const vehicles = allVehicles;
    const vins = vehicles.map(v => v.vin).filter(Boolean);

    const { data: existingVehicles } = await supabaseClient
      .from("vehicles")
      .select("id, stock_number, vin, is_active, external_id")
      .eq("source", "fender")
      .in("vin", vins.length > 0 ? vins : ['']);

    const existingVins = new Set(
      existingVehicles?.map(v => v.vin).filter(Boolean) || []
    );

    const existingVehicleMap = new Map(
      existingVehicles?.map(v => [v.vin, v]) || []
    );

    let recordsCreated = 0;
    let recordsUpdated = 0;
    let photosCopied = 0;
    const errors: Array<{ type: string; message: string; vehicle?: any }> = [];

    for (const vehicle of vehicles) {
      try {
        const originalImages = vehicle.photo_urls && vehicle.photo_urls.length > 0
          ? vehicle.photo_urls
          : (vehicle.primary_photo_url ? [vehicle.primary_photo_url] : []);

        console.log(`[VEHICLE SYNC] Processing vehicle ${vehicle.vin}:`, {
          stock_number: vehicle.stock_number || vehicle.id,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          price: vehicle.price,
          asking_price: vehicle.asking_price,
          compare_price: vehicle.compare_price,
          compare_price_type: typeof vehicle.compare_price,
          has_compare_price: vehicle.compare_price !== undefined && vehicle.compare_price !== null,
          photo_count: originalImages.length,
        });

        let localImages = originalImages;
        if (originalImages.length > 0 && vehicle.vin) {
          try {
            localImages = await copyPhotosToLocalStorage(
              supabaseClient,
              vehicle.vin,
              originalImages,
              supabaseUrl,
            );
            const copiedCount = localImages.filter(u => u.includes(supabaseUrl)).length;
            if (copiedCount > 0) {
              photosCopied += copiedCount;
            }
          } catch (photoErr) {
            console.warn(`[PHOTO COPY] Failed for VIN ${vehicle.vin}: ${photoErr.message}`);
            localImages = originalImages;
          }
        }

        const existingVehicle = existingVehicleMap.get(vehicle.vin);
        const shouldPreserveIsActive = existingVehicle && existingVehicle.is_active === false;

        const vehicleData = {
          stock_number: vehicle.stock_number || vehicle.id,
          vin: vehicle.vin,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim || "",
          price: vehicle.price,
          asking_price: vehicle.asking_price ?? vehicle.price,
          compare_price: vehicle.compare_price ?? null,
          mileage: vehicle.mileage,
          mpg: vehicle.mpg || null,
          exterior_color: vehicle.exterior_color || vehicle.color || "",
          interior_color: vehicle.interior_color || "",
          transmission: vehicle.transmission || "Automatic",
          drivetrain: vehicle.drivetrain || "",
          fuel_type: vehicle.fuel_type || "Gasoline",
          body_style: vehicle.body_style || "",
          engine: vehicle.engine || "",
          engine_type: vehicle.engine_type || "",
          description: vehicle.description || "",
          images: localImages,
          video_urls: vehicle.video_urls || [],
          features: vehicle.features || [],
          ai_detected_features: vehicle.ai_detected_features || null,
          media: vehicle.media || null,
          status: "Available",
          is_active: shouldPreserveIsActive ? false : true,
          source: "fender",
          external_id: vehicle.id,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (existingVins.has(vehicle.vin)) {
          const { error: updateError } = await supabaseClient
            .from("vehicles")
            .update(vehicleData)
            .eq("vin", vehicle.vin);

          if (updateError) {
            errors.push({
              type: "database_error",
              message: `Failed to update vehicle: ${updateError.message}`,
              vehicle: vehicle.vin,
            });
          } else {
            recordsUpdated++;
          }
        } else {
          const { error: insertError } = await supabaseClient
            .from("vehicles")
            .insert({ ...vehicleData, created_at: new Date().toISOString() });

          if (insertError) {
            errors.push({
              type: "database_error",
              message: `Failed to insert vehicle: ${insertError.message}`,
              vehicle: vehicle.vin,
            });
          } else {
            recordsCreated++;
          }
        }
      } catch (vehicleError) {
        errors.push({
          type: "validation_error",
          message: vehicleError.message,
          vehicle: vehicle.vin,
        });
      }
    }

    const { data: allDbVehicles } = await supabaseClient
      .from("vehicles")
      .select("id, vin")
      .eq("source", "fender")
      .eq("is_active", true);

    const incomingVins = new Set(vins);
    const vehiclesToDisable = allDbVehicles?.filter(
      v => v.vin && !incomingVins.has(v.vin)
    ) || [];

    let recordsDisabled = 0;
    let photosCleanedUp = 0;
    if (vehiclesToDisable.length > 0) {
      const { error: disableError } = await supabaseClient
        .from("vehicles")
        .update({ is_active: false, status: "Sold" })
        .in("id", vehiclesToDisable.map(v => v.id));

      if (!disableError) {
        recordsDisabled = vehiclesToDisable.length;
      }

      try {
        const disabledVins = vehiclesToDisable.map(v => v.vin).filter(Boolean);
        photosCleanedUp = await cleanupVehiclePhotos(supabaseClient, disabledVins);
      } catch (cleanupErr) {
        console.warn("[PHOTO CLEANUP] Error during cleanup:", cleanupErr.message);
      }
    }

    const duration = Date.now() - startTime;
    const finalStatus = errors.length > 0 ? "partial" : "success";

    await supabaseClient
      .from("sync_history")
      .update({
        status: finalStatus,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_disabled: recordsDisabled,
        total_records_processed: vehicles.length,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncHistoryId);

    await supabaseClient
      .from("dealer_api_config")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", config.id);

    if (errors.length > 0) {
      for (const error of errors.slice(0, 10)) {
        await supabaseClient
          .from("sync_errors")
          .insert({
            sync_history_id: syncHistoryId,
            error_type: error.type,
            error_message: error.message,
            vehicle_data: error.vehicle ? { vin: error.vehicle } : {},
            created_at: new Date().toISOString(),
          });
      }
    }

    const response = {
      ok: true,
      success: true,
      status: finalStatus,
      vehicles_synced: vehicles.length,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_disabled: recordsDisabled,
      photos_copied: photosCopied,
      photos_cleaned_up: photosCleanedUp,
      total: vehicles.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : [],
      duration_ms: duration,
      sync_history_id: syncHistoryId,
      timestamp: new Date().toISOString(),
      trigger_source: triggerSource,
      dealer_id: dealerId,
    };

    console.log('[SYNC COMPLETE]', {
      success: true,
      vehicles_synced: vehicles.length,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_disabled: recordsDisabled,
      photos_copied: photosCopied,
      photos_cleaned_up: photosCleanedUp,
      duration_ms: duration,
      sync_history_id: syncHistoryId,
      trigger_source: triggerSource,
    });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Sync error:", error);

    const duration = Date.now() - startTime;

    if (syncHistoryId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      await supabaseClient
        .from("sync_history")
        .update({
          status: "failure",
          duration_ms: duration,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncHistoryId);

      await supabaseClient
        .from("sync_errors")
        .insert({
          sync_history_id: syncHistoryId,
          error_type: "api_error",
          error_message: error.message,
          error_details: { stack: error.stack },
          created_at: new Date().toISOString(),
        });
    }

    return new Response(
      JSON.stringify({
        success: false,
        step: "finalize",
        error: error.message,
        errorName: error.name,
        message: "An unexpected error occurred during the sync process",
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
