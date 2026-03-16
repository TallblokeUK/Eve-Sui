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
    <div className="space-y-4">
      <form onSubmit={handleLookup} className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter a Sui address (0x...)"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-blue-500 disabled:opacity-40"
        >
          {loading ? "Loading..." : "Lookup"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {balance !== null && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            SUI Balance
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {mistToSui(balance)} <span className="text-lg text-zinc-500">SUI</span>
          </p>
        </div>
      )}

      {objects.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">
            Owned Objects ({objects.length})
          </h3>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {objects.map((obj) => {
              const d = obj.data;
              if (!d) return null;
              const typeName = d.type?.split("::")?.pop() ?? "Unknown";
              return (
                <div
                  key={d.objectId}
                  className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm"
                >
                  <span className="font-mono text-zinc-400">
                    {truncateAddress(d.objectId)}
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                    {typeName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
