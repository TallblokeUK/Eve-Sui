"use client";

import { useEffect, useState, useCallback } from "react";
import { truncateAddress, timeAgo } from "@/lib/utils";

interface Killmail {
  key: { item_id: string; tenant: string };
  killer_id: { item_id: string; tenant: string };
  victim_id?: { item_id: string; tenant: string };
  reported_by_character_id: { item_id: string; tenant: string };
  loss_type: { variant: string };
  solar_system_id: { item_id: string };
  kill_timestamp: string;
  timestamp: string;
  txDigest: string;
}

export default function EveKillmails() {
  const [kills, setKills] = useState<Killmail[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/eve?action=killmails&page=${p}&limit=15`);
      if (!res.ok) throw new Error("Failed to fetch killmails");
      const data = await res.json();
      setKills(data.data);
      setHasMore(data.hasMore);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (loading && kills.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
        Loading killmails...
      </div>
    );
  }

  if (kills.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
        No killmails recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {kills.map((kill, i) => (
          <div
            key={`${kill.txDigest}-${i}`}
            className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <div>
                <p className="font-medium">
                  <span className="text-red-400">#{kill.killer_id?.item_id}</span>
                  {" destroyed "}
                  <span className="text-zinc-300">
                    {kill.loss_type?.variant?.toLowerCase() ?? "target"}
                  </span>
                </p>
                <p className="font-mono text-xs text-zinc-600">
                  System #{kill.solar_system_id?.item_id} &middot;{" "}
                  {truncateAddress(kill.txDigest, 8, 6)}
                </p>
              </div>
            </div>
            <span className="text-xs text-zinc-500">
              {timeAgo(kill.timestamp)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => fetchPage(page - 1)}
          disabled={page <= 1 || loading}
          className="rounded bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          Previous
        </button>
        <span className="text-xs text-zinc-500">Page {page}</span>
        <button
          onClick={() => fetchPage(page + 1)}
          disabled={!hasMore || loading}
          className="rounded bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
