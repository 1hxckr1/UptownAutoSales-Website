import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Fender-API-Key, X-API-Key",
};

interface AnalyticsEvent {
  event_type: string;
  event_data?: Record<string, unknown>;
  page_url?: string;
  page_title?: string;
  referrer?: string;
  timestamp?: string;
}

interface IngestPayload {
  dealer_id: string;
  session_id: string;
  visitor_id: string;
  user_agent?: string;
  events: AnalyticsEvent[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: IngestPayload & { api_key?: string } = await req.json();

    const apiKey =
      req.headers.get("X-Fender-API-Key") ||
      req.headers.get("x-fender-api-key") ||
      req.headers.get("X-API-Key") ||
      req.headers.get("x-api-key") ||
      body.api_key;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: config, error: configError } = await supabase
      .from("dealer_api_config")
      .select("dealer_id, is_enabled")
      .eq("public_api_key", apiKey)
      .eq("is_enabled", true)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dealerId = config.dealer_id;

    const { data: dealerInfo } = await supabase
      .from("dealer_info")
      .select("analytics_enabled, analytics_allowed_domains")
      .eq("dealer_id", dealerId)
      .maybeSingle();

    if (dealerInfo && dealerInfo.analytics_enabled === false) {
      return new Response(
        JSON.stringify({ success: true, message: "Analytics disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const origin = req.headers.get("Origin") || req.headers.get("Referer") || "";
    if (
      dealerInfo?.analytics_allowed_domains &&
      dealerInfo.analytics_allowed_domains.length > 0
    ) {
      let hostname = "";
      try {
        hostname = new URL(origin).hostname;
      } catch {
        hostname = origin;
      }
      const allowed = dealerInfo.analytics_allowed_domains.some(
        (d: string) => hostname === d || hostname.endsWith(`.${d}`),
      );
      if (!allowed && hostname !== "") {
        console.warn(`[Analytics] Blocked origin: ${hostname}`);
      }
    }

    if (!body.session_id || !body.visitor_id || !Array.isArray(body.events) || body.events.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: session_id, visitor_id, and events[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.events.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many events in batch (max 50)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rows = body.events.map((evt) => ({
      dealer_id: dealerId,
      session_id: body.session_id,
      visitor_id: body.visitor_id,
      event_type: evt.event_type,
      event_data: evt.event_data || {},
      page_url: evt.page_url || null,
      page_title: evt.page_title || null,
      referrer: evt.referrer || null,
      user_agent: body.user_agent || req.headers.get("User-Agent") || null,
      created_at: evt.timestamp || new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("website_analytics_events")
      .insert(rows);

    if (insertError) {
      console.error("[Analytics] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store events" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Analytics] Exception:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
