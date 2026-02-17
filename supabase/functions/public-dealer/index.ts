import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/publicApiAuth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { data: dealer, error } = await supabaseClient
      .from("dealer_info")
      .select("*")
      .eq("dealer_id", "trinity")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!dealer) {
      return new Response(
        JSON.stringify({ error: "Dealer not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const response = {
      id: dealer.dealer_id,
      name: dealer.name,
      phone: dealer.phone,
      city: dealer.city,
      state: dealer.state,
      address: dealer.address,
      zip_code: dealer.zip_code,
      email: dealer.email,
      website_url: dealer.website_url,
      logo_url: dealer.logo_url,
      primary_color: dealer.primary_color,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching dealer:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
