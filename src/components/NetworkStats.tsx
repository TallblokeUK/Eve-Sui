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
        if (!res.ok) throw new Error("Failed to fetch network stats");
        const data = await res.json();
        setStats(data);
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
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">Failed to load network stats: {error}</p>
      </div>
    );
  }

  const cards = [
    {
      label: "Latest Checkpoint",
      value: stats ? Number(stats.checkpoint).toLocaleString() : "---",
    },
    {
      label: "Total Transactions",
      value: stats ? Number(stats.totalTx).toLocaleString() : "---",
    },
    {
      label: "Reference Gas Price",
      value: stats ? `${stats.referenceGasPrice} MIST` : "---",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-white/10 bg-white/5 p-5"
        >
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
