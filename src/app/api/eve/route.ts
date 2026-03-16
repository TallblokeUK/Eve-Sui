import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/sui-client";
import { EVE_WORLD_PACKAGE, EVE_EVENTS } from "@/lib/eve-constants";
import { getCharacterIndex, resolveCharacterName } from "@/lib/eve-cache";

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
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get("limit") ?? 25));

  try {
    switch (action) {
      case "stats": {
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
        const q = searchParams.get("q")?.toLowerCase().trim();
        const index = await getCharacterIndex();

        const filtered = q
          ? index.filter(
              (c) =>
                c.name.toLowerCase().includes(q) ||
                c.objectId.toLowerCase().includes(q) ||
                c.address.toLowerCase().includes(q) ||
                c.itemId.includes(q)
            )
          : index;

        const start = (page - 1) * pageSize;
        const pageData = filtered.slice(start, start + pageSize);

        return jsonResponse({
          data: pageData,
          page,
          total: filtered.length,
          hasMore: start + pageSize < filtered.length,
        });
      }

      case "character-detail": {
        const id = searchParams.get("id");
        if (!id) return jsonResponse({ error: "id parameter required" }, 400);

        const obj = await client.getObject({
          id,
          options: { showContent: true, showType: true, showOwner: true },
        });
        if (!obj.data) return jsonResponse({ error: "Character not found" }, 404);

        const fields = (obj.data.content as Record<string, unknown>).fields as Record<string, unknown>;
        const key = fields.key as Record<string, Record<string, string>>;
        const meta = fields.metadata as Record<string, Record<string, string>>;

        // Get owned objects for this character's address
        const charAddr = fields.character_address as string;
        const owned = charAddr
          ? await client.getOwnedObjects({
              owner: charAddr,
              limit: 20,
              options: { showType: true, showContent: true },
            })
          : null;

        return jsonResponse({
          objectId: obj.data.objectId,
          version: obj.data.version,
          name: meta?.fields?.name || "Unknown",
          description: meta?.fields?.description || "",
          url: meta?.fields?.url || "",
          itemId: key?.fields?.item_id,
          tenant: key?.fields?.tenant,
          tribeId: fields.tribe_id,
          address: charAddr,
          ownerCapId: fields.owner_cap_id,
          ownedObjects: owned?.data?.map((o) => ({
            objectId: o.data?.objectId,
            type: o.data?.type?.split("::")?.pop(),
            fullType: o.data?.type,
          })) ?? [],
        });
      }

      case "killmails": {
        const allEvents: Record<string, unknown>[] = [];
        let cursor = null;
        let hasNext = true;
        const skip = (page - 1) * pageSize;
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
            const parsed = e.parsedJson as Record<string, Record<string, string>>;

            // Resolve killer and victim names
            const [killerName, victimName] = await Promise.all([
              resolveCharacterName(parsed.killer_id?.item_id),
              resolveCharacterName(parsed.victim_id?.item_id),
            ]);

            allEvents.push({
              ...parsed,
              killerName,
              victimName,
              timestamp: e.timestampMs,
              txDigest: e.id.txDigest,
            });
          }
          cursor = r.nextCursor;
          hasNext = r.hasNextPage;
        }

        return jsonResponse({ data: allEvents, page, hasMore: hasNext || allEvents.length === pageSize });
      }

      case "killmail-detail": {
        const digest = searchParams.get("digest");
        if (!digest) return jsonResponse({ error: "digest parameter required" }, 400);

        // Fetch the transaction to get full details
        const tx = await client.getTransactionBlock({
          digest,
          options: { showInput: true, showEffects: true, showEvents: true },
        });

        const killEvent = tx.events?.find((e) =>
          e.type.includes("KillmailCreatedEvent")
        );

        if (!killEvent) return jsonResponse({ error: "Killmail event not found in transaction" }, 404);

        const parsed = killEvent.parsedJson as Record<string, Record<string, string>>;
        const [killerName, victimName, reporterName] = await Promise.all([
          resolveCharacterName(parsed.killer_id?.item_id),
          resolveCharacterName(parsed.victim_id?.item_id),
          resolveCharacterName(parsed.reported_by_character_id?.item_id),
        ]);

        return jsonResponse({
          ...parsed,
          killerName,
          victimName,
          reporterName,
          txDigest: digest,
          timestamp: killEvent.timestampMs,
          sender: tx.transaction?.data?.sender,
          gasUsed: tx.effects?.gasUsed,
        });
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
          { error: "Unknown action. Use: stats, characters, character-detail, killmails, killmail-detail, smart-structures, activity, modules" },
          400
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}
