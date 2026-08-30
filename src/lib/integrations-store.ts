import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
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

export function useIntegrations() {
  const { signedIn } = useAuth();
  const queryClient = useQueryClient();

  const fetchStatus = useServerFn(getIntegrations);
  const startGoogle = useServerFn(startGoogleConnect);
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
      // Full-page redirect into Google's consent screen; the server-side
      // callback stores the refresh token and sends the user back to /settings.
      const { authorizationUrl } = await startGoogle();
      window.location.assign(authorizationUrl);
      // Keep the button in its pending state while the browser navigates away.
      await new Promise(() => {});
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
    mutationFn: async (input: { feedUrl: string }) => {
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
