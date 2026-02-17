import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders, authenticateRequest } from "../_shared/publicApiAuth.ts";

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
      console.error("API key validation failed:", authResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          message: authResult.error || "Invalid or missing API key",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const dealerId = authResult.dealerId;
    console.log("Authenticated inventory request for dealer:", dealerId);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "12");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sort = url.searchParams.get("sort") || "newest";
    const q = url.searchParams.get("q") || "";
    const minPrice = url.searchParams.get("minPrice");
    const maxPrice = url.searchParams.get("maxPrice");
    const minYear = url.searchParams.get("minYear");
    const maxYear = url.searchParams.get("maxYear");


    const LIST_PHOTO_LIMIT = 5;

    const selectColumns = [
      "id", "slug", "year", "make", "model", "trim",
      "price", "asking_price", "compare_price", "mileage",
      "exterior_color", "interior_color", "drivetrain",
      "transmission", "fuel_type", "body_style", "engine", "engine_type",
      "images", "features", "ai_detected_features", "vin", "stock_number",
      "carfax_report_url", "carfax_one_owner", "carfax_no_accidents",
      "carfax_has_accident", "carfax_well_maintained", "carfax_great_reliability",
      "carfax_service_records_count", "carfax_value_rating",
    ].join(",");

    let query = supabaseClient
      .from("vehicles")
      .select(selectColumns, { count: "exact" })
      .eq("source", "fender")
      .eq("is_active", true)
      .not("vin", "is", null)
      .neq("vin", "");

    if (q) {
      query = query.or(`make.ilike.%${q}%,model.ilike.%${q}%,year.eq.${parseInt(q) || 0}`);
    }

    if (minPrice) {
      query = query.gte("asking_price", parseFloat(minPrice)).not("asking_price", "is", null);
    }

    if (maxPrice) {
      query = query.lte("asking_price", parseFloat(maxPrice)).not("asking_price", "is", null);
    }

    if (minYear) {
      query = query.gte("year", parseInt(minYear));
    }

    if (maxYear) {
      query = query.lte("year", parseInt(maxYear));
    }

    switch (sort) {
      case "price_asc":
        query = query.order("asking_price", { ascending: true, nullsLast: true });
        break;
      case "price_desc":
        query = query.order("asking_price", { ascending: false, nullsLast: true });
        break;
      case "year_desc":
        query = query.order("year", { ascending: false, nullsLast: true });
        break;
      case "mileage_asc":
        query = query.order("mileage", { ascending: true, nullsLast: true });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: vehicles, error, count } = await query;

    if (error) {
      throw error;
    }

    const mappedVehicles = (vehicles || []).map((v) => {
      const safePrice = v.price ? parseFloat(v.price) : 0;
      const safeAskingPrice = v.asking_price ? parseFloat(v.asking_price) : safePrice;

      const allImages = Array.isArray(v.images) ? v.images : [];
      const truncatedImages = allImages.slice(0, LIST_PHOTO_LIMIT);

      return {
        id: v.id,
        slug: v.slug || "",
        year: v.year || 0,
        make: v.make || "",
        model: v.model || "",
        trim: v.trim || "",
        price: safePrice,
        asking_price: safeAskingPrice,
        compare_price: v.compare_price ? parseFloat(v.compare_price) : null,
        mileage: v.mileage || 0,
        color: v.exterior_color || "",
        exterior_color: v.exterior_color || "",
        interior_color: v.interior_color || "",
        drivetrain: v.drivetrain || "",
        transmission: v.transmission || "",
        fuel_type: v.fuel_type || "",
        body_style: v.body_style || "",
        engine: v.engine || "",
        engine_type: v.engine_type || "",
        primary_photo_url: truncatedImages.length > 0 ? truncatedImages[0] : "",
        photo_urls: truncatedImages,
        photo_count: allImages.length,
        vin: v.vin || "",
        stock_number: v.stock_number || "",
        features: Array.isArray(v.features) ? v.features : [],
        ai_detected_features: v.ai_detected_features || null,
        carfax_report_url: v.carfax_report_url || null,
        carfax_one_owner: v.carfax_one_owner || false,
        carfax_no_accidents: v.carfax_no_accidents || false,
        carfax_has_accident: v.carfax_has_accident || false,
        carfax_well_maintained: v.carfax_well_maintained || false,
        carfax_great_reliability: v.carfax_great_reliability || false,
        carfax_service_records_count: v.carfax_service_records_count || 0,
        carfax_value_rating: v.carfax_value_rating || null,
      };
    });

    const response = {
      vehicles: mappedVehicles,
      total: count || 0,
      limit,
      offset,
      pagination: {
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil((count || 0) / limit),
        limit,
        offset,
      },
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=120, s-maxage=300" },
      },
    );
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
