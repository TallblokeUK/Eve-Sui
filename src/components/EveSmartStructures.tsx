"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";

interface Structure {
  type: "Gate" | "Storage Unit" | "Turret";
  timestamp: string;
  assembly_key?: { fields?: { item_id?: string; tenant?: string } };
  gate_key?: { fields?: { item_id?: string; tenant?: string } };
  [key: string]: unknown;
}

const TYPE_STYLES: Record<string, string> = {
  Gate: "bg-cyan-500/20 text-cyan-400",
  "Storage Unit": "bg-amber-500/20 text-amber-400",
  Turret: "bg-red-500/20 text-red-400",
};

export default function EveSmartStructures() {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/eve?action=smart-structures");
        if (!res.ok) throw new Error("Failed to fetch structures");
        const data = await res.json();
        setStructures(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetch_();
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
        Loading smart structures...
      </div>
    );
  }

  if (structures.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
        No smart structures deployed yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {structures.map((s, i) => {
        const key = s.assembly_key ?? s.gate_key;
        const itemId = key?.fields?.item_id ?? "—";

        return (
          <div
            key={`${s.type}-${i}`}
            className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[s.type] ?? "bg-zinc-500/20 text-zinc-400"}`}
              >
                {s.type}
              </span>
              <span className="font-mono text-zinc-400">#{itemId}</span>
            </div>
            <span className="text-xs text-zinc-500">
              {timeAgo(s.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
