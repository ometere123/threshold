import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/store/wallet";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Threshold - Funded Parametric Outage Cover",
  description:
    "Underwriters deposit real GEN into risk pools. Policyholders buy outage cover with real GEN premiums. GenLayer validators evaluate public evidence and pay claims from the funded pool.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Threshold - Funded Parametric Outage Cover",
    description:
      "Real GEN-funded parametric outage cover on GenLayer, with validator consensus claim resolution and on-chain payouts.",
    siteName: "Threshold",
    images: [{ url: "/logo.svg", width: 256, height: 256, alt: "Threshold logo" }],
  },
  twitter: {
    card: "summary",
    title: "Threshold - Funded Parametric Outage Cover",
    description:
      "Fund real GEN risk pools, buy outage cover, and resolve claims through GenLayer validator consensus.",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}