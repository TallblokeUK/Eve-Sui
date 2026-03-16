"use client";

import { useEffect, useState } from "react";
import { truncateAddress, timeAgo } from "@/lib/utils";

interface EveEvent {
  eventType: string;
  timestamp: string;
  txDigest: string;
  data: Record<string, unknown>;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  CharacterCreated: { label: "New Character", color: "bg-blue-500" },
  AssemblyCreated: { label: "Assembly Deployed", color: "bg-purple-500" },
  GateCreated: { label: "Gate Built", color: "bg-cyan-500" },
  GateLinked: { label: "Gate Linked", color: "bg-cyan-400" },
  Jump: { label: "Gate Jump", color: "bg-green-500" },
  StorageUnitCreated: { label: "Storage Unit Built", color: "bg-amber-500" },
  TurretCreated: { label: "Turret Deployed", color: "bg-red-500" },
  KillmailCreated: { label: "Kill Recorded", color: "bg-red-600" },
};

export default function EveActivity() {
  const [events, setEvents] = useState<EveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/eve?action=activity");
        if (!res.ok) throw new Error("Failed to fetch activity");
        const data = await res.json();
        setEvents(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 20_000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
        Loading EVE Frontier activity...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
        No recent activity on-chain
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event, i) => {
        const info = EVENT_LABELS[event.eventType] ?? {
          label: event.eventType,
          color: "bg-zinc-500",
        };

        return (
          <div
            key={`${event.txDigest}-${i}`}
            className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${info.color}`} />
              <span className="font-medium">{info.label}</span>
            </div>
            <div className="flex items-center gap-4 text-zinc-500">
              <span className="font-mono text-xs">
                {truncateAddress(event.txDigest, 8, 6)}
              </span>
              <span className="text-xs">{timeAgo(event.timestamp)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
