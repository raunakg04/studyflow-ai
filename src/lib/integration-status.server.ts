import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ProviderId = "google_calendar" | "canvas";

export type IntegrationStatus = {
  provider: ProviderId;
  connected: boolean;
  accountLabel: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  domain: string;
};

export function emptyStatus(provider: ProviderId): IntegrationStatus {
  return {
    provider,
    connected: false,
    accountLabel: "",
    lastSyncedAt: null,
    lastSyncError: null,
    domain: "",
  };
}

type Client = SupabaseClient<Database>;

export async function readStatuses(supabase: Client): Promise<IntegrationStatus[]> {
  const { data } = await supabase
    .from("integrations")
    .select("provider, status, account_label, last_synced_at, last_sync_error, settings");
  const rows = data ?? [];
  return (["google_calendar", "canvas"] as ProviderId[]).map((provider) => {
    const row = rows.find((r) => r.provider === provider);
    if (!row) return emptyStatus(provider);
    const settings = (row.settings ?? {}) as { domain?: string };
    return {
      provider,
      connected: row.status === "connected",
      accountLabel: row.account_label ?? "",
      lastSyncedAt: row.last_synced_at,
      lastSyncError: row.last_sync_error,
      domain: settings.domain ?? "",
    };
  });
}

export async function writeStatus(
  supabase: Client,
  userId: string,
  provider: ProviderId,
  patch: {
    status?: string;
    accountLabel?: string;
    lastSyncedAt?: string | null;
    lastSyncError?: string | null;
    settings?: Record<string, unknown>;
  },
) {
  const row: Record<string, unknown> = {
    user_id: userId,
    provider,
    updated_at: new Date().toISOString(),
  };
  if (patch.status !== undefined) row['status'] = patch.status;
  if (patch.accountLabel !== undefined) row['account_label'] = patch.accountLabel;
  if (patch.lastSyncedAt !== undefined) row['last_synced_at'] = patch.lastSyncedAt;
  if (patch.lastSyncError !== undefined) row['last_sync_error'] = patch.lastSyncError;
  if (patch.settings !== undefined) row['settings'] = patch.settings;
  const { error } = await supabase
    .from("integrations")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, { onConflict: "user_id,provider" });
  if (error) throw error;
}
