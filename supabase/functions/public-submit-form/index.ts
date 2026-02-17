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
    const body = await req.json();
    const { dealer_site_api_key, ...submissionData } = body;

    const authResult = await authenticateRequest(req, dealer_site_api_key);

    if (!authResult.success) {
      console.error("API key validation failed:", authResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "INVALID_API_KEY",
          message: authResult.error || "Invalid or missing API key",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const dealerId = authResult.dealerId;
    console.log("Authenticated request for dealer:", dealerId);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const {
      type,
      first_name,
      last_name,
      name,
      email,
      phone,
      message,
      vehicle_interest,
      sms_consent = false,
      ...otherFields
    } = submissionData;

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, message: "Form type is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let submissionId: string | null = null;
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

    switch (type) {
      case "contact":
      case "lead": {
        const fullName = name || `${first_name || ""} ${last_name || ""}`.trim();
        if (!fullName || !phone) {
          return new Response(
            JSON.stringify({ success: false, message: "Name and phone are required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { data, error } = await supabaseClient
          .from("leads")
          .insert({
            dealer_id: dealerId,
            name: fullName,
            phone,
            email: email || "",
            message: message || "",
            source: type,
            status: "New",
            created_at: timestamp,
            ...smsComplianceFields,
          })
          .select()
          .single();

        if (error) throw error;
        submissionId = data.id;
        break;
      }

      case "credit_application": {
        if (!first_name || !last_name || !phone || !email) {
          return new Response(
            JSON.stringify({ success: false, message: "First name, last name, phone, and email are required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

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

        if (error) throw error;
        submissionId = data.id;
        break;
      }

      case "trade_inquiry": {
        const customerName = name || `${first_name || ""} ${last_name || ""}`.trim();
        if (!customerName || !phone) {
          return new Response(
            JSON.stringify({ success: false, message: "Name and phone are required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { data, error } = await supabaseClient
          .from("trade_ins")
          .insert({
            dealer_id: dealerId,
            customer_name: customerName,
            phone,
            email: email || "",
            ...otherFields,
            status: "New",
            created_at: timestamp,
            ...smsComplianceFields,
          })
          .select()
          .single();

        if (error) throw error;
        submissionId = data.id;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, message: "Invalid form type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: submissionId,
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
    console.error("Error submitting form:", error);
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
