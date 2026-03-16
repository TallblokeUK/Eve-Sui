import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

const SUI_RPC_URL =
  process.env.NEXT_PUBLIC_SUI_RPC_URL ||
  "https://fullnode.testnet.sui.io:443";

const client = new SuiJsonRpcClient({
  url: SUI_RPC_URL,
  network: "testnet",
});

export default client;
