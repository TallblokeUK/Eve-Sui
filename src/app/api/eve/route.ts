import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/sui-client";
import { EVE_WORLD_PACKAGE, EVE_TYPES, EVE_EVENTS } from "@/lib/eve-constants";

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

  try {
    switch (action) {
      case "characters": {
        const events = await client.queryEvents({
          query: { MoveEventType: EVE_EVENTS.CharacterCreated },
          limit: 50,
          order: "descending",
        });

        const characterIds = events.data
          .map((e) => (e.parsedJson as Record<string, string>)?.character_id)
          .filter(Boolean);

        if (characterIds.length === 0) return jsonResponse([]);

        const objects = await client.multiGetObjects({
          ids: characterIds,
          options: { showContent: true, showType: true },
        });

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

        return jsonResponse(characters);
      }

      case "assemblies": {
        const events = await client.queryEvents({
          query: { MoveEventType: EVE_EVENTS.AssemblyCreated },
          limit: 50,
          order: "descending",
        });

        const assemblyIds = events.data
          .map((e) => (e.parsedJson as Record<string, string>)?.assembly_id)
          .filter(Boolean);

        if (assemblyIds.length === 0) return jsonResponse([]);

        const objects = await client.multiGetObjects({
          ids: assemblyIds,
          options: { showContent: true, showType: true },
        });

        const assemblies = objects
          .filter((o) => o.data?.content?.dataType === "moveObject")
          .map((o) => {
            const fields = (o.data!.content as Record<string, unknown>).fields as Record<string, unknown>;
            const key = fields.key as Record<string, Record<string, string>>;
            const meta = fields.metadata as Record<string, Record<string, string>>;
            const status = fields.status as Record<string, Record<string, unknown>> | undefined;
            return {
              objectId: o.data!.objectId,
              name: meta?.fields?.name || "Unnamed Assembly",
              itemId: key?.fields?.item_id,
              tenant: key?.fields?.tenant,
              typeId: fields.type_id,
              isOnline: status?.fields?.is_online ?? false,
            };
          });

        return jsonResponse(assemblies);
      }

      case "smart-structures": {
        // Query all structure types: Gates, StorageUnits, Turrets
        const [gateEvents, storageEvents, turretEvents] = await Promise.all([
          client.queryEvents({
            query: { MoveEventType: EVE_EVENTS.GateCreated },
            limit: 20,
            order: "descending",
          }),
          client.queryEvents({
            query: { MoveEventType: EVE_EVENTS.StorageUnitCreated },
            limit: 20,
            order: "descending",
          }),
          client.queryEvents({
            query: { MoveEventType: EVE_EVENTS.TurretCreated },
            limit: 20,
            order: "descending",
          }),
        ]);

        const structures = [
          ...gateEvents.data.map((e) => ({
            type: "Gate" as const,
            ...(e.parsedJson as Record<string, unknown>),
            timestamp: e.timestampMs,
          })),
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
        // Recent EVE-related events across all types
        const eventQueries = Object.entries(EVE_EVENTS).map(
          async ([name, type]) => {
            try {
              const result = await client.queryEvents({
                query: { MoveEventType: type },
                limit: 5,
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
          .slice(0, 30);

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
          { error: "Unknown action. Use: characters, assemblies, smart-structures, activity, modules" },
          400
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}
