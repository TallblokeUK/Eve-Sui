"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { truncateAddress } from "@/lib/utils";

interface Character {
  objectId: string;
  name: string;
  itemId: string;
  tenant: string;
  tribeId: number;
  address: string;
}

interface CharacterDetail {
  objectId: string;
  version: string;
  name: string;
  description: string;
  url: string;
  itemId: string;
  tenant: string;
  tribeId: number;
  address: string;
  ownerCapId: string;
  ownedObjects: { objectId: string; type: string; fullType: string }[];
}

export default function EveCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CharacterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
      setExpandedId(null);
      setDetail(null);
      fetchPage(1, value);
    }, 300);
  }

  async function toggleDetail(objectId: string) {
    if (expandedId === objectId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(objectId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/eve?action=character-detail&id=${objectId}`);
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
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search all characters by name, address, or item ID..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none"
        />
        {!loading && (
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            {total.toLocaleString()} result{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading && characters.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
          Loading characters...
        </div>
      ) : characters.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
          {search ? `No characters matching "${search}"` : "No characters found"}
        </div>
      ) : (
        <div className="space-y-1">
          {characters.map((char) => (
            <div key={char.objectId}>
              <button
                onClick={() => toggleDetail(char.objectId)}
                className="flex w-full items-center justify-between rounded border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
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
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Tribe {char.tribeId}</p>
                    <p className="font-mono text-xs text-zinc-600">#{char.itemId}</p>
                  </div>
                  <span className="text-zinc-600">{expandedId === char.objectId ? "−" : "+"}</span>
                </div>
              </button>

              {expandedId === char.objectId && (
                <div className="ml-11 border-l border-white/5 pl-4 py-3 space-y-2 text-sm">
                  {detailLoading ? (
                    <p className="text-zinc-500">Loading details...</p>
                  ) : detail ? (
                    <>
                      {detail.description && (
                        <p className="text-zinc-300">{detail.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <div>
                          <span className="text-zinc-600">Object ID</span>
                          <p className="font-mono text-zinc-400 break-all">{detail.objectId}</p>
                        </div>
                        <div>
                          <span className="text-zinc-600">Wallet Address</span>
                          <p className="font-mono text-zinc-400 break-all">{detail.address}</p>
                        </div>
                        <div>
                          <span className="text-zinc-600">Item ID</span>
                          <p className="font-mono text-zinc-400">{detail.itemId}</p>
                        </div>
                        <div>
                          <span className="text-zinc-600">Tenant</span>
                          <p className="text-zinc-400">{detail.tenant}</p>
                        </div>
                        <div>
                          <span className="text-zinc-600">Tribe</span>
                          <p className="text-zinc-400">{detail.tribeId}</p>
                        </div>
                        <div>
                          <span className="text-zinc-600">Version</span>
                          <p className="font-mono text-zinc-400">{detail.version}</p>
                        </div>
                      </div>
                      {detail.ownedObjects.length > 0 && (
                        <div className="pt-1">
                          <p className="text-xs text-zinc-600 mb-1">Owned Objects</p>
                          {detail.ownedObjects.map((o) => (
                            <div key={o.objectId} className="flex items-center gap-2 text-xs py-0.5">
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-300">{o.type}</span>
                              <span className="font-mono text-zinc-500">{truncateAddress(o.objectId)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-zinc-500">Failed to load details</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => fetchPage(page - 1, search)}
          disabled={page <= 1 || loading}
          className="rounded bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          Previous
        </button>
        <span className="text-xs text-zinc-500">
          Page {page} of {Math.ceil(total / 25)}
        </span>
        <button
          onClick={() => fetchPage(page + 1, search)}
          disabled={!hasMore || loading}
          className="rounded bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
