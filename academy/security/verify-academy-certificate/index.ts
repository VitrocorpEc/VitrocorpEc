import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://vitrocorp-academy.vercel.app",
  "https://vitrocorp-academy-git-academy-student-l-1e947c-scienceyapa-4889.vercel.app",
]);

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "Vary": "Origin",
};

function response(body: unknown, status: number, origin: string | null) {
  const headers = new Headers(jsonHeaders);
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function getClientIp(req: Request): string | null {
  // These headers must be supplied/normalized by the Supabase gateway.
  // Do not fall back to a caller-provided query parameter or request body.
  const direct = req.headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}

async function keyedIpHash(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    return response({ error: "Origin not allowed" }, 403, null);
  }
  if (req.method === "OPTIONS") {
    return response({ ok: true }, 200, origin);
  }
  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405, origin);
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 1024) {
    return response({ error: "Invalid request" }, 413, origin);
  }

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return response({ error: "Invalid request" }, 400, origin);
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  // Accept existing 48-bit codes during transition and new 128-bit codes.
  if (!/^(VC-(?:[A-F0-9]{12}|[A-F0-9]{32}))$/.test(code)) {
    return response({ certificate: null }, 200, origin);
  }

  const ip = getClientIp(req);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateLimitSalt = Deno.env.get("CERT_RATE_LIMIT_SALT");
  if (!ip || !supabaseUrl || !serviceRoleKey || !rateLimitSalt) {
    return response({ error: "Verification temporarily unavailable" }, 503, origin);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const ipHash = await keyedIpHash(ip, rateLimitSalt);
    const { data: allowed, error: rateError } = await admin.rpc(
      "consume_certificate_verify_attempt",
      { p_ip_hash: ipHash },
    );
    if (rateError) {
      console.error("Certificate rate-limit check failed:", rateError.message);
      return response({ error: "Verification temporarily unavailable" }, 503, origin);
    }
    if (allowed !== true) {
      const limited = response({ error: "Too many attempts. Try again later." }, 429, origin);
      limited.headers.set("Retry-After", "600");
      return limited;
    }

    const { data, error } = await admin.rpc("verify_academy_certificate", { p_code: code });
    if (error) {
      console.error("Certificate verification failed:", error.message);
      return response({ error: "Verification temporarily unavailable" }, 503, origin);
    }
    const certificate = Array.isArray(data) ? data[0] ?? null : data ?? null;
    return response({ certificate }, 200, origin);
  } catch (error) {
    console.error("Certificate verification error:", error);
    return response({ error: "Verification temporarily unavailable" }, 503, origin);
  }
});
