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

interface KillParsed {
  killer_id: { item_id: string };
  victim_id: { item_id: string };
  solar_system_id: { item_id: string };
  loss_type: { variant: string };
  kill_timestamp: string;
}

export async function GET() {
  try {
    // Gather all killmails
    const kills: KillParsed[] = [];
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
        kills.push(e.parsedJson as KillParsed);
      }
      cursor = r.nextCursor;
      hasNext = r.hasNextPage;
    }

    // Gather character timestamps for growth chart
    const charTimestamps: number[] = [];
    let charCursor = null;
    let charNext = true;
    while (charNext) {
      const r = await client.queryEvents({
        query: { MoveEventType: EVE_EVENTS.CharacterCreated },
        limit: 50,
        order: "ascending",
        ...(charCursor ? { cursor: charCursor } : {}),
      });
      for (const e of r.data) {
        charTimestamps.push(Number(e.timestampMs));
      }
      charCursor = r.nextCursor;
      charNext = r.hasNextPage;
    }

    // Build kill analytics
    const killerCounts: Record<string, number> = {};
    const victimCounts: Record<string, number> = {};
    const systemCounts: Record<string, number> = {};
    const lossTypes: Record<string, number> = {};
    const killsByHour: number[] = new Array(24).fill(0);
    const killsByDay: Record<string, number> = {};

    for (const k of kills) {
      const killer = k.killer_id?.item_id;
      const victim = k.victim_id?.item_id;
      const system = k.solar_system_id?.item_id;
      const loss = k.loss_type?.variant;

      if (killer) killerCounts[killer] = (killerCounts[killer] || 0) + 1;
      if (victim) victimCounts[victim] = (victimCounts[victim] || 0) + 1;
      if (system) systemCounts[system] = (systemCounts[system] || 0) + 1;
      if (loss) lossTypes[loss] = (lossTypes[loss] || 0) + 1;

      const ts = Number(k.kill_timestamp) * 1000;
      const d = new Date(ts);
      killsByHour[d.getUTCHours()]++;
      const dayKey = d.toISOString().slice(0, 10);
      killsByDay[dayKey] = (killsByDay[dayKey] || 0) + 1;
    }

    // Resolve names for top killers/victims
    const charIndex = await getCharacterIndex().catch(() => []);
    const nameMap = new Map(charIndex.map((c) => [c.itemId, c.name]));

    function topN(counts: Record<string, number>, n: number) {
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([id, count]) => ({
          itemId: id,
          name: nameMap.get(id) ?? `#${id}`,
          count,
        }));
    }

    // Character growth: group by day
    const growthByDay: Record<string, number> = {};
    for (const ts of charTimestamps) {
      const day = new Date(ts).toISOString().slice(0, 10);
      growthByDay[day] = (growthByDay[day] || 0) + 1;
    }

    // Cumulative growth
    const growthTimeline = Object.entries(growthByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce<{ date: string; newChars: number; total: number }[]>((acc, [date, count]) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].total : 0;
        acc.push({ date, newChars: count, total: prev + count });
        return acc;
      }, []);

    return jsonResponse({
      totalKills: kills.length,
      totalCharacters: charTimestamps.length,
      lossTypes,
      topKillers: topN(killerCounts, 10),
      topVictims: topN(victimCounts, 10),
      dangerousSystems: Object.entries(systemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ systemId: id, kills: count })),
      killsByHour,
      killsByDay: Object.entries(killsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      characterGrowth: growthTimeline,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}
