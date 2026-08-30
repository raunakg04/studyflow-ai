import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntegrationStatusDTO = {
  provider: "google_calendar" | "canvas";
  connected: boolean;
  accountLabel: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  domain: string;
};

export const getIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { readStatuses } = await import("@/lib/integration-status.server");
    const { googleOAuthConfigured } = await import("@/lib/google-oauth.server");
    const statuses = await readStatuses(context.supabase);
    return {
      statuses: statuses as IntegrationStatusDTO[],
      googleConfigured: googleOAuthConfigured(),
    };
  });

export const startGoogleConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildConsentUrl, googleOAuthConfigured, redirectUriFor } = await import(
      "@/lib/google-oauth.server"
    );
    if (!googleOAuthConfigured()) {
      throw new Error(
        "Google Calendar isn't set up for this app yet. Add the Google OAuth client ID and secret.",
      );
    }
    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    return { authorizationUrl: buildConsentUrl(context.userId, redirectUriFor(request)) };
  });

export const syncGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { syncGoogleCalendarForUser } = await import("@/lib/google-calendar.server");
    const { writeStatus } = await import("@/lib/integration-status.server");
    try {
      return await syncGoogleCalendarForUser(context.supabase, context.userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      console.error("[google_calendar] sync failed", message);
      await writeStatus(context.supabase, context.userId, "google_calendar", {
        lastSyncError: message.slice(0, 300),
      });
      throw new Error(message);
    }
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionKeyForUser } = await import(
      "@/lib/app-user-connections.server"
    );
    const { GOOGLE_CONNECTOR_ID, revokeToken } = await import("@/lib/google-oauth.server");

    const refreshToken = await getConnectionKeyForUser(context.userId, GOOGLE_CONNECTOR_ID);
    if (refreshToken) {
      try {
        await revokeToken(refreshToken);
      } catch (error) {
        console.error("[google_calendar] revoke failed", error);
      }
      await deleteConnectionKeyForUser(context.userId, GOOGLE_CONNECTOR_ID);
    }
    await context.supabase.from("calendar_events").delete().eq("source", "google");
    await context.supabase
      .from("integrations")
      .delete()
      .eq("provider", "google_calendar");
    return { ok: true };
  });


export const connectCanvas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { feedUrl: string }) => {
    const feedUrl = String(input?.feedUrl ?? "").trim();
    if (!feedUrl) throw new Error("Paste your Canvas calendar feed link");
    return { feedUrl };
  })
  .handler(async ({ data, context }) => {
    const { normalizeCanvasFeedUrl, canvasFeedLabel, canvasFeedHost, CANVAS_CONNECTOR_ID } =
      await import("@/lib/canvas.server");
    const { saveConnectionKeyForUser } = await import("@/lib/app-user-connections.server");
    const { writeStatus } = await import("@/lib/integration-status.server");

    const feedUrl = normalizeCanvasFeedUrl(data.feedUrl);
    const name = await canvasFeedLabel(feedUrl);

    await saveConnectionKeyForUser(context.userId, CANVAS_CONNECTOR_ID, feedUrl);
    await writeStatus(context.supabase, context.userId, "canvas", {
      status: "connected",
      accountLabel: name,
      lastSyncError: null,
      settings: { domain: canvasFeedHost(feedUrl) },
    });
    return { ok: true, accountLabel: name };
  });


export const syncCanvas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { syncCanvasForUser } = await import("@/lib/canvas.server");
    const { writeStatus } = await import("@/lib/integration-status.server");
    try {
      return await syncCanvasForUser(context.supabase, context.userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      console.error("[canvas] sync failed", message);
      await writeStatus(context.supabase, context.userId, "canvas", {
        lastSyncError: message.slice(0, 300),
      });
      throw new Error(message);
    }
  });

export const disconnectCanvas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { deleteConnectionKeyForUser } = await import("@/lib/app-user-connections.server");
    await deleteConnectionKeyForUser(context.userId, "canvas");
    await context.supabase.from("tasks").delete().eq("source", "canvas");
    await context.supabase.from("integrations").delete().eq("provider", "canvas");
    return { ok: true };
  });
