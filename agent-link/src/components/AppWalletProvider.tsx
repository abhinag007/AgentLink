"use client";

import { useMemo, ReactNode, useEffect } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
// Note: Phantom and Solflare register themselves as Standard Wallets via window.solana
// We don't need to manually import them - WalletProvider will auto-detect them
import { clusterApiUrl } from "@solana/web3.js";
import toast from "react-hot-toast";
import ConsoleErrorFilter from "./ConsoleErrorFilter";
import WalletConnectionLogger from "./WalletConnectionLogger";

export default function AppWalletProvider({ children }: { children: ReactNode }) {
  
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // Use a reliable RPC endpoint
  const endpoint = useMemo(() => {
    return clusterApiUrl(network);
  }, [network]);

  // Initialize wallets - Modern wallets (Phantom, Solflare) register themselves
  // as Standard Wallets via window.solana, so we don't need to manually add them.
  // The WalletProvider will automatically detect Standard Wallets.
  // Only add manual adapters for wallets that don't support Standard Wallet protocol.
  const wallets = useMemo(
    () => {
      try {
        // Return empty array - let WalletProvider auto-detect Standard Wallets
        // Phantom and Solflare will be automatically detected via window.solana
        return [];
      } catch (error) {
        console.error('Error initializing wallet adapters:', error);
        return [];
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <>
      <ConsoleErrorFilter />
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider 
          wallets={wallets} 
          autoConnect={false}
          onError={(error) => {
            // Suppress user rejection errors completely - they're expected behavior
            const errorMessage = error.message.toLowerCase();
            if (
              errorMessage.includes('user rejected') || 
              errorMessage.includes('user declined') ||
              errorMessage.includes('user canceled') ||
              errorMessage.includes('user cancelled')
            ) {
              // User intentionally rejected - don't show error
              return;
            }

            // Show errors using toast notifications instead of modal
            const errorName = error.name;

            // Wallet not installed
            if (errorName === 'WalletNotInstalledError' || errorMessage.includes('not installed')) {
              toast.error(
                <div>
                  <div className="font-semibold mb-1">Wallet Not Found</div>
                  <div className="text-sm">Please install Phantom wallet to continue.</div>
                  <a 
                    href="https://phantom.app/download" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#14F195] hover:underline text-sm mt-1 inline-block"
                  >
                    Download Phantom →
                  </a>
                </div>,
                { duration: 6000 }
              );
              return;
            }

            // Connection error
            if (errorName === 'WalletConnectionError' || errorMessage.includes('connection')) {
              toast.error('Unable to connect to wallet. Make sure it\'s unlocked and try again.', {
                duration: 5000,
              });
              return;
            }

            // Generic error
            toast.error(error.message || 'Wallet error occurred. Please try again.', {
              duration: 5000,
            });
            
            // Log for debugging
            console.error('Wallet Error:', error);
          }}
        >
          <WalletModalProvider>
            {children}
            <WalletConnectionLogger />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </>
  );
}

