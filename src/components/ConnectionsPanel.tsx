import { useState } from "react";
import { Check, Link2, Loader2, Plug, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorText, useIntegrations } from "@/lib/integrations-store";
import type { IntegrationStatusDTO } from "@/lib/integrations-store";
import { cn } from "@/lib/utils";

function relativeTime(iso: string | null) {
  if (!iso) return "Never synced";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Synced just now";
  if (mins < 60) return `Synced ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.round(hours / 24)}d ago`;
}

export function ConnectionsPanel({ className }: { className?: string }) {
  const {
    loading,
    googleConfigured,
    google,
    canvas,
    googleConnect,
    googleSync,
    googleDisconnect,
    canvasConnect,
    canvasSync,
    canvasDisconnect,
  } = useIntegrations();
  const [canvasOpen, setCanvasOpen] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      <ConnectionCard
        name="Google Calendar"
        description="Classes, work shifts, and events"
        status={google}
        busy={googleConnect.isPending || googleSync.isPending || googleDisconnect.isPending}
        loading={loading}
        error={
          errorText(googleConnect.error ?? googleSync.error) ||
          google?.lastSyncError ||
          (!googleConfigured && !google?.connected
            ? "Google Calendar isn't set up for this app yet."
            : "")
        }
        disabled={!googleConfigured}
        onConnect={() => googleConnect.mutate()}
        onReconnect={() => googleConnect.mutate()}
        reconnectLabel="Reconnect"
        onSync={() => googleSync.mutate()}
        onDisconnect={() => googleDisconnect.mutate()}
      />

      <ConnectionCard
        name="Canvas"
        description="Assignments, quizzes, and due dates"
        status={canvas}
        busy={canvasConnect.isPending || canvasSync.isPending || canvasDisconnect.isPending}
        loading={loading}
        error={errorText(canvasConnect.error ?? canvasSync.error) || canvas?.lastSyncError || ""}
        onConnect={() => setCanvasOpen(true)}
        onReconnect={() => setCanvasOpen(true)}
        reconnectLabel="Change link"
        onSync={() => canvasSync.mutate()}
        onDisconnect={() => canvasDisconnect.mutate()}
      />

      <CanvasDialog
        open={canvasOpen}
        onOpenChange={setCanvasOpen}
        pending={canvasConnect.isPending}
        error={errorText(canvasConnect.error)}
        defaultFeedUrl=""
        onSubmit={(input) =>
          canvasConnect.mutate(input, { onSuccess: () => setCanvasOpen(false) })
        }
      />

    </div>
  );
}

function ConnectionCard({
  name,
  description,
  status,
  busy,
  loading,
  error,
  disabled,
  onConnect,
  onSync,
  onDisconnect,
}: {
  name: string;
  description: string;
  status: IntegrationStatusDTO | undefined;
  busy: boolean;
  loading: boolean;
  error: string;
  disabled?: boolean;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const connected = Boolean(status?.connected);

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card">
          <Plug className="size-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {connected ? status?.accountLabel || description : description}
          </p>
        </div>
        {connected ? (
          <span className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-primary">
            <Check className="size-3" /> Connected
          </span>
        ) : (
          <Button
            size="sm"
            className="rounded-full"
            disabled={busy || loading || disabled}
            onClick={onConnect}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Link2 className="size-3.5" />
            )}
            Connect
          </Button>
        )}
      </div>

      {connected ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {relativeTime(status?.lastSyncedAt ?? null)}
          </span>
          <span className="flex-1" />
          <Button
            size="sm"
            variant="secondary"
            className="h-8 rounded-full"
            disabled={busy}
            onClick={onSync}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Sync now
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-full"
            disabled={busy}
            onClick={onDisconnect}
          >
            <Unlink className="size-3.5" /> Disconnect
          </Button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function CanvasDialog({
  open,
  onOpenChange,
  pending,
  error,
  defaultFeedUrl,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: string;
  defaultFeedUrl: string;
  onSubmit: (input: { feedUrl: string }) => void;
}) {
  const [feedUrl, setFeedUrl] = useState(defaultFeedUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Canvas</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ feedUrl });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="canvas-feed">Canvas calendar feed link</Label>
            <Input
              id="canvas-feed"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://canvas.university.edu/feeds/calendars/....ics"
              className="rounded-xl"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              In Canvas, open <span className="font-medium">Calendar</span> →{" "}
              <span className="font-medium">Calendar Feed</span> and copy the link (it ends in
              .ics). No access token needed. Tempo stores the link encrypted and only reads your
              due dates.
            </p>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" className="w-full rounded-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Connect Canvas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

