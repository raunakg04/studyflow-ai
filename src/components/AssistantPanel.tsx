import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const seeded = [
  {
    from: "ai" as const,
    text: "Morning! I moved your CS problem set to 4:00 PM — your café shift starts at 5, so that's the last clean block before the deadline.",
  },
  {
    from: "user" as const,
    text: "Can you keep Thursday evenings free?",
  },
  {
    from: "ai" as const,
    text: "Done. Thursdays after 6 PM are protected for soccer, and I shifted the ECON review to Thursday afternoon instead.",
  },
];

const quickPrompts = [
  "Reschedule my week",
  "I'm behind on BIO",
  "Add a rest day",
];

export function AssistantPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [messages, setMessages] = useState(seeded);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { from: "user", text },
      {
        from: "ai",
        text: "Got it — once I'm connected to your Canvas and calendar I'll rebuild the affected blocks and show you the changes before anything is saved.",
      },
    ]);
    setDraft("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-4 text-primary" />
            Planner assistant
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.from === "ai"
                  ? "max-w-[85%] rounded-3xl rounded-tl-md bg-surface px-4 py-3 text-sm leading-relaxed"
                  : "ml-auto max-w-[85%] rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground"
              }
            >
              {m.text}
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t p-4">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {p}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask for a change…"
              className="rounded-full"
            />
            <Button type="submit" size="icon" className="size-10 shrink-0 rounded-full">
              <Send className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
