import { NextResponse } from "next/server";
import { modelStatuses, providers } from "@/lib/providers";
import { limits } from "@/lib/server/security";
import type { StatusResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const body: StatusResponse = {
    models: modelStatuses(),
    providers: Object.values(providers).map((p) => ({ id: p.id, label: p.label, configured: p.isConfigured() })),
    limits: { maxUploadMB: limits.maxUploadBytes() / 1024 / 1024, rateLimitPerMin: limits.rateLimitPerMin() },
    persistence: { supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) },
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
