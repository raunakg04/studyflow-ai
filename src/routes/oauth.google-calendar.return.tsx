import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/oauth/google-calendar/return")({
  head: () => ({
    meta: [
      { title: "Finishing Google Calendar connection — Tempo" },
      {
        name: "description",
        content: "Completing the secure Google Calendar connection for your Tempo account.",
      },
      { property: "og:title", content: "Connecting Google Calendar — Tempo" },
      {
        property: "og:description",
        content: "Completing the secure Google Calendar connection for your Tempo account.",
      },
    ],
  }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_calendar", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "The Google connection was cancelled.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("Google finished without an exchange code.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    notify("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
