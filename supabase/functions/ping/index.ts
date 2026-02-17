import { corsHeaders } from "../_shared/cors.ts";

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[PING] Request received - no auth required");

  return new Response(
    JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
