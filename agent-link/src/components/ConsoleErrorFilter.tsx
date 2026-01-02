"use client";

import { useEffect } from "react";

/**
 * Suppresses expected wallet errors from cluttering the console.
 * These errors are normal when wallets aren't installed or ready.
 * Only suppresses in production - shows all errors in development.
 */
export default function ConsoleErrorFilter() {
  useEffect(() => {
    // Only filter in production - show all errors in development for debugging
    if (process.env.NODE_ENV === 'production') {
      const originalError = console.error;
      const originalWarn = console.warn;

      const suppressedErrors = [
        "WalletNotInstalledError", // Only suppress this one - others might be important
      ];

      console.error = (...args: unknown[]) => {
        const errorMessage = args[0]?.toString() || "";
        const shouldSuppress = suppressedErrors.some((errorName) =>
          errorMessage.includes(errorName)
        );

        if (!shouldSuppress) {
          originalError.apply(console, args);
        }
      };

      console.warn = (...args: unknown[]) => {
        const warningMessage = args[0]?.toString() || "";
        const shouldSuppress = suppressedErrors.some((errorName) =>
          warningMessage.includes(errorName)
        );

        if (!shouldSuppress) {
          originalWarn.apply(console, args);
        }
      };

      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  return null;
}

