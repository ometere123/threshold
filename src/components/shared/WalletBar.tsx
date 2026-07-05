"use client";

import { useWallet } from "@/store/wallet";
import { shortenAddress } from "@/lib/utils";

export function WalletBar() {
  const { address, isConnected, isConnecting, isCorrectNetwork, error, connect, disconnect, switchNetwork } =
    useWallet();

  return (
    <div className="flex items-center gap-3">
      {!isConnected ? (
        <button
          className="btn-primary text-xs py-1.5 px-4"
          onClick={connect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {!isCorrectNetwork && (
            <button
              className="btn-danger text-xs py-1 px-3"
              onClick={switchNetwork}
            >
              Wrong Network
            </button>
          )}
          {isCorrectNetwork && (
            <span className="chip chip-active text-xs">StudioNet</span>
          )}
          <div
            className="panel px-3 py-1.5 flex items-center gap-2 cursor-pointer"
            onClick={disconnect}
            title="Click to disconnect"
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: isCorrectNetwork ? "#16A34A" : "#F59E0B" }}
            />
            <span className="font-mono text-xs text-slate-300">
              {shortenAddress(address!)}
            </span>
          </div>
        </div>
      )}

      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
