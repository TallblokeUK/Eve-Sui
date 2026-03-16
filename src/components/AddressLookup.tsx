"use client";

import { useState } from "react";
import { mistToSui, truncateAddress } from "@/lib/utils";

interface OwnedObject {
  data?: {
    objectId: string;
    type?: string;
    version?: string;
  };
}

export default function AddressLookup() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<string | null>(null);
  const [objects, setObjects] = useState<OwnedObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setBalance(null);
    setObjects([]);

    try {
      const [balRes, objRes] = await Promise.all([
        fetch(`/api/sui?action=balance&address=${encodeURIComponent(trimmed)}`),
        fetch(`/api/sui?action=owned-objects&address=${encodeURIComponent(trimmed)}`),
      ]);

      if (!balRes.ok || !objRes.ok) {
        const errData = await (balRes.ok ? objRes : balRes).json();
        throw new Error(errData.error || "Lookup failed");
      }

      const balData = await balRes.json();
      const objData = await objRes.json();

      setBalance(balData.totalBalance ?? balData.balance?.totalBalance ?? "0");
      setObjects(objData.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleLookup} className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-white placeholder:font-sans placeholder:text-foreground/20 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded-lg border border-accent/30 bg-accent-dim px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-30"
        >
          {loading ? "..." : "Lookup"}
        </button>
      </form>

      {error && (
        <div className="card-static border-kill/20 bg-kill-dim p-3">
          <p className="text-sm text-kill">{error}</p>
        </div>
      )}

      {balance !== null && (
        <div className="card-static p-4">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-foreground/20">Balance</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {mistToSui(balance)} <span className="text-sm font-normal text-foreground/30">SUI</span>
          </p>
        </div>
      )}

      {objects.length > 0 && (
        <div>
          <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-wider text-foreground/20">
            Owned Objects ({objects.length})
          </p>
          <div className="card-static max-h-60 divide-y divide-border overflow-y-auto">
            {objects.map((obj) => {
              const d = obj.data;
              if (!d) return null;
              const typeName = d.type?.split("::")?.pop() ?? "Unknown";
              return (
                <div key={d.objectId} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="font-mono text-xs text-foreground/40">{truncateAddress(d.objectId)}</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[0.65rem] text-foreground/50">{typeName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
