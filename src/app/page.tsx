import NetworkStats from "@/components/NetworkStats";
import AddressLookup from "@/components/AddressLookup";
import RecentTransactions from "@/components/RecentTransactions";

export default function Home() {
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Sui Explorer
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Testnet chain reader &middot; EVE Frontier
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Network
        </h2>
        <NetworkStats />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Address Lookup
        </h2>
        <AddressLookup />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Recent Transactions
        </h2>
        <RecentTransactions />
      </section>
    </div>
  );
}
