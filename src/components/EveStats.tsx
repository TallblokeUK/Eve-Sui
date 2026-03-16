"use client";

import { useEffect, useState } from "react";

interface Stat {
  label: string;
  count: number;
}

const STAT_COLORS: Record<string, string> = {
  Characters: "text-accent",
  Assemblies: "text-cyan",
  "Storage Units": "text-amber",
  Turrets: "text-kill",
  Killmails: "text-kill",
};

export default function EveStats() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/eve?action=stats");
        if (!res.ok) return;
        setStats(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card-static p-5">
            <div className="h-2.5 w-14 animate-pulse rounded bg-white/5" />
            <div className="mt-4 h-8 w-16 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="card-static p-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/30">
            {s.label}
          </p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${STAT_COLORS[s.label] ?? "text-white"}`}>
            {s.count.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
