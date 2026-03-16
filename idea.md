# CLAUDE.md — Sui Blockchain Explorer (Learning Project)

## Project Overview

A Next.js app that connects to the Sui blockchain, reads on-chain data, and displays it. This is a learning/exploration project to understand how Sui works, with an eye toward building EVE Frontier external tools and demonstrating blockchain + AI capabilities.

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Blockchain SDK**: `@mysten/sui` (Sui TypeScript SDK)
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm (required by Sui ecosystem)
- **Runtime**: Node.js 18+
- **Dev Environment**: Fedora Linux, VS Code + Claude Code

## Key Dependencies

```json
{
  "@mysten/sui": "latest",
  "@mysten/dapp-kit-react": "latest",
  "@tanstack/react-query": "^5",
  "next": "^14",
  "react": "^18",
  "tailwindcss": "^3"
}
```

## Sui Network Endpoints

```typescript
// Recommended: gRPC client (new, faster)
import { SuiGrpcClient } from '@mysten/sui/grpc';

// Networks available:
// Mainnet: https://fullnode.mainnet.sui.io:443
// Testnet: https://fullnode.testnet.sui.io:443
// Devnet:  https://fullnode.devnet.sui.io:443

// For this project, use TESTNET (EVE Frontier runs on Sui Testnet)
const client = new SuiGrpcClient({
  network: 'testnet',
  baseUrl: 'https://fullnode.testnet.sui.io:443',
});
```

**IMPORTANT**: Public endpoints are rate-limited to ~100 requests per 30 seconds. Fine for learning, not for production.

## Core Sui Concepts to Understand

### Object-Centric Model
- Sui stores everything as **objects**, not account balances
- Every object has a unique ID, a version, and an owner
- Objects can be: owned (by an address), shared (anyone can use), or immutable
- This is fundamentally different from Ethereum's account model

### Transactions
- Sui uses **Programmable Transaction Blocks (PTBs)** — a single transaction can contain multiple operations
- Transactions are paid for in SUI (native token), denominated in MIST (1 SUI = 1,000,000,000 MIST)
- **Sponsored Transactions**: A third party (e.g. CCP Games) can pay gas fees on behalf of users

### Move Language
- Smart contracts on Sui are written in **Move** (Rust-based)
- NOT Solidity — Sui is not EVM-compatible
- For external tools/apps, you don't need Move — the TypeScript SDK reads chain state directly

### Reading vs Writing
- **Reading** chain state (objects, balances, events, transactions) = free, no wallet needed
- **Writing** (submitting transactions) = requires a keypair and gas fees
- For this learning project, we start with reading only

## Common SDK Operations

### Get Objects Owned by an Address
```typescript
const objects = await client.getOwnedObjects({
  owner: '0x<address>',
  options: { showContent: true, showType: true },
});
```

### Get a Specific Object
```typescript
const object = await client.getObject({
  id: '0x<object_id>',
  options: { showContent: true, showOwner: true },
});
```

### Get Account Balance
```typescript
const balance = await client.getBalance({
  owner: '0x<address>',
});
// balance.totalBalance is in MIST (divide by 1e9 for SUI)
```

### Get Recent Transactions
```typescript
const txns = await client.queryTransactionBlocks({
  limit: 10,
  order: 'descending',
});
```

### Query Events
```typescript
const events = await client.queryEvents({
  query: { Sender: '0x<address>' },
  limit: 50,
  order: 'descending',
});
```

### Get Latest Checkpoint
```typescript
const checkpoint = await client.getLatestCheckpointSequenceNumber();
```

## Project Structure

