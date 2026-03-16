import NetworkStats from "@/components/NetworkStats";
import AddressLookup from "@/components/AddressLookup";
import EveStats from "@/components/EveStats";
import EveCharacters from "@/components/EveCharacters";
import EveActivity from "@/components/EveActivity";
import EveSmartStructures from "@/components/EveSmartStructures";
import EveKillmails from "@/components/EveKillmails";
import IntelDashboard from "@/components/IntelDashboard";

export default function Home() {
  return (
    <div className="relative mx-auto min-h-screen max-w-6xl px-6 py-16">
      {/* Header */}
      <header className="mb-16 animate-in">
        <div className="flex items-end gap-4">
          <div>
            <p className="section-label mb-2">Sui Testnet // Stillness</p>
            <h1 className="text-5xl font-bold tracking-tight text-white">
              EVE Frontier
              <span className="ml-3 text-accent">Explorer</span>
            </h1>
            <p className="mt-2 text-sm text-foreground/25">
              On-chain intelligence from the Stillness universe
            </p>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <span className="pulse h-1.5 w-1.5 rounded-full bg-online" />
            <span className="text-xs text-online/70">LIVE</span>
          </div>
        </div>
        <div className="glow-line mt-6" />
      </header>

      {/* Universe counts */}
      <section className="mb-14 animate-in" style={{ animationDelay: "0.05s" }}>
        <p className="section-label mb-4">Universe Overview</p>
        <EveStats />
      </section>

      {/* Intel Dashboard — the main attraction */}
      <section className="mb-14 animate-in" style={{ animationDelay: "0.1s" }}>
        <p className="section-label mb-4">Intelligence Report</p>
        <IntelDashboard />
      </section>

      <div className="glow-line mb-14" />

      {/* Activity + Killmails side by side */}
      <div className="mb-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="animate-in" style={{ animationDelay: "0.15s" }}>
          <p className="section-label mb-4">Live Activity</p>
          <EveActivity />
        </section>

        <section className="animate-in" style={{ animationDelay: "0.2s" }}>
          <p className="section-label mb-4">Kill Feed</p>
          <EveKillmails />
        </section>
      </div>

      {/* Characters */}
      <section className="mb-14 animate-in" style={{ animationDelay: "0.25s" }}>
        <p className="section-label mb-4">Characters</p>
        <EveCharacters />
      </section>

      {/* Smart Structures */}
      <section className="mb-14 animate-in" style={{ animationDelay: "0.3s" }}>
        <p className="section-label mb-4">Smart Structures</p>
        <EveSmartStructures />
      </section>

      {/* Network + Lookup */}
      <div className="mb-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="animate-in" style={{ animationDelay: "0.35s" }}>
          <p className="section-label mb-4">Sui Network</p>
          <NetworkStats />
        </section>

        <section className="animate-in" style={{ animationDelay: "0.4s" }}>
          <p className="section-label mb-4">Address Lookup</p>
          <AddressLookup />
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-xs text-foreground/20">
          EVE Frontier Explorer &middot; All data read live from Sui testnet
        </p>
      </footer>
    </div>
  );
}
