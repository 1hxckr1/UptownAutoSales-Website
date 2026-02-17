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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const identifier = pathParts[pathParts.length - 1];

    if (!identifier) {
      return new Response(
        JSON.stringify({ error: "Vehicle ID or slug is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = supabaseClient
      .from("vehicles")
      .select("*")
      .eq("is_active", true);

    if (isUuid) {
      query = query.eq("id", identifier);
    } else {
      query = query.eq("slug", identifier);
    }

    const { data: vehicle, error } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    if (!vehicle) {
      return new Response(
        JSON.stringify({ error: "Vehicle not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const images = Array.isArray(vehicle.images) ? vehicle.images : [];

    const response = {
      id: vehicle.id,
      slug: vehicle.slug || "",
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || "",
      price: parseFloat(vehicle.price),
      asking_price: vehicle.asking_price ? parseFloat(vehicle.asking_price) : parseFloat(vehicle.price),
      compare_price: vehicle.compare_price ? parseFloat(vehicle.compare_price) : null,
      mileage: vehicle.mileage,
      color: vehicle.exterior_color || "",
      exterior_color: vehicle.exterior_color || "",
      interior_color: vehicle.interior_color || "",
      drivetrain: vehicle.drivetrain || "",
      transmission: vehicle.transmission || "Automatic",
      fuel_type: vehicle.fuel_type || "Gasoline",
      body_style: vehicle.body_style || "",
      engine: vehicle.engine || "",
      engine_type: vehicle.engine_type || "",
      description: vehicle.description || "",
      primary_photo_url: images.length > 0 ? images[0] : "",
      photo_urls: images,
      video_urls: Array.isArray(vehicle.video_urls) ? vehicle.video_urls : [],
      vin: vehicle.vin || "",
      stock_number: vehicle.stock_number || "",
      features: Array.isArray(vehicle.features) ? vehicle.features : [],
      ai_detected_features: vehicle.ai_detected_features || null,
      media: vehicle.media || null,
      carfax_report_url: vehicle.carfax_report_url || null,
      carfax_one_owner: vehicle.carfax_one_owner || false,
      carfax_no_accidents: vehicle.carfax_no_accidents || false,
      carfax_has_accident: vehicle.carfax_has_accident || false,
      carfax_well_maintained: vehicle.carfax_well_maintained || false,
      carfax_great_reliability: vehicle.carfax_great_reliability || false,
      carfax_service_records_count: vehicle.carfax_service_records_count || 0,
      carfax_value_rating: vehicle.carfax_value_rating || null,
      mpg: vehicle.mpg || null,
      notes: vehicle.notes || "",
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=120, s-maxage=300" },
      },
    );
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
