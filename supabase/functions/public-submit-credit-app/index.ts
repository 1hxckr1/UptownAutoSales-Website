import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders, authenticateRequest } from "../_shared/publicApiAuth.ts";
import { COMPLIANCE_MESSAGES } from "../_shared/smsCompliance.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authResult = await authenticateRequest(req);

    if (!authResult.success) {
      console.error("[CREDIT-APP] API key validation failed:", authResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "INVALID_API_KEY",
          message: authResult.error || "Invalid or missing X-Fender-API-Key",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const dealerId = authResult.dealerId;
    console.log("[CREDIT-APP] Authenticated request for dealer:", dealerId);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const {
      first_name,
      last_name,
      phone,
      email,
      vehicle_interest,
      sms_consent = false,
      ...otherFields
    } = body;

    if (!first_name || !last_name || !phone || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "VALIDATION_ERROR",
          message: "First name, last name, phone, and email are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const timestamp = new Date().toISOString();

    const smsComplianceFields = sms_consent ? {
      sms_opt_in_status: 'opted_in',
      sms_opt_in_method: 'web_form',
      sms_opt_in_timestamp: timestamp,
      sms_opt_in_language_snapshot: COMPLIANCE_MESSAGES.CONSENT_DISCLOSURE,
    } : {
      sms_opt_in_status: 'unknown',
      sms_opt_in_method: null,
      sms_opt_in_timestamp: null,
      sms_opt_in_language_snapshot: null,
    };

    console.log("[CREDIT-APP] Inserting credit application with service role...");

    const { data, error } = await supabaseClient
      .from("finance_applications")
      .insert({
        dealer_id: dealerId,
        first_name,
        last_name,
        phone,
        email,
        vehicle_interest: vehicle_interest || null,
        ...otherFields,
        status: "Pending",
        created_at: timestamp,
        ...smsComplianceFields,
      })
      .select()
      .single();

    if (error) {
      console.error("[CREDIT-APP] Insert failed:", error);
      throw error;
    }

    console.log("[CREDIT-APP] Successfully created credit application:", data.id);

    return new Response(
      JSON.stringify({
        success: true,
        credit_app_id: data.id,
        dealer_id: dealerId,
        timestamp: timestamp,
        sms_opt_in_recorded: sms_consent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[CREDIT-APP] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error_code: "INSERT_FAILED",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
