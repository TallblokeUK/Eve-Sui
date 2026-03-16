"use client";

import { useEffect, useState } from "react";

interface Stat {
  label: string;
  count: number;
}

export default function EveStats() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/eve?action=stats");
        if (!res.ok) return;
        const data = await res.json();
        setStats(data);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-5">
            <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-7 w-12 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">{s.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {s.count.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
