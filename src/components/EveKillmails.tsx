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
      const res = await fetch(`/api/eve?action=killmails&page=${p}&limit=10`);
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
      <div className="card-static border-kill/20 bg-kill-dim p-4">
        <p className="text-sm text-kill">{error}</p>
      </div>
    );
  }

  if (loading && kills.length === 0) {
    return (
      <div className="card-static p-8 text-center text-sm text-foreground/30">
        Loading killmails...
      </div>
    );
  }

  if (kills.length === 0) {
    return (
      <div className="card-static p-8 text-center text-sm text-foreground/30">
        No killmails recorded
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card-static max-h-[480px] divide-y divide-border overflow-y-auto">
        {kills.map((kill, i) => {
          const isExpanded = expandedDigest === kill.txDigest;
          const killer = kill.killerName || `#${kill.killer_id?.item_id}`;
          const victim = kill.victimName || `#${kill.victim_id?.item_id}`;

          return (
            <div key={`${kill.txDigest}-${i}`}>
              <button
                onClick={() => toggleDetail(kill.txDigest)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kill" />
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-semibold text-kill">{killer}</span>
                      <span className="text-foreground/30"> destroyed </span>
                      <span className="font-semibold text-white">{victim}</span>
                    </p>
                    <p className="text-[0.6rem] text-foreground/20">
                      {kill.loss_type?.variant} &middot; System #{kill.solar_system_id?.item_id}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-2">
                  <span className="text-[0.65rem] text-foreground/20">{timeAgo(kill.timestamp)}</span>
                  <span className="text-foreground/15 transition-transform text-xs"
                    style={{ transform: isExpanded ? "rotate(45deg)" : "none" }}>
                    +
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border bg-surface px-4 py-4">
                  {detailLoading ? (
                    <p className="text-sm text-foreground/30">Loading details...</p>
                  ) : detail ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                      {[
                        ["Killer", `${detail.killerName ?? "Unknown"} (#${detail.killer_id?.item_id})`],
                        ["Victim", `${detail.victimName ?? "Unknown"} (#${detail.victim_id?.item_id})`],
                        ["Loss Type", detail.loss_type?.variant],
                        ["Solar System", `#${detail.solar_system_id?.item_id}`],
                        ["Reported By", `${detail.reporterName ?? "Unknown"} (#${detail.reported_by_character_id?.item_id})`],
                        ["Kill Time", new Date(Number(detail.kill_timestamp) * 1000).toLocaleString()],
                        ["Transaction", detail.txDigest],
                        ["Sender", detail.sender ? truncateAddress(detail.sender) : "—"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-foreground/20">{label}</p>
                          <p className="mt-0.5 break-all font-mono text-xs text-foreground/50">{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/30">Failed to load details</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => fetchPage(page - 1)}
          disabled={page <= 1 || loading}
          className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground/50 transition-colors hover:bg-surface-hover hover:text-white disabled:opacity-20"
        >
          Previous
        </button>
        <span className="text-xs tabular-nums text-foreground/25">Page {page}</span>
        <button
          onClick={() => fetchPage(page + 1)}
          disabled={!hasMore || loading}
          className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground/50 transition-colors hover:bg-surface-hover hover:text-white disabled:opacity-20"
        >
          Next
        </button>
      </div>
    </div>
  );
}
