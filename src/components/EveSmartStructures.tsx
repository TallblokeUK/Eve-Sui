"use client";

import { useEffect, useState } from "react";
import { truncateAddress } from "@/lib/utils";

interface StructureData {
  assemblies: { total: number; online: number; offline: number };
  turrets: { total: number; online: number; offline: number };
  typeBreakdown: { typeId: string; label: string; count: number }[];
  topDeployers: { address: string; name: string | null; count: number }[];
}

function StatusRing({ online, offline, label, color }: {
  online: number; offline: number; label: string; color: string;
}) {
  const total = online + offline;
  const pct = total > 0 ? (online / total) * 100 : 0;
  const circumference = 2 * Math.PI * 36;
  const strokeDash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{pct.toFixed(0)}%</span>
          <span className="text-[0.5rem] text-foreground/25 uppercase">online</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{total.toLocaleString()}</p>
        <p className="text-[0.6rem] uppercase tracking-wider text-foreground/25">{label}</p>
      </div>
      <div className="flex gap-3 text-[0.6rem]">
        <span className="text-online">{online} online</span>
        <span className="text-foreground/20">{offline} offline</span>
      </div>
    </div>
  );
}

function TypeBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-foreground/50 truncate max-w-[200px]">{label}</span>
        <span className="text-xs font-bold tabular-nums text-white">{count}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent/60 to-cyan/60"
          style={{ width: `${pct}%`, transition: "width 0.6s ease-out" }}
        />
      </div>
    </div>
  );
}

export default function EveSmartStructures() {
  const [data, setData] = useState<StructureData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/eve/structures");
        if (!res.ok) return;
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  if (loading) {
    return (
      <div className="card-static p-12 text-center">
        <p className="text-sm text-foreground/30">Scanning structure deployments...</p>
        <div className="mt-3 mx-auto h-0.5 w-32 overflow-hidden rounded bg-white/5">
          <div className="h-full w-1/3 animate-pulse rounded bg-cyan/40" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card-static p-8 text-center text-sm text-foreground/30">
        Structure data unavailable
      </div>
    );
  }

  const maxType = data.typeBreakdown[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Status rings */}
      <div className="card-static p-6">
        <div className="flex justify-around">
          <StatusRing
            online={data.assemblies.online}
            offline={data.assemblies.offline}
            label="Assemblies"
            color="rgba(59, 130, 246, 0.8)"
          />
          <StatusRing
            online={data.turrets.online}
            offline={data.turrets.offline}
            label="Turrets"
            color="rgba(239, 68, 68, 0.8)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Type breakdown */}
        <div className="card-static p-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/25 mb-4">
            Structure Types
          </p>
          <div className="space-y-2.5">
            {data.typeBreakdown.map((t) => (
              <TypeBar key={t.typeId} label={t.label} count={t.count} max={maxType} />
            ))}
          </div>
        </div>

        {/* Top deployers */}
        <div className="card-static p-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/25 mb-4">
            Top Builders
          </p>
          <div className="space-y-2">
            {data.topDeployers.map((d, i) => (
              <div key={d.address} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-bold text-foreground/15 w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {d.name ?? truncateAddress(d.address)}
                    </p>
                    {d.name && (
                      <p className="font-mono text-[0.6rem] text-foreground/15">
                        {truncateAddress(d.address)}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold tabular-nums text-cyan">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
