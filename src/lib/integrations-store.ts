import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  completeGoogleConnect,
  connectCanvas,
  disconnectCanvas,
  disconnectGoogleCalendar,
  getIntegrations,
  startGoogleConnect,
  syncCanvas,
  syncGoogleCalendar,
  type IntegrationStatusDTO,
} from "@/lib/integrations.functions";
import { useAuth } from "@/lib/use-auth";

export type { IntegrationStatusDTO };

const GOOGLE_CONNECTOR_ID = "google_calendar";

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = (event.data as { type?: string })?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        (event.data as { connectorId?: string })?.connectorId !== GOOGLE_CONNECTOR_ID ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      ) {
        return;
      }
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        const code = (event.data as { code?: string | null }).code;
        resolve(typeof code === "string" ? code : null);
        return;
      }
      popup.close();
      reject(new Error("The Google connection was not completed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The Google window closed before finishing."));
    }, 500);
  });
}

export function useIntegrations() {
  const { signedIn } = useAuth();
  const queryClient = useQueryClient();

  const fetchStatus = useServerFn(getIntegrations);
  const startGoogle = useServerFn(startGoogleConnect);
  const completeGoogle = useServerFn(completeGoogleConnect);
  const syncGoogleFn = useServerFn(syncGoogleCalendar);
  const disconnectGoogleFn = useServerFn(disconnectGoogleCalendar);
  const connectCanvasFn = useServerFn(connectCanvas);
  const syncCanvasFn = useServerFn(syncCanvas);
  const disconnectCanvasFn = useServerFn(disconnectCanvas);

  const query = useQuery({
    queryKey: ["integrations"],
    queryFn: () => fetchStatus(),
    enabled: signedIn,
    staleTime: 30_000,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["integrations"] });
  }, [queryClient]);

  const refreshData = useCallback(() => {
    void queryClient.invalidateQueries();
    // The task/event stores read from Supabase on mount, so a reload keeps
    // freshly imported rows visible everywhere.
    window.dispatchEvent(new CustomEvent("tempo:data-synced"));
  }, [queryClient]);

  const googleConnect = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "tempo-google-oauth", "width=600,height=720");
      if (!popup) throw new Error("Allow popups for Tempo, then try again.");
      let code: string | null;
      try {
        const { authorizationUrl } = await startGoogle();
        const completion = waitForOAuthCompletion(popup);
        popup.location.href = authorizationUrl;
        code = await completion;
      } catch (error) {
        popup.close();
        throw error;
      }
      if (code) await completeGoogle({ data: { code } });
      await syncGoogleFn();
    },
    onSuccess: () => {
      refresh();
      refreshData();
    },
  });

  const googleSync = useMutation({
    mutationFn: () => syncGoogleFn(),
    onSuccess: () => {
      refresh();
      refreshData();
    },
    onError: refresh,
  });

  const googleDisconnect = useMutation({
    mutationFn: () => disconnectGoogleFn(),
    onSuccess: () => {
      refresh();
      refreshData();
    },
  });

  const canvasConnect = useMutation({
    mutationFn: async (input: { domain: string; token: string }) => {
      await connectCanvasFn({ data: input });
      await syncCanvasFn();
    },
    onSuccess: () => {
      refresh();
      refreshData();
    },
  });

  const canvasSync = useMutation({
    mutationFn: () => syncCanvasFn(),
    onSuccess: () => {
      refresh();
      refreshData();
    },
    onError: refresh,
  });

  const canvasDisconnect = useMutation({
    mutationFn: () => disconnectCanvasFn(),
    onSuccess: () => {
      refresh();
      refreshData();
    },
  });

  const statuses = query.data?.statuses ?? [];
  const google = statuses.find((s) => s.provider === "google_calendar");
  const canvas = statuses.find((s) => s.provider === "canvas");

  return {
    loading: query.isLoading,
    googleConfigured: query.data?.googleConfigured ?? false,
    google,
    canvas,
    googleConnect,
    googleSync,
    googleDisconnect,
    canvasConnect,
    canvasSync,
    canvasDisconnect,
    refresh,
  };
}

export function errorText(error: unknown) {
  if (!error) return "";
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^Error:\s*/, "").slice(0, 200);
}
