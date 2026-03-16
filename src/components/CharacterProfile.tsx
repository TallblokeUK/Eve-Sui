"use client";

import { useState, useEffect } from "react";
import { truncateAddress, mistToSui, timeAgo } from "@/lib/utils";

interface Kill {
  killer_id: { item_id: string };
  victim_id: { item_id: string };
  loss_type: { variant: string };
  solar_system_id: { item_id: string };
  killerName?: string | null;
  victimName?: string | null;
  timestamp: string;
  txDigest: string;
}

interface ProfileData {
  objectId: string;
  version: string;
  name: string;
  description: string;
  itemId: string;
  tenant: string;
  tribeId: number;
  address: string;
  balance: string;
  stats: {
    kills: number;
    deaths: number;
    structures: number;
    ownedObjects: number;
    transactions: number;
  };
  killsAsKiller: Kill[];
  killsAsVictim: Kill[];
  structures: { objectId: string; type: string; capTarget: string | null }[];
  ownedObjects: { objectId: string; type: string }[];
  transactions: { digest: string; timestamp: string; status: string }[];
}

export default function CharacterProfile({
  characterId,
  onClose,
}: {
  characterId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"kills" | "deaths" | "assets" | "txns">("kills");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/eve/character?id=${characterId}`);
        if (!res.ok) throw new Error("Failed to load profile");
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [characterId]);

  if (loading) {
    return (
      <div className="card-static p-12 text-center">
        <p className="text-sm text-foreground/30">Loading character dossier...</p>
        <div className="mt-3 mx-auto h-0.5 w-32 overflow-hidden rounded bg-white/5">
          <div className="h-full w-1/3 animate-pulse rounded bg-accent/40" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-static p-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-kill">{error ?? "Profile unavailable"}</p>
          <button onClick={onClose} className="text-xs text-foreground/30 hover:text-white">Close</button>
        </div>
      </div>
    );
  }

  const kd = data.stats.deaths > 0
    ? (data.stats.kills / data.stats.deaths).toFixed(1)
    : data.stats.kills > 0
    ? "Perfect"
    : "—";

  const tabs = [
    { id: "kills" as const, label: "Kills", count: data.stats.kills },
    { id: "deaths" as const, label: "Deaths", count: data.stats.deaths },
    { id: "assets" as const, label: "Assets", count: data.stats.ownedObjects + data.stats.structures },
    { id: "txns" as const, label: "Transactions", count: data.stats.transactions },
  ];

  return (
    <div className="card-static overflow-hidden">
      {/* Header */}
      <div className="relative border-b border-border bg-gradient-to-r from-accent/5 to-transparent p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground/40 hover:bg-surface-hover hover:text-white"
        >
          Close
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent-dim text-xl font-bold text-accent">
            {data.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{data.name}</h2>
            {data.description && (
              <p className="mt-0.5 text-sm text-foreground/40">{data.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-foreground/30">
              <span>Tribe {data.tribeId}</span>
              <span className="text-foreground/10">|</span>
              <span className="font-mono">{truncateAddress(data.address)}</span>
              <span className="text-foreground/10">|</span>
              <span>#{data.itemId}</span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: "Kills", value: data.stats.kills, color: "text-kill" },
            { label: "Deaths", value: data.stats.deaths, color: "text-amber" },
            { label: "K/D", value: kd, color: "text-white" },
            { label: "Structures", value: data.stats.structures, color: "text-cyan" },
            { label: "Balance", value: `${mistToSui(data.balance)} SUI`, color: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="rounded bg-black/30 px-3 py-2">
              <p className="text-[0.55rem] uppercase tracking-wider text-foreground/20">{s.label}</p>
              <p className={`mt-0.5 text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-accent text-accent"
                : "text-foreground/25 hover:text-foreground/50"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-foreground/15">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-h-80 overflow-y-auto">
        {activeTab === "kills" && (
          data.killsAsKiller.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground/20">No kills recorded</div>
          ) : (
            <div className="divide-y divide-border">
              {data.killsAsKiller.map((k, i) => (
                <div key={`${k.txDigest}-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <p>
                      <span className="text-foreground/30">Destroyed </span>
                      <span className="font-semibold text-white">
                        {k.victimName || `#${k.victim_id?.item_id}`}
                      </span>
                    </p>
                    <p className="text-[0.6rem] text-foreground/15">
                      {k.loss_type?.variant} &middot; System #{k.solar_system_id?.item_id}
                    </p>
                  </div>
                  <span className="text-[0.65rem] text-foreground/20">{timeAgo(k.timestamp)}</span>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "deaths" && (
          data.killsAsVictim.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground/20">No deaths recorded</div>
          ) : (
            <div className="divide-y divide-border">
              {data.killsAsVictim.map((k, i) => (
                <div key={`${k.txDigest}-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <p>
                      <span className="text-foreground/30">Killed by </span>
                      <span className="font-semibold text-kill">
                        {k.killerName || `#${k.killer_id?.item_id}`}
                      </span>
                    </p>
                    <p className="text-[0.6rem] text-foreground/15">
                      {k.loss_type?.variant} &middot; System #{k.solar_system_id?.item_id}
                    </p>
                  </div>
                  <span className="text-[0.65rem] text-foreground/20">{timeAgo(k.timestamp)}</span>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "assets" && (
          <div className="divide-y divide-border">
            {data.structures.length > 0 && (
              <>
                <div className="px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-wider text-foreground/20 bg-surface">
                  Structures Owned
                </div>
                {data.structures.map((s) => (
                  <div key={s.objectId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-cyan-dim px-1.5 py-0.5 text-[0.6rem] font-semibold text-cyan">
                        {s.capTarget ?? "Structure"}
                      </span>
                      <span className="font-mono text-xs text-foreground/30">{truncateAddress(s.objectId!)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {data.ownedObjects.length > 0 && (
              <>
                <div className="px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-wider text-foreground/20 bg-surface">
                  Other Objects
                </div>
                {data.ownedObjects.map((o) => (
                  <div key={o.objectId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[0.6rem] text-foreground/40">
                        {o.type}
                      </span>
                      <span className="font-mono text-xs text-foreground/30">{truncateAddress(o.objectId!)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {data.structures.length === 0 && data.ownedObjects.length === 0 && (
              <div className="p-8 text-center text-sm text-foreground/20">No assets found</div>
            )}
          </div>
        )}

        {activeTab === "txns" && (
          data.transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground/20">No transactions found</div>
          ) : (
            <div className="divide-y divide-border">
              {data.transactions.map((tx) => (
                <div key={tx.digest} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${tx.status === "success" ? "bg-online" : "bg-kill"}`} />
                    <span className="font-mono text-xs text-foreground/40">{truncateAddress(tx.digest, 10, 6)}</span>
                  </div>
                  <span className="text-[0.65rem] text-foreground/20">
                    {tx.timestamp ? timeAgo(tx.timestamp) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
