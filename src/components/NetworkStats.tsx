"use client";

import { useEffect, useState } from "react";

interface Stats {
  checkpoint: string;
  totalTx: string;
  referenceGasPrice: string;
}

export default function NetworkStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/sui?action=network-stats");
        if (!res.ok) throw new Error("Failed to fetch");
        setStats(await res.json());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="card-static border-kill/20 bg-kill-dim p-4">
        <p className="text-sm text-kill">{error}</p>
      </div>
    );
  }

  const cards = [
    { label: "Checkpoint", value: stats ? Number(stats.checkpoint).toLocaleString() : "---" },
    { label: "Total Txns", value: stats ? Number(stats.totalTx).toLocaleString() : "---" },
    { label: "Gas Price", value: stats ? `${stats.referenceGasPrice} MIST` : "---" },
  ];

  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <div key={card.label} className="card-static flex items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/30">
            {card.label}
          </span>
          <span className="font-mono text-sm font-medium tabular-nums text-white">
            {card.value}
          </span>
        </div>
      ))}
    </div>
  );
}
