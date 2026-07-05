"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletBar } from "./WalletBar";

const NAV = [
  { href: "/app", label: "Risk Desk", exact: true },
  { href: "/app/pools", label: "Pools" },
  { href: "/app/policies", label: "My Policies" },
  { href: "/app/claims", label: "Claims" },
  { href: "/app/verdicts", label: "Verdicts" },
  { href: "/app/accounting", label: "Solvency" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#07111F" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: "#07111F", borderColor: "#1F2937" }}
      >
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Threshold" width={20} height={20} className="rounded" />
            <span className="font-display font-semibold text-sm tracking-wide text-white">
              THRESHOLD
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-sm rounded transition-colors font-medium ${
                  isActive(item.href, item.exact)
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <WalletBar />
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Footer */}
      <footer
        className="border-t px-6 py-3 flex items-center justify-between"
        style={{ borderColor: "#1F2937" }}
      >
        <span className="font-mono text-xs text-slate-600">
          Threshold Protocol · GenLayer StudioNet · Chain 61999
        </span>
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
