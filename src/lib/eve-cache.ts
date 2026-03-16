import client from "@/lib/sui-client";
import { EVE_EVENTS } from "@/lib/eve-constants";

export interface CharacterIndex {
  objectId: string;
  name: string;
  itemId: string;
  tenant: string;
  tribeId: number;
  address: string;
}

interface Cache<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let characterCache: Cache<CharacterIndex[]> | null = null;

/** Build a full character index by paginating events + fetching objects */
export async function getCharacterIndex(): Promise<CharacterIndex[]> {
  if (characterCache && Date.now() - characterCache.timestamp < CACHE_TTL) {
    return characterCache.data;
  }

  // Collect all character IDs from events
  const ids: string[] = [];
  let cursor: { txDigest: string; eventSeq: string } | null = null;
  let hasNext = true;
  while (hasNext) {
    const result = await client.queryEvents({
      query: { MoveEventType: EVE_EVENTS.CharacterCreated },
      limit: 50,
      order: "descending",
      ...(cursor ? { cursor } : {}),
    });
    for (const e of result.data) {
      const id = (e.parsedJson as Record<string, string>)?.character_id;
      if (id) ids.push(id);
    }
    cursor = result.nextCursor as { txDigest: string; eventSeq: string } | null;
    hasNext = result.hasNextPage;
  }

  // Fetch objects in batches of 50
  const characters: CharacterIndex[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const objects = await client.multiGetObjects({
      ids: batch,
      options: { showContent: true },
    });
    for (const o of objects) {
      if (o.data?.content?.dataType !== "moveObject") continue;
      const fields = (o.data.content as Record<string, unknown>).fields as Record<string, unknown>;
      const key = fields.key as Record<string, Record<string, string>>;
      const meta = fields.metadata as Record<string, Record<string, string>>;
      characters.push({
        objectId: o.data.objectId,
        name: meta?.fields?.name || "Unknown",
        itemId: key?.fields?.item_id ?? "",
        tenant: key?.fields?.tenant ?? "",
        tribeId: Number(fields.tribe_id ?? 0),
        address: (fields.character_address as string) ?? "",
      });
    }
  }

  characterCache = { data: characters, timestamp: Date.now() };
  return characters;
}

/** Resolve an in-game item_id to a character name */
export async function resolveCharacterName(itemId: string): Promise<string | null> {
  const index = await getCharacterIndex();
  const char = index.find((c) => c.itemId === itemId);
  return char?.name ?? null;
}
