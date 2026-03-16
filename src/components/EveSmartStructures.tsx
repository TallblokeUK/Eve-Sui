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

const TYPE_STYLES: Record<string, { text: string; bg: string }> = {
  Gate: { text: "text-cyan", bg: "bg-cyan-dim" },
  "Storage Unit": { text: "text-amber", bg: "bg-amber-dim" },
  Turret: { text: "text-kill", bg: "bg-kill-dim" },
};

export default function EveSmartStructures() {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/eve?action=smart-structures");
        if (!res.ok) return;
        setStructures(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  if (loading) {
    return (
      <div className="card-static p-8 text-center text-sm text-foreground/30">
        Loading structures...
      </div>
    );
  }

  if (structures.length === 0) {
    return (
      <div className="card-static p-8 text-center text-sm text-foreground/30">
        No smart structures deployed yet
      </div>
    );
  }

  return (
    <div className="card-static divide-y divide-border">
      {structures.map((s, i) => {
        const key = s.assembly_key ?? s.gate_key;
        const itemId = key?.fields?.item_id ?? "—";
        const style = TYPE_STYLES[s.type] ?? { text: "text-foreground/50", bg: "bg-white/5" };

        return (
          <div
            key={`${s.type}-${i}`}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className={`rounded px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}>
                {s.type}
              </span>
              <span className="font-mono text-xs text-foreground/30">#{itemId}</span>
            </div>
            <span className="text-[0.65rem] text-foreground/20">{timeAgo(s.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}
