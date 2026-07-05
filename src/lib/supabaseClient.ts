import { createClient } from "@supabase/supabase-js";

let supabaseUrl = "https://dakwzddkunpxvgizbmha.supabase.co/rest/v1/";
let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRha3d6ZGRrdW5weHZnaXpibWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDE5NTAsImV4cCI6MjA5ODcxNzk1MH0.usC9KcPfleLJomFOOnKaQXj_aaeRH3ycKCLnWdWEUKg";

// 1. Try to load from import.meta.env first
try {
  supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://dakwzddkunpxvgizbmha.supabase.co/rest/v1/";
  supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRha3d6ZGRrdW5weHZnaXpibWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDE5NTAsImV4cCI6MjA5ODcxNzk1MH0.usC9KcPfleLJomFOOnKaQXj_aaeRH3ycKCLnWdWEUKg";
} catch (e) {
  // Ignore
}

// 2. Sanitize URL to ensure it doesn't end with rest/v1 or have trailing slashes
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\/+$/, "");
  if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.substring(0, supabaseUrl.length - 8);
  }
  supabaseUrl = supabaseUrl.replace(/\/+$/, "");
}

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase environment variables are missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Secrets panel."
    );
  }
  return supabase;
}

export function isValidUUID(uuid: string | undefined): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Audit Logger Helper to track important user/nominee actions
 */
export async function logAuditAction(
  userId: string | undefined,
  actorName: string,
  actorRole: "User" | "Nominee",
  action: string,
  details: string
) {
  if (!supabase) {
    console.warn("Audit log skipped (Supabase not configured):", action, details);
    return;
  }
  try {
    const safeUserId = userId && isValidUUID(userId) ? userId : null;
    const { error } = await supabase.from("audit_logs").insert({
      user_id: safeUserId,
      actor_name: actorName,
      actor_role: actorRole,
      action: action,
      details: details,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (err) {
    console.error("Audit logging error:", err);
  }
}
