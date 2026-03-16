import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/sui-client";
import { EVE_WORLD_PACKAGE, EVE_EVENTS } from "@/lib/eve-constants";

function jsonResponse(data: unknown, status = 200) {
  const body = JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Paginate through events and collect object IDs */
async function collectEventIds(
  eventType: string,
  idField: string,
  limit: number
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: { txDigest: string; eventSeq: string } | null = null;
  while (ids.length < limit) {
    const batch = Math.min(50, limit - ids.length);
    const result = await client.queryEvents({
      query: { MoveEventType: eventType },
      limit: batch,
      order: "descending",
      ...(cursor ? { cursor } : {}),
    });
    for (const e of result.data) {
      const id = (e.parsedJson as Record<string, string>)?.[idField];
      if (id) ids.push(id);
    }
    if (!result.hasNextPage) break;
    cursor = result.nextCursor as { txDigest: string; eventSeq: string };
  }
  return ids;
}

/** Fetch objects in batches of 50 (multiGetObjects limit) */
async function fetchObjects(ids: string[]) {
  const results = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const objects = await client.multiGetObjects({
      ids: batch,
      options: { showContent: true, showType: true },
    });
    results.push(...objects);
  }
  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get("limit") ?? 25));

  try {
    switch (action) {
      case "stats": {
        // Count totals by paginating all events (cached for 60s by Vercel)
        const counts = await Promise.all(
          [
            ["Characters", EVE_EVENTS.CharacterCreated],
            ["Assemblies", EVE_EVENTS.AssemblyCreated],
            ["Storage Units", EVE_EVENTS.StorageUnitCreated],
            ["Turrets", EVE_EVENTS.TurretCreated],
            ["Killmails", EVE_EVENTS.KillmailCreated],
          ].map(async ([label, eventType]) => {
            let count = 0;
            let cursor = null;
            let hasNext = true;
            while (hasNext) {
              const r = await client.queryEvents({
                query: { MoveEventType: eventType },
                limit: 50,
                order: "descending",
                ...(cursor ? { cursor } : {}),
              });
              count += r.data.length;
              cursor = r.nextCursor;
              hasNext = r.hasNextPage;
            }
            return { label, count };
          })
        );
        return jsonResponse(counts);
      }

      case "characters": {
        const skip = (page - 1) * pageSize;
        const ids = await collectEventIds(
          EVE_EVENTS.CharacterCreated,
          "character_id",
          skip + pageSize
        );

        const pageIds = ids.slice(skip, skip + pageSize);
        if (pageIds.length === 0) return jsonResponse({ data: [], page, hasMore: false });

        const objects = await fetchObjects(pageIds);
        const characters = objects
          .filter((o) => o.data?.content?.dataType === "moveObject")
          .map((o) => {
            const fields = (o.data!.content as Record<string, unknown>).fields as Record<string, unknown>;
            const key = fields.key as Record<string, Record<string, string>>;
            const meta = fields.metadata as Record<string, Record<string, string>>;
            return {
              objectId: o.data!.objectId,
              name: meta?.fields?.name || "Unknown",
              itemId: key?.fields?.item_id,
              tenant: key?.fields?.tenant,
              tribeId: fields.tribe_id,
              address: fields.character_address,
            };
          });

        return jsonResponse({ data: characters, page, hasMore: ids.length > skip + pageSize });
      }

      case "killmails": {
        const skip = (page - 1) * pageSize;
        // Killmail events contain everything we need directly
        const allEvents: Record<string, unknown>[] = [];
        let cursor = null;
        let hasNext = true;
        let skipped = 0;
        while (allEvents.length < pageSize && hasNext) {
          const r = await client.queryEvents({
            query: { MoveEventType: EVE_EVENTS.KillmailCreated },
            limit: 50,
            order: "descending",
            ...(cursor ? { cursor } : {}),
          });
          for (const e of r.data) {
            if (skipped < skip) { skipped++; continue; }
            if (allEvents.length >= pageSize) break;
            allEvents.push({
              ...(e.parsedJson as Record<string, unknown>),
              timestamp: e.timestampMs,
              txDigest: e.id.txDigest,
            });
          }
          cursor = r.nextCursor;
          hasNext = r.hasNextPage;
        }

        return jsonResponse({ data: allEvents, page, hasMore: hasNext || allEvents.length === pageSize });
      }

      case "smart-structures": {
        const [storageEvents, turretEvents] = await Promise.all([
          client.queryEvents({
            query: { MoveEventType: EVE_EVENTS.StorageUnitCreated },
            limit: 25,
            order: "descending",
          }),
          client.queryEvents({
            query: { MoveEventType: EVE_EVENTS.TurretCreated },
            limit: 25,
            order: "descending",
          }),
        ]);

        const structures = [
          ...storageEvents.data.map((e) => ({
            type: "Storage Unit" as const,
            ...(e.parsedJson as Record<string, unknown>),
            timestamp: e.timestampMs,
          })),
          ...turretEvents.data.map((e) => ({
            type: "Turret" as const,
            ...(e.parsedJson as Record<string, unknown>),
            timestamp: e.timestampMs,
          })),
        ].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

        return jsonResponse(structures);
      }

      case "activity": {
        const eventQueries = Object.entries(EVE_EVENTS).map(
          async ([name, type]) => {
            try {
              const result = await client.queryEvents({
                query: { MoveEventType: type },
                limit: 10,
                order: "descending",
              });
              return result.data.map((e) => ({
                eventType: name,
                timestamp: e.timestampMs,
                txDigest: e.id.txDigest,
                data: e.parsedJson,
              }));
            } catch {
              return [];
            }
          }
        );

        const results = await Promise.all(eventQueries);
        const allEvents = results
          .flat()
          .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
          .slice(0, 50);

        return jsonResponse(allEvents);
      }

      case "modules": {
        const modules = await client.getNormalizedMoveModulesByPackage({
          package: EVE_WORLD_PACKAGE,
        });
        const summary = Object.entries(modules).map(([name, mod]) => ({
          name,
          structs: Object.keys(mod.structs),
          functions: Object.keys(mod.exposedFunctions),
        }));
        return jsonResponse(summary);
      }

      default:
        return jsonResponse(
          { error: "Unknown action. Use: stats, characters, killmails, smart-structures, activity, modules" },
          400
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}
