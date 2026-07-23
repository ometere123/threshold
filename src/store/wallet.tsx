"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const STUDIONET_CHAIN_ID = 61999;
const STUDIONET_CHAIN_ID_HEX = `0x${STUDIONET_CHAIN_ID.toString(16)}`;

export interface InjectedWalletProvider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
}

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  provider: InjectedWalletProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  isCorrectNetwork: false,
  error: null,
  provider: null,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<InjectedWalletProvider | null>(null);

  const isConnected = !!address;
  const isCorrectNetwork = chainId === STUDIONET_CHAIN_ID;

  const getEthereum = (): InjectedWalletProvider | null => {
    if (typeof window !== "undefined") {
      const maybeEthereum = (window as Window & { ethereum?: InjectedWalletProvider }).ethereum;
      return maybeEthereum || null;
    }
    return null;
  };

  const updateFromProvider = useCallback(async (eth: InjectedWalletProvider) => {
    try {
      const [chainIdHex, accounts] = await Promise.all([
        eth.request({ method: "eth_chainId" }),
        eth.request({ method: "eth_accounts" }),
      ]);

      setProvider(eth);
      setChainId(parseInt(String(chainIdHex), 16));
      setAddress(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null);
    } catch (e) {
      console.error("Error reading wallet state:", e);
    }
  }, []);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;

    // Check if already connected
    updateFromProvider(eth);

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = Array.isArray(args[0]) ? args[0] : [];
      if (accounts.length === 0) {
        setAddress(null);
        setProvider(null);
      } else {
        setAddress(typeof accounts[0] === "string" ? accounts[0] : null);
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      setChainId(parseInt(String(args[0]), 16));
    };

    const handleDisconnect = () => {
      setAddress(null);
      setProvider(null);
      setChainId(null);
    };

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);
    eth.on("disconnect", handleDisconnect);

    return () => {
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
      eth.removeListener("disconnect", handleDisconnect);
    };
  }, [updateFromProvider]);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      setError("No injected wallet found. Install MetaMask or Rabby.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await eth.request({ method: "eth_requestAccounts" });
      await updateFromProvider(eth);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection rejected");
    } finally {
      setIsConnecting(false);
    }
  }, [updateFromProvider]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setChainId(null);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
      });
    } catch (switchError: unknown) {
      // Chain not added - add it
      const errorWithCode = switchError as { code?: number; message?: string };
      if (errorWithCode.code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: STUDIONET_CHAIN_ID_HEX,
                chainName: "GenLayer StudioNet",
                nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
                rpcUrls: ["https://studio.genlayer.com/api"],
                blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
              },
            ],
          });
        } catch (addError: unknown) {
          setError(addError instanceof Error ? addError.message : "Failed to add network");
        }
      } else {
        setError(errorWithCode.message || "Failed to switch network");
      }
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        isConnecting,
        isCorrectNetwork,
        error,
        provider,
        connect,
        disconnect,
        switchNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
