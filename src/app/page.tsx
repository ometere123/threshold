import Link from "next/link";
import { WalletBar } from "@/components/shared/WalletBar";

const WHY_ITEMS = [
  { icon: "🟢", title: "Uptime Has Real Cost", desc: "Status page and API outages cost hosted-service operators real money. No fast, automated payout exists today." },
  { icon: "📡", title: "Public Evidence Exists", desc: "Status pages, incident histories, and uptime reports are already public - GenLayer validators can read them directly." },
  { icon: "🏦", title: "Funded, Not Promised", desc: "Cover is only as real as the capital behind it. Threshold pools hold real GEN, deposited on-chain." },
  { icon: "⚖️", title: "No Adjuster Bias", desc: "Manual claim review is slow and subjective. GenLayer validator consensus removes the single decision-maker." },
];

const HOW_ITEMS = [
  { step: "01", title: "Underwriter Funds a Pool", desc: "An underwriter deposits real GEN into a risk pool via a payable transaction and sets the service, component, and rate terms." },
  { step: "02", title: "Policyholder Buys Cover", desc: "A policyholder chooses a coverage amount and duration. The premium is calculated deterministically and paid as real GEN." },
  { step: "03", title: "Contract Reserves Exposure", desc: "The coverage amount is reserved against the pool's available capital - it cannot be double-committed or withdrawn." },
  { step: "04", title: "Incident + Public Evidence", desc: "When an outage occurs, the policyholder submits a claim with a public evidence URL and incident summary." },
  { step: "05", title: "GenLayer Validator Consensus", desc: "Validators fetch public evidence, ignore unsupported claimant assertions, and reach consensus on a settlement verdict." },
  { step: "06", title: "Real GEN Payout or No Payout", desc: "If the claim qualifies, the contract sends real GEN to the policyholder from the funded pool. If not, no payout is made." },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#07111F" }}>
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: "#1F2937" }}>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Threshold" width={22} height={22} className="rounded" />
          <span className="font-display font-semibold text-sm tracking-widest text-white">THRESHOLD</span>
        </div>
        <WalletBar />
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border" style={{ borderColor: "#1F2937", background: "rgba(56,189,248,0.05)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse" />
            <span className="font-mono text-xs text-slate-400">GenLayer StudioNet · Chain ID 61999 · Real GEN</span>
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Funded parametric<br />
            <span style={{ color: "#38BDF8" }}>outage cover.</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Underwriters deposit real GEN into risk pools. Policyholders buy service outage cover by
            paying real GEN premiums. When an incident happens, GenLayer validators evaluate public
            evidence and the contract pays the policyholder from the funded pool - or it doesn&apos;t.
          </p>

          <Link href="/app" className="btn-primary text-base px-8 py-3 inline-block">
            Open Risk Desk →
          </Link>
        </div>
      </section>

      {/* Short explanation */}
      <section className="border-y py-6 px-8" style={{ borderColor: "#1F2937", background: "rgba(56,189,248,0.03)" }}>
        <p className="text-center font-mono text-sm text-slate-400 max-w-3xl mx-auto">
          No fake pool capital. No admin-entered balances. Every GEN figure you see is a live read
          from the deployed contract - deposits, premiums, reserved exposure, and payouts are all
          real StudioNet value transfers.
        </p>
      </section>

      {/* Why */}
      <section className="px-8 py-20 max-w-6xl mx-auto w-full">
        <div className="section-header mb-8">Why Funded Outage Cover</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {WHY_ITEMS.map((item) => (
            <div key={item.title} className="panel p-5">
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="font-display font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-8 py-20 max-w-6xl mx-auto w-full border-t" style={{ borderColor: "#1F2937" }}>
        <div className="section-header mb-8">How Threshold Works</div>
        <div className="space-y-0">
          {HOW_ITEMS.map((item) => (
            <div
              key={item.step}
              className="flex gap-6 py-5 border-b"
              style={{ borderColor: "#1F2937" }}
            >
              <span className="font-mono text-2xl font-bold shrink-0" style={{ color: "#1F2937" }}>
                {item.step}
              </span>
              <div>
                <h3 className="font-display font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Example cover */}
      <section className="px-8 py-20 max-w-6xl mx-auto w-full border-t" style={{ borderColor: "#1F2937" }}>
        <div className="section-header mb-6">Example Cover</div>
        <div className="panel-ice p-6 max-w-xl">
          <div className="space-y-3 font-mono text-sm">
            {[
              ["Service", "API Availability"],
              ["Covered Component", "API Gateway"],
              ["Coverage Amount", "100 GEN"],
              ["Premium Rate", "5% of coverage"],
              ["Duration", "7 days"],
              ["Qualifying Verdict", "major_outage → full payout"],
              ["Non-Qualifying Verdict", "scheduled_maintenance → no payout"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-200 text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GenLayer fit */}
      <section className="px-8 py-20 max-w-6xl mx-auto w-full border-t" style={{ borderColor: "#1F2937" }}>
        <div className="section-header mb-6">GenLayer Fit</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Real Value Transfer", desc: "Native GEN payable methods fund pools and pay claims" },
            { title: "Live Evidence", desc: "Validators fetch public status pages in real-time" },
            { title: "Validator Consensus", desc: "Equivalence Principle reaches agreement on the verdict" },
            { title: "No Adjuster", desc: "Settlement is contract-driven, not human-decided" },
          ].map((item) => (
            <div key={item.title} className="panel p-4">
              <div className="w-8 h-px mb-3" style={{ background: "#38BDF8" }} />
              <h4 className="font-display font-semibold text-white text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 text-center border-t" style={{ borderColor: "#1F2937" }}>
        <h2 className="font-display text-3xl font-bold text-white mb-4">
          Ready to fund a risk pool?
        </h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Deposit real GEN. Underwrite outage cover. Let GenLayer validators resolve money-moving claims against public evidence.
        </p>
        <Link href="/app" className="btn-primary text-base px-8 py-3 inline-block">
          Open Risk Desk →
        </Link>
      </section>

      <footer className="border-t px-8 py-4 flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
        <span className="font-mono text-xs text-slate-600">Threshold Protocol · GenLayer StudioNet</span>
        <a
          href="https://explorer-studio.genlayer.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-slate-600 hover:text-cyan-400 transition-colors"
        >
          Explorer ↗
        </a>
      </footer>
    </div>
  );
}