```
sui-explorer/
├── CLAUDE.md              # This file
├── .env.local             # Environment variables
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx       # Main dashboard
│   │   └── api/           # API routes for server-side Sui queries
│   │       └── sui/
│   │           └── route.ts
│   ├── components/
│   │   ├── ObjectViewer.tsx
│   │   ├── TransactionList.tsx
│   │   ├── AddressLookup.tsx
│   │   └── NetworkStats.tsx
│   └── lib/
│       ├── sui-client.ts  # Sui client singleton
│       └── utils.ts       # Formatting helpers (MIST→SUI, truncate addresses etc.)
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
```

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm lint             # Lint check
```

## Implementation Phases

### Phase 1: Basic Chain Reader (Start Here)
- [ ] Scaffold Next.js project with pnpm
- [ ] Install `@mysten/sui` SDK
- [ ] Create a Sui client utility (`src/lib/sui-client.ts`)
- [ ] Build a simple page that displays latest checkpoint number
- [ ] Add address lookup — input a Sui address, show its SUI balance
- [ ] Display owned objects for an address

### Phase 2: Transaction Explorer
- [ ] Query and display recent transactions
- [ ] Show transaction details (sender, gas used, effects)
- [ ] Add event filtering/querying
- [ ] Real-time polling for new transactions

### Phase 3: EVE Frontier Integration
- [ ] Research EVE Frontier's Sui testnet contract addresses / package IDs
- [ ] Query EVE Frontier-specific objects (Smart Assemblies, items, etc.)
- [ ] Display game state data in a meaningful UI
- [ ] Build a simple dashboard showing Frontier universe activity

### Phase 4: AI Layer (Portfolio Piece)
- [ ] Add Anthropic API integration for chain data analysis
- [ ] "Ask AI about this transaction" feature
- [ ] Pattern detection in transaction flows
- [ ] Natural language querying of on-chain data

## EVE Frontier Context

### Current State (March 2026)
- EVE Frontier migrated from Ethereum (EVM/Solidity/MUD) to **Sui** on March 11, 2026 (Cycle 5)
- Old documentation referencing Solidity/MUD/Redstone/Garnet is **OBSOLETE**
- Smart Assemblies are now written in **Move**, not Solidity
- The hackathon (March 11-31, 2026) is the first public builder event on Sui
- Builder docs: https://docs.evefrontier.com/
- Builder examples repo: https://github.com/projectawakening/builder-examples

### Two Builder Tracks
1. **Smart Assemblies (in-game)**: Requires Move language, deployed on-chain, controls turrets/gates/storage in-game
2. **External Applications (out-of-game)**: Uses Sui TypeScript SDK to read/write chain data, build dashboards/tools/analytics — **this is our lane**

### Key Features for External Builders
- All game state is on a public ledger — readable by anyone
- Smart Assembly state changes emit events that external apps can subscribe to
- Player inventory, ownership, locations are queryable
- The game client renders custom HTML5 UIs for Smart Assemblies

## Useful Links

- **Sui TypeScript SDK Docs**: https://sdk.mystenlabs.com/typescript
- **Sui Developer Docs**: https://docs.sui.io/
- **Sui Explorer (Testnet)**: https://testnet.suivision.xyz/
- **EVE Frontier Builder Docs**: https://docs.evefrontier.com/
- **EVE Frontier Whitepaper**: https://whitepaper.evefrontier.com/
- **Builder Examples (GitHub)**: https://github.com/projectawakening/builder-examples
- **Sui dApp Kit (React)**: https://sdk.mystenlabs.com/dapp-kit

## Coding Conventions

- Use TypeScript strict mode throughout
- Server-side Sui queries via Next.js API routes (avoid exposing RPC calls client-side where possible)
- Use `SuiGrpcClient` (not the deprecated `JsonRpcProvider` or `SuiClient`)
- Handle all SDK calls with try/catch — chain queries can fail or timeout
- Format MIST values to SUI for display (divide by 1_000_000_000)
- Truncate long addresses/object IDs in UI (show first 6 + last 4 chars)
- Use server components by default, client components only when interactivity is needed

## Notes

- This project is for learning and portfolio demonstration
- No real funds or mainnet transactions — testnet only
- The Sui ecosystem moves fast — SDK APIs may change, always check latest docs
- EVE Frontier is in active development with 3-month cycles that wipe progress
- The migration to Sui is brand new (days old) so documentation may be patchy or in flux
