"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/eve?action=characters&page=${p}&limit=25`);
      if (!res.ok) throw new Error("Failed to fetch characters");
      const data = await res.json();
      setCharacters(data.data);
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

  const filtered = search
    ? characters.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.objectId.toLowerCase().includes(search.toLowerCase()) ||
          c.address?.toLowerCase().includes(search.toLowerCase())
      )
    : characters;

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search characters by name or address..."
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none"
      />

      {loading ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
          Loading characters...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
          {search ? "No matches" : "No characters found"}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((char) => (
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
      )}

      {!search && (
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
      )}
    </div>
  );
}
