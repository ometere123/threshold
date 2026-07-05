import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/store/wallet";

export const metadata: Metadata = {
  title: "Threshold — Parametric Cold-Chain Cover",
  description:
    "Parametric cover for cold-chain medical shipments. Define the threshold. Submit route evidence. Let GenLayer validators resolve the claim.",
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
