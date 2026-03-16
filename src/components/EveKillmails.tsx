"use client";

import { useEffect, useState, useCallback } from "react";
import { truncateAddress, timeAgo } from "@/lib/utils";

interface Killmail {
  key: { item_id: string; tenant: string };
  killer_id: { item_id: string; tenant: string };
  victim_id: { item_id: string; tenant: string };
  reported_by_character_id: { item_id: string; tenant: string };
  loss_type: { variant: string };
  solar_system_id: { item_id: string };
  kill_timestamp: string;
  timestamp: string;
  txDigest: string;
  killerName: string | null;
  victimName: string | null;
}

interface KillmailDetail extends Killmail {
  reporterName: string | null;
  sender: string;
  gasUsed: { computationCost: string; storageCost: string; storageRebate: string };
}

export default function EveKillmails() {
  const [kills, setKills] = useState<Killmail[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDigest, setExpandedDigest] = useState<string | null>(null);
  const [detail, setDetail] = useState<KillmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/eve?action=killmails&page=${p}&limit=15`);
      if (!res.ok) throw new Error("Failed to fetch killmails");
      const data = await res.json();
      setKills(data.data);
      setHasMore(data.hasMore);
      setPage(p);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  async function toggleDetail(txDigest: string) {
    if (expandedDigest === txDigest) {
      setExpandedDigest(null);
      setDetail(null);
      return;
    }
    setExpandedDigest(txDigest);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/eve?action=killmail-detail&digest=${txDigest}`);
      if (!res.ok) throw new Error("Failed to load details");
      setDetail(await res.json());
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

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
        {kills.map((kill, i) => {
          const isExpanded = expandedDigest === kill.txDigest;

          return (
            <div key={`${kill.txDigest}-${i}`}>
              <button
                onClick={() => toggleDetail(kill.txDigest)}
                className="flex w-full items-center justify-between rounded border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-left transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <div>
                    <p className="font-medium">
                      <span className="text-red-400">
                        {kill.killerName || `#${kill.killer_id?.item_id}`}
                      </span>
                      {" destroyed "}
                      <span className="text-zinc-300">
                        {kill.victimName || `#${kill.victim_id?.item_id}`}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-600">
                      {kill.loss_type?.variant} &middot; System #{kill.solar_system_id?.item_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {timeAgo(kill.timestamp)}
                  </span>
                  <span className="text-zinc-600">{isExpanded ? "−" : "+"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="ml-5 border-l border-white/5 pl-4 py-3 space-y-2 text-sm">
                  {detailLoading ? (
                    <p className="text-zinc-500">Loading details...</p>
                  ) : detail ? (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                      <div>
                        <span className="text-zinc-600">Killer</span>
                        <p className="text-zinc-300">
                          {detail.killerName ?? "Unknown"}{" "}
                          <span className="text-zinc-500">#{detail.killer_id?.item_id}</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-600">Victim</span>
                        <p className="text-zinc-300">
                          {detail.victimName ?? "Unknown"}{" "}
                          <span className="text-zinc-500">#{detail.victim_id?.item_id}</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-600">Loss Type</span>
                        <p className="text-zinc-300">{detail.loss_type?.variant}</p>
                      </div>
                      <div>
                        <span className="text-zinc-600">Solar System</span>
                        <p className="font-mono text-zinc-400">#{detail.solar_system_id?.item_id}</p>
                      </div>
                      <div>
                        <span className="text-zinc-600">Reported By</span>
                        <p className="text-zinc-300">
                          {detail.reporterName ?? "Unknown"}{" "}
                          <span className="text-zinc-500">#{detail.reported_by_character_id?.item_id}</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-600">Kill Time</span>
                        <p className="text-zinc-400">
                          {new Date(Number(detail.kill_timestamp) * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-600">Transaction</span>
                        <p className="font-mono text-zinc-400 break-all">{detail.txDigest}</p>
                      </div>
                      <div>
                        <span className="text-zinc-600">Sender</span>
                        <p className="font-mono text-zinc-400">{detail.sender ? truncateAddress(detail.sender) : "—"}</p>
                      </div>
                      {detail.gasUsed && (
                        <div className="col-span-2">
                          <span className="text-zinc-600">Gas Used</span>
                          <p className="text-zinc-400">
                            Computation: {detail.gasUsed.computationCost} &middot;
                            Storage: {detail.gasUsed.storageCost} &middot;
                            Rebate: {detail.gasUsed.storageRebate}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500">Failed to load details</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
