"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

const STUDIONET_CHAIN_ID = 61999;
const STUDIONET_CHAIN_ID_HEX = `0x${STUDIONET_CHAIN_ID.toString(16)}`;

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  provider: ethers.BrowserProvider | null;
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
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  const isConnected = !!address;
  const isCorrectNetwork = chainId === STUDIONET_CHAIN_ID;

  const getEthereum = () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    return null;
  };

  const updateFromProvider = useCallback(async (eth: any) => {
    try {
      const prov = new ethers.BrowserProvider(eth);
      const network = await prov.getNetwork();
      const accounts = await prov.listAccounts();
      setProvider(prov);
      setChainId(Number(network.chainId));
      if (accounts.length > 0) {
        setAddress(await accounts[0].getAddress());
      }
    } catch (e) {
      console.error("Error reading wallet state:", e);
    }
  }, []);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;

    // Check if already connected
    updateFromProvider(eth);

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setProvider(null);
      } else {
        setAddress(accounts[0]);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      setChainId(parseInt(chainIdHex, 16));
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
    } catch (e: any) {
      setError(e?.message || "Connection rejected");
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
    } catch (switchError: any) {
      // Chain not added — add it
      if (switchError.code === 4902) {
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
        } catch (addError: any) {
          setError(addError?.message || "Failed to add network");
        }
      } else {
        setError(switchError?.message || "Failed to switch network");
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
