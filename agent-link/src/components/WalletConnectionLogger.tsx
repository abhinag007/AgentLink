"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function WalletConnectionLogger() {
  const { publicKey, wallet, connected } = useWallet();
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    // Only log when wallet is connected and we haven't logged this connection yet
    if (connected && publicKey && wallet && !hasLoggedRef.current) {
      hasLoggedRef.current = true;

      // Log wallet connection to Google Sheets
      const logWalletConnection = async () => {
        try {
          const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'wallet_connection',
              walletAddress: publicKey.toString(),
              walletName: wallet.adapter.name,
              walletIcon: wallet.adapter.icon,
            }),
          });

          if (!response.ok) {
            console.error('Failed to log wallet connection to Google Sheets');
          }
        } catch (error) {
          console.error('Error logging wallet connection:', error);
        }
      };

      logWalletConnection();
    }

    // Reset when wallet disconnects
    if (!connected) {
      hasLoggedRef.current = false;
    }
  }, [connected, publicKey, wallet]);

  return null; // This component doesn't render anything
}


