"use client";

import { useEffect, useState } from "react";

interface IntelData {
  totalKills: number;
  totalCharacters: number;
  lossTypes: Record<string, number>;
  topKillers: { itemId: string; name: string; count: number }[];
  topVictims: { itemId: string; name: string; count: number }[];
  dangerousSystems: { systemId: string; kills: number }[];
  killsByHour: number[];
  killsByDay: { date: string; count: number }[];
  characterGrowth: { date: string; newChars: number; total: number }[];
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%`, transition: "width 0.6s ease-out" }}
      />
    </div>
  );
}

function HourChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-24">
      {data.map((val, hour) => {
        const pct = (val / max) * 100;
        const intensity = val / max;
        return (
          <div key={hour} className="group relative flex-1 flex flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-t transition-all duration-300"
              style={{
                height: `${Math.max(pct, 2)}%`,
                background: `rgba(239, 68, 68, ${0.15 + intensity * 0.7})`,
              }}
            />
            <div className="absolute -top-7 hidden group-hover:block rounded bg-black/90 px-2 py-0.5 text-[0.6rem] text-white whitespace-nowrap">
              {String(hour).padStart(2, "0")}:00 — {val} kills
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GrowthChart({ data }: { data: { date: string; total: number }[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.total), 1);
  const min = 0;
  const w = 100;
  const h = 40;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.total - min) / (max - min)) * h;
    return `${x},${y}`;
  });

  const areaPoints = `0,${h} ${points.join(" ")} ${w},${h}`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none">
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#growthFill)" />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[0.55rem] text-foreground/20 mt-1">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].total.toLocaleString()} total</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}

export default function IntelDashboard() {
  const [intel, setIntel] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIntel() {
      try {
        const res = await fetch("/api/eve/intel");
        if (!res.ok) return;
        setIntel(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetchIntel();
  }, []);

  if (loading) {
    return (
      <div className="card-static p-12 text-center">
        <p className="text-sm text-foreground/30">Analyzing on-chain intelligence...</p>
        <div className="mt-3 mx-auto h-0.5 w-32 overflow-hidden rounded bg-white/5">
          <div className="h-full w-1/3 animate-pulse rounded bg-accent/40" />
        </div>
      </div>
    );
  }

  if (!intel) {
    return (
      <div className="card-static p-8 text-center text-sm text-foreground/30">
        Intel unavailable
      </div>
    );
  }

  const maxKills = intel.topKillers[0]?.count ?? 1;
  const maxDeaths = intel.topVictims[0]?.count ?? 1;
  const maxSystemKills = intel.dangerousSystems[0]?.kills ?? 1;
  const shipKills = intel.lossTypes["SHIP"] ?? 0;
  const structureKills = intel.lossTypes["STRUCTURE"] ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card-static p-4">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/25">Total Kills</p>
          <p className="mt-1 text-3xl font-bold text-kill">{intel.totalKills}</p>
        </div>
        <div className="card-static p-4">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/25">Ships Lost</p>
          <p className="mt-1 text-3xl font-bold text-amber">{shipKills}</p>
        </div>
        <div className="card-static p-4">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/25">Structures Lost</p>
          <p className="mt-1 text-3xl font-bold text-cyan">{structureKills}</p>
        </div>
        <div className="card-static p-4">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/25">Active Systems</p>
          <p className="mt-1 text-3xl font-bold text-accent">{intel.dangerousSystems.length}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kill activity by hour */}
        <div className="card-static p-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/25 mb-4">
            Kills by Hour (UTC)
          </p>
          <HourChart data={intel.killsByHour} />
          <div className="flex justify-between text-[0.55rem] text-foreground/15 mt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* Character growth */}
        <div className="card-static p-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground/25 mb-4">
            Character Growth
          </p>
          <GrowthChart data={intel.characterGrowth} />
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Killers */}
        <div className="card-static p-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-kill/60 mb-4">
            Top Killers
          </p>
          <div className="space-y-2.5">
            {intel.topKillers.map((k, i) => (
              <div key={k.itemId}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.65rem] font-bold text-foreground/20 w-4">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                      {k.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-kill">
                    {k.count}
                  </span>
                </div>
                <Bar value={k.count} max={maxKills} color="bg-kill/60" />
              </div>
            ))}
          </div>
        </div>

        {/* Most Destroyed */}
        <div className="card-static p-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-amber/60 mb-4">
            Most Destroyed
          </p>
          <div className="space-y-2.5">
            {intel.topVictims.map((v, i) => (
              <div key={v.itemId}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.65rem] font-bold text-foreground/20 w-4">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                      {v.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-amber">
                    {v.count}
                  </span>
                </div>
                <Bar value={v.count} max={maxDeaths} color="bg-amber/60" />
              </div>
            ))}
          </div>
        </div>

        {/* Dangerous Systems */}
        <div className="card-static p-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-cyan/60 mb-4">
            Dangerous Systems
          </p>
          <div className="space-y-2.5">
            {intel.dangerousSystems.map((s, i) => (
              <div key={s.systemId}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.65rem] font-bold text-foreground/20 w-4">
                      {i + 1}
                    </span>
                    <span className="text-sm font-mono text-white">
                      System {s.systemId}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-cyan">
                    {s.kills}
                  </span>
                </div>
                <Bar value={s.kills} max={maxSystemKills} color="bg-cyan/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
