"use client";

import { useEffect, useState } from "react";
import { truncateAddress } from "@/lib/utils";

interface Character {
  objectId: string;
  name: string;
  itemId: string;
  tenant: string;
  tribeId: number;
  address: string;
}

export default function EveCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/eve?action=characters");
        if (!res.ok) throw new Error("Failed to fetch characters");
        const data = await res.json();
        setCharacters(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
        Loading characters...
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
        No characters found on-chain yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {characters.map((char) => (
        <div
          key={char.objectId}
          className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">
              {char.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{char.name}</p>
              <p className="font-mono text-xs text-zinc-500">
                {truncateAddress(char.objectId)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Tribe {char.tribeId}</p>
            <p className="font-mono text-xs text-zinc-600">{char.tenant}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
