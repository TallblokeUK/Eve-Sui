import NetworkStats from "@/components/NetworkStats";
import AddressLookup from "@/components/AddressLookup";
import EveStats from "@/components/EveStats";
import EveCharacters from "@/components/EveCharacters";
import EveActivity from "@/components/EveActivity";
import EveSmartStructures from "@/components/EveSmartStructures";
import EveKillmails from "@/components/EveKillmails";

export default function Home() {
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          EVE Frontier Explorer
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sui Testnet &middot; Live on-chain data from the Stillness universe
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Universe Overview
        </h2>
        <EveStats />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Live Activity
        </h2>
        <EveActivity />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Characters
        </h2>
        <EveCharacters />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Killmails
        </h2>
        <EveKillmails />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Smart Structures
        </h2>
        <EveSmartStructures />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Sui Network
        </h2>
        <NetworkStats />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Address Lookup
        </h2>
        <AddressLookup />
      </section>
    </div>
  );
}
