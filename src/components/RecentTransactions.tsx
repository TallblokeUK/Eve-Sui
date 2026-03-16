"use client";

import { useEffect, useState } from "react";
import { truncateAddress, timeAgo } from "@/lib/utils";

interface TxBlock {
  digest: string;
  timestampMs?: string;
  transaction?: {
    data?: {
      sender?: string;
      gasData?: {
        budget?: string;
      };
    };
  };
  effects?: {
    status?: {
      status?: string;
    };
  };
}

export default function RecentTransactions() {
  const [txns, setTxns] = useState<TxBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTxns() {
      try {
        const res = await fetch("/api/sui?action=recent-transactions");
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        setTxns(data.data ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    fetchTxns();
    const interval = setInterval(fetchTxns, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (txns.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
        Loading transactions...
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {txns.map((tx) => {
        const sender = tx.transaction?.data?.sender;
        const status = tx.effects?.status?.status ?? "unknown";
        const isSuccess = status === "success";

        return (
          <div
            key={tx.digest}
            className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full ${
                  isSuccess ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="font-mono text-zinc-300">
                {truncateAddress(tx.digest, 8, 6)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-zinc-500">
              {sender && (
                <span className="font-mono text-xs">
                  {truncateAddress(sender)}
                </span>
              )}
              {tx.timestampMs && (
                <span className="text-xs">{timeAgo(tx.timestampMs)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
