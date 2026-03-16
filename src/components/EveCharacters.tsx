"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { truncateAddress } from "@/lib/utils";
import CharacterProfile from "./CharacterProfile";

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
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchPage = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "characters", page: String(p), limit: "25" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/eve?${params}`);
      if (!res.ok) throw new Error("Failed to fetch characters");
      const data = await res.json();
      setCharacters(data.data);
      setTotal(data.total);
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
    fetchPage(1, "");
  }, [fetchPage]);

  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setProfileId(null);
      fetchPage(1, value);
    }, 300);
  }

  if (error) {
    return (
      <div className="card-static border-kill/20 bg-kill-dim p-4">
        <p className="text-sm text-kill">{error}</p>
      </div>
    );
  }

  // Show full profile view
  if (profileId) {
    return (
      <div className="space-y-4">
        <CharacterProfile characterId={profileId} onClose={() => setProfileId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search all characters by name, address, or item ID..."
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-white placeholder:font-sans placeholder:text-foreground/20 focus:border-accent/40 focus:outline-none"
          />
        </div>
        {!loading && (
          <span className="whitespace-nowrap text-xs tabular-nums text-foreground/30">
            {total.toLocaleString()} found
          </span>
        )}
      </div>

      {/* List */}
      {loading && characters.length === 0 ? (
        <div className="card-static p-8 text-center text-sm text-foreground/30">
          Building character index...
        </div>
      ) : characters.length === 0 ? (
        <div className="card-static p-8 text-center text-sm text-foreground/30">
          {search ? `No characters matching "${search}"` : "No characters found"}
        </div>
      ) : (
        <div className="card-static divide-y divide-border overflow-hidden">
          {characters.map((char) => (
            <button
              key={char.objectId}
              onClick={() => setProfileId(char.objectId)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-accent-dim text-xs font-bold text-accent">
                  {char.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{char.name}</p>
                  <p className="font-mono text-[0.65rem] text-foreground/25">
                    {truncateAddress(char.objectId)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-foreground/40">Tribe {char.tribeId}</p>
                  <p className="font-mono text-[0.65rem] text-foreground/20">#{char.itemId}</p>
                </div>
                <span className="text-foreground/15 text-xs">View</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => fetchPage(page - 1, search)}
          disabled={page <= 1 || loading}
          className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground/50 transition-colors hover:bg-surface-hover hover:text-white disabled:opacity-20"
        >
          Previous
        </button>
        <span className="text-xs tabular-nums text-foreground/25">
          Page {page} of {Math.max(1, Math.ceil(total / 25))}
        </span>
        <button
          onClick={() => fetchPage(page + 1, search)}
          disabled={!hasMore || loading}
          className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground/50 transition-colors hover:bg-surface-hover hover:text-white disabled:opacity-20"
        >
          Next
        </button>
      </div>
    </div>
  );
}
