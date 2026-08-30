import { createFileRoute } from "@tanstack/react-router";

function back(origin: string, status: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/settings?google=${status}` },
  });
}

export const Route = createFileRoute("/api/public/google/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const {
          appOrigin,
          exchangeCodeForTokens,
          redirectUriFor,
          verifyState,
          GOOGLE_CONNECTOR_ID,
        } = await import("@/lib/google-oauth.server");

        const origin = appOrigin(request);
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (url.searchParams.get("error") || !code || !state) return back(origin, "cancelled");

        const userId = verifyState(state);
        if (!userId) return back(origin, "expired");

        try {
          const tokens = await exchangeCodeForTokens(code, redirectUriFor(request));
          if (!tokens.refresh_token) return back(origin, "no_refresh_token");

          const { saveConnectionKeyForUser } = await import("@/lib/app-user-connections.server");
          await saveConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID, tokens.refresh_token);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { syncGoogleCalendarForUser } = await import("@/lib/google-calendar.server");
          await syncGoogleCalendarForUser(supabaseAdmin, userId);

          return back(origin, "connected");
        } catch (error) {
          console.error("[google_calendar] oauth callback failed", error);
          const { writeStatus } = await import("@/lib/integration-status.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          try {
            await writeStatus(supabaseAdmin, userId, "google_calendar", {
              status: "connected",
              lastSyncError:
                error instanceof Error ? error.message.slice(0, 300) : "Connection failed",
            });
          } catch {
            /* status write is best effort */
          }
          return back(origin, "error");
        }
      },
    },
  },
});
