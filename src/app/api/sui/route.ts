import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/sui-client";

export const maxDuration = 30;

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
      case "network-stats": {
        const [checkpoint, totalTx, referenceGasPrice] = await Promise.all([
          client.getLatestCheckpointSequenceNumber(),
          client.getTotalTransactionBlocks(),
          client.getReferenceGasPrice(),
        ]);
        return jsonResponse({ checkpoint, totalTx, referenceGasPrice });
      }

      case "balance": {
        const owner = searchParams.get("address");
        if (!owner) {
          return jsonResponse(
            { error: "address parameter required" },
            400
          );
        }
        const balance = await client.getBalance({ owner });
        return jsonResponse(balance);
      }

      case "owned-objects": {
        const owner = searchParams.get("address");
        if (!owner) {
          return jsonResponse(
            { error: "address parameter required" },
            400
          );
        }
        const objects = await client.getOwnedObjects({
          owner,
          options: { showContent: true, showType: true },
          limit: 20,
        });
        return jsonResponse(objects);
      }

      case "recent-transactions": {
        const txns = await client.queryTransactionBlocks({
          limit: 10,
          order: "descending",
          options: {
            showInput: true,
            showEffects: true,
          },
        });
        return jsonResponse(txns);
      }

      default:
        return jsonResponse(
          { error: "Unknown action. Use: network-stats, balance, owned-objects, recent-transactions" },
          400
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}
