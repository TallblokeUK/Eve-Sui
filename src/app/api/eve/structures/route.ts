import { NextResponse } from "next/server";
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

const TYPE_LABELS: Record<string, string> = {
  "87119": "Smart Storage Unit I",
  "87120": "Smart Storage Unit II",
  "88063": "Smart Turret I",
  "88064": "Smart Turret II",
  "88067": "Fuel Bay I",
  "88068": "Refinery I",
  "88069": "Ore Processor I",
  "88070": "Manufacturing Bay I",
  "88071": "Manufacturing Bay II",
  "88093": "Small Assembly",
  "88094": "Medium Assembly",
  "90184": "Smart Gate I",
  "91871": "Advanced Refinery I",
  "91978": "Research Lab I",
  "92279": "Turret Module I",
  "92401": "Turret Module II",
};

async function collectAllEventIds(eventType: string, idField: string) {
  const ids: string[] = [];
  const capIds: string[] = [];
  let cursor = null;
  let hasNext = true;
  while (hasNext) {
    const r = await client.queryEvents({
      query: { MoveEventType: eventType },
      limit: 50,
      order: "descending",
      ...(cursor ? { cursor } : {}),
    });
    for (const e of r.data) {
      const p = e.parsedJson as Record<string, string>;
      if (p[idField]) ids.push(p[idField]);
      if (p.owner_cap_id) capIds.push(p.owner_cap_id);
    }
    cursor = r.nextCursor;
    hasNext = r.hasNextPage;
  }
  return { ids, capIds };
}

async function countAllEvents(eventType: string): Promise<number> {
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
  return count;
}

export async function GET() {
  try {
    // Fetch all event IDs and storage count in parallel
    const [storageTotal, assemblyData, turretData] = await Promise.all([
      countAllEvents(EVE_EVENTS.StorageUnitCreated),
      collectAllEventIds(EVE_EVENTS.AssemblyCreated, "assembly_id"),
      collectAllEventIds(EVE_EVENTS.TurretCreated, "turret_id"),
    ]);

    let assemblyOnline = 0, assemblyOffline = 0;
    let turretOnline = 0, turretOffline = 0;
    const typeCounts: Record<string, number> = {};
    const ownerCounts: Record<string, number> = {};

    // Fetch assembly objects + caps in batches
    for (let i = 0; i < assemblyData.ids.length; i += 50) {
      const idBatch = assemblyData.ids.slice(i, i + 50);
      const capBatch = assemblyData.capIds.slice(i, i + 50);
      const [objs, caps] = await Promise.all([
        client.multiGetObjects({ ids: idBatch, options: { showContent: true } }),
        capBatch.length > 0
          ? client.multiGetObjects({ ids: capBatch, options: { showOwner: true } })
          : Promise.resolve([]),
      ]);

      for (let j = 0; j < objs.length; j++) {
        const fields = (objs[j].data?.content as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
        if (!fields) continue;
        const status = (fields.status as Record<string, Record<string, Record<string, string>>>)?.fields?.status?.variant;
        if (status === "ONLINE") assemblyOnline++;
        else assemblyOffline++;
        const tid = fields.type_id as string;
        typeCounts[tid] = (typeCounts[tid] || 0) + 1;
        const owner = (caps[j]?.data?.owner as Record<string, string>)?.AddressOwner;
        if (owner) ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
      }
    }

    // Fetch turret objects in batches
    for (let i = 0; i < turretData.ids.length; i += 50) {
      const idBatch = turretData.ids.slice(i, i + 50);
      const objs = await client.multiGetObjects({ ids: idBatch, options: { showContent: true } });
      for (const o of objs) {
        const fields = (o.data?.content as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
        if (!fields) continue;
        const status = (fields.status as Record<string, Record<string, Record<string, string>>>)?.fields?.status?.variant;
        if (status === "ONLINE") turretOnline++;
        else turretOffline++;
        const tid = fields.type_id as string;
        typeCounts[tid] = (typeCounts[tid] || 0) + 1;
      }
    }

    // Resolve deployer names
    const charIndex = await getCharacterIndex().catch(() => []);
    const addrToName = new Map(charIndex.map((c) => [c.address, c.name]));

    return jsonResponse({
      assemblies: { total: assemblyData.ids.length, online: assemblyOnline, offline: assemblyOffline },
      turrets: { total: turretData.ids.length, online: turretOnline, offline: turretOffline },
      storageUnits: storageTotal,
      typeBreakdown: Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ typeId: id, label: TYPE_LABELS[id] ?? `Type ${id}`, count })),
      topDeployers: Object.entries(ownerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([addr, count]) => ({ address: addr, name: addrToName.get(addr) ?? null, count })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}
