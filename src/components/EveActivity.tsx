"use client";

import { useEffect, useState } from "react";
import { truncateAddress, timeAgo } from "@/lib/utils";

interface EveEvent {
  eventType: string;
  timestamp: string;
  txDigest: string;
  data: Record<string, unknown>;
}

const EVENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CharacterCreated: { label: "New Character", color: "bg-accent", bg: "bg-accent-dim" },
  AssemblyCreated: { label: "Assembly", color: "bg-purple-500", bg: "bg-purple-500/10" },
  GateCreated: { label: "Gate Built", color: "bg-cyan", bg: "bg-cyan-dim" },
  GateLinked: { label: "Gate Linked", color: "bg-cyan", bg: "bg-cyan-dim" },
  Jump: { label: "Gate Jump", color: "bg-online", bg: "bg-online-dim" },
  StorageUnitCreated: { label: "Storage", color: "bg-amber", bg: "bg-amber-dim" },
  TurretCreated: { label: "Turret", color: "bg-kill", bg: "bg-kill-dim" },
  KillmailCreated: { label: "Kill", color: "bg-kill", bg: "bg-kill-dim" },
};

export default function EveActivity() {
  const [events, setEvents] = useState<EveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/eve?action=activity");
        if (!res.ok) return;
        setEvents(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
    const interval = setInterval(fetchActivity, 20_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card-static p-8 text-center text-sm text-foreground/30">
        Loading activity...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card-static p-8 text-center text-sm text-foreground/30">
        No recent activity
      </div>
    );
  }

  return (
    <div className="card-static max-h-[480px] divide-y divide-border overflow-y-auto">
      {events.map((event, i) => {
        const cfg = EVENT_CONFIG[event.eventType] ?? {
          label: event.eventType,
          color: "bg-foreground/50",
          bg: "bg-foreground/5",
        };

        return (
          <div
            key={`${event.txDigest}-${i}`}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.color}`} />
              <span className={`rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${cfg.bg} text-foreground/60`}>
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-foreground/30">
              <span className="font-mono text-[0.65rem]">
                {truncateAddress(event.txDigest, 6, 4)}
              </span>
              <span className="text-[0.65rem]">{timeAgo(event.timestamp)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
