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
    const statuses = await readStatuses(context.supabase);
    return {
      statuses: statuses as IntegrationStatusDTO[],
      googleConfigured: Boolean(
        process.env['GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY'],
      ),
    };
  });

export const startGoogleConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientAPIKey = process.env['GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY'];
    if (!clientAPIKey) {
      throw new Error(
        "Google Calendar isn't set up for this app yet. Ask the owner to link the Google Calendar connector.",
      );
    }
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/lib/app-user-connections.server");
    const { GATEWAY_BASE_URL, GOOGLE_CONNECTOR_ID, GOOGLE_SCOPES } = await import(
      "@/lib/google-calendar.server"
    );

    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/google-calendar/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const existing = await getConnectionKeyForUser(context.userId, GOOGLE_CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: GOOGLE_CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey,
      returnUrl,
      ...(existing ? { connectionAPIKey: existing } : {}),
      credentialsConfiguration: { scopes: GOOGLE_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeGoogleConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    if (!input?.code || typeof input.code !== "string") throw new Error("Missing OAuth code");
    return { code: input.code };
  })
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("@/lib/app-user-connections.server");
    const { writeStatus } = await import("@/lib/integration-status.server");
    const { GATEWAY_BASE_URL, GOOGLE_CONNECTOR_ID, googleAccountLabel } = await import(
      "@/lib/google-calendar.server"
    );

    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== GOOGLE_CONNECTOR_ID) {
      throw new Error("OAuth completion returned the wrong connector");
    }
    await saveConnectionKeyForUser(context.userId, GOOGLE_CONNECTOR_ID, connectionAPIKey);

    let label = "Google account";
    try {
      label = await googleAccountLabel(connectionAPIKey);
    } catch {
      /* label is cosmetic */
    }
    await writeStatus(context.supabase, context.userId, "google_calendar", {
      status: "connected",
      accountLabel: label,
      lastSyncError: null,
    });
    return { ok: true };
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
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser, deleteConnectionKeyForUser } = await import(
      "@/lib/app-user-connections.server"
    );
    const { GATEWAY_BASE_URL, GOOGLE_CONNECTOR_ID } = await import("@/lib/google-calendar.server");

    const key = await getConnectionKeyForUser(context.userId, GOOGLE_CONNECTOR_ID);
    if (key) {
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: GOOGLE_CONNECTOR_ID,
        });
      } catch (error) {
        console.error("[google_calendar] gateway disconnect failed", error);
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
