import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/sui-client";
import { EVE_EVENTS } from "@/lib/eve-constants";
import { getCharacterIndex } from "@/lib/eve-cache";

export const maxDuration = 60;

function jsonResponse(data: unknown, status = 200) {
  const body = JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonResponse({ error: "id parameter required" }, 400);

  try {
    // Fetch the character object
    const obj = await client.getObject({
      id,
      options: { showContent: true, showType: true, showOwner: true },
    });
    if (!obj.data) return jsonResponse({ error: "Character not found" }, 404);

    const fields = (obj.data.content as Record<string, unknown>).fields as Record<string, unknown>;
    const key = fields.key as Record<string, Record<string, string>>;
    const meta = fields.metadata as Record<string, Record<string, string>>;
    const charAddr = fields.character_address as string;
    const itemId = key?.fields?.item_id ?? "";

    // Run parallel queries for all related data
    const [ownedResult, txResult, charIndex] = await Promise.all([
      // Owned objects
      charAddr
        ? client.getOwnedObjects({
            owner: charAddr,
            limit: 50,
            options: { showType: true, showContent: true },
          })
        : null,
      // Recent transactions
      charAddr
        ? client.queryTransactionBlocks({
            filter: { FromAddress: charAddr },
            limit: 10,
            order: "descending",
            options: { showInput: true, showEffects: true },
          })
        : null,
      // Character index for name resolution
      getCharacterIndex().catch(() => []),
    ]);

    const nameMap = new Map(charIndex.map((c) => [c.itemId, c.name]));

    // Scan ALL killmails for this character's involvement
    const killsAsKiller: Record<string, unknown>[] = [];
    const killsAsVictim: Record<string, unknown>[] = [];
    let cursor = null;
    let hasNext = true;
    while (hasNext) {
      const r = await client.queryEvents({
        query: { MoveEventType: EVE_EVENTS.KillmailCreated },
        limit: 50,
        order: "descending",
        ...(cursor ? { cursor } : {}),
      });
      for (const e of r.data) {
        const p = e.parsedJson as Record<string, Record<string, string>>;
        if (p.killer_id?.item_id === itemId) {
          killsAsKiller.push({
            ...p,
            victimName: nameMap.get(p.victim_id?.item_id) ?? null,
            timestamp: e.timestampMs,
            txDigest: e.id.txDigest,
          });
        }
        if (p.victim_id?.item_id === itemId) {
          killsAsVictim.push({
            ...p,
            killerName: nameMap.get(p.killer_id?.item_id) ?? null,
            timestamp: e.timestampMs,
            txDigest: e.id.txDigest,
          });
        }
      }
      cursor = r.nextCursor;
      hasNext = r.hasNextPage;
    }

    // Categorize owned objects
    const ownedObjects = (ownedResult?.data ?? []).map((o) => {
      const shortType = o.data?.type?.split("::")?.slice(-1)?.[0] ?? "Unknown";
      const fullType = o.data?.type ?? "";
      const isOwnerCap = fullType.includes("OwnerCap");
      const capTarget = isOwnerCap
        ? fullType.match(/OwnerCap<.*::(\w+)>/)?.[1] ?? null
        : null;
      return {
        objectId: o.data?.objectId,
        type: shortType,
        fullType,
        isOwnerCap,
        capTarget,
      };
    });

    const structures = ownedObjects.filter((o) => o.isOwnerCap);

    // Recent transactions
    const transactions = (txResult?.data ?? []).map((tx) => ({
      digest: tx.digest,
      timestamp: tx.timestampMs,
      status: tx.effects?.status?.status ?? "unknown",
    }));

    // Get SUI balance
    const balance = charAddr
      ? await client.getBalance({ owner: charAddr })
      : null;

    return jsonResponse({
      objectId: obj.data.objectId,
      version: obj.data.version,
      name: meta?.fields?.name || "Unknown",
      description: meta?.fields?.description || "",
      itemId,
      tenant: key?.fields?.tenant ?? "",
      tribeId: fields.tribe_id,
      address: charAddr,
      balance: balance?.totalBalance ?? "0",
      stats: {
        kills: killsAsKiller.length,
        deaths: killsAsVictim.length,
        structures: structures.length,
        ownedObjects: ownedObjects.length,
        transactions: transactions.length,
      },
      killsAsKiller: killsAsKiller.slice(0, 20),
      killsAsVictim: killsAsVictim.slice(0, 20),
      structures,
      ownedObjects: ownedObjects.filter((o) => !o.isOwnerCap),
      transactions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}
