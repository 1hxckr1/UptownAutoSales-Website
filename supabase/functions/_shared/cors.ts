export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Fender-API-Key, X-API-Key",
  "Access-Control-Expose-Headers": "content-length, content-type",
  "Access-Control-Max-Age": "86400",
};

export function getCorsHeaders(origin?: string): Record<string, string> {
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin || "*",
  };
}

export function handleOptions(_req: Request): Response {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
