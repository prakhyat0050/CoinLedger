import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProxyRequest {
  chainBaseUrl: string;
  path: string;
  queryParams?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "method_not_allowed", message: "Only POST is supported" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: ProxyRequest = await req.json();

    if (!body.chainBaseUrl || !body.path) {
      return new Response(
        JSON.stringify({ error: "invalid_request", message: "chainBaseUrl and path are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate the base URL is a known Blockscout instance to prevent SSRF
    const allowedHosts = [
      "eth.blockscout.com",
      "polygon.blockscout.com",
      "optimism.blockscout.com",
      "arbitrum.blockscout.com",
      "base.blockscout.com",
      "gnosis.blockscout.com",
      "scroll.blockscout.com",
      "zksync.blockscout.com",
      "linea.blockscout.com",
      "mantle.blockscout.com",
    ];

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.chainBaseUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "invalid_url", message: "Invalid chain base URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return new Response(
        JSON.stringify({ error: "unsupported_chain", message: "This chain is not supported" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the full API URL: {baseUrl}/api/v2/{path}
    const fullPath = body.path.startsWith("/") ? body.path : `/${body.path}`;
    const apiUrl = `${body.chainBaseUrl.replace(/\/$/, "")}/api/v2${fullPath}`;

    // Append query params
    const urlObj = new URL(apiUrl);
    if (body.queryParams) {
      for (const [key, value] of Object.entries(body.queryParams)) {
        urlObj.searchParams.set(key, value);
        }
      }

    // Build headers — API key from env if configured
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    const apiKey = Deno.env.get("BLOCKSCOUT_API_KEY");
    if (apiKey) {
      // Blockscout PRO API key — exact header name may need adjustment
      // per Blockscout docs. Using x-api-key as a common convention.
      headers["x-api-key"] = apiKey;
    }

    const upstreamResponse = await fetch(urlObj.toString(), {
      method: "GET",
      headers,
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      let errorBody: Record<string, unknown>;
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = { raw: errorText };
      }

      const statusCode = upstreamResponse.status;
      let userMessage = "Unable to fetch data from Blockscout";
      let errorCode = "upstream_error";

      if (statusCode === 404) {
        userMessage = "Wallet or resource not found on this network";
        errorCode = "not_found";
      } else if (statusCode === 429) {
        userMessage = "Rate limit reached. Please try again in a moment";
        errorCode = "rate_limited";
      } else if (statusCode >= 500) {
        userMessage = "Blockscout service is temporarily unavailable";
        errorCode = "upstream_unavailable";
      }

      return new Response(
        JSON.stringify({ error: errorCode, message: userMessage, upstream_status: statusCode, upstream_body: errorBody }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await upstreamResponse.json();

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "internal_error", message: "An unexpected error occurred while contacting Blockscout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
