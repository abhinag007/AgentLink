import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";
import AppWalletProvider from "@/components/AppWalletProvider";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentLink - The Trust Layer for the Agent Economy",
  description: "The Identity, Reputation, and Escrow protocol for the next generation of Autonomous AI. Stop your Agents from hallucinating transactions.",
  icons: {
    icon: '/shield.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b0c15] text-white`}
      >
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
        <Analytics />
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              fontSize: '14px',
            },
            success: {
              duration: 4000,
              iconTheme: {
                primary: '#14F195',
                secondary: '#0b0c15',
              },
              style: {
                background: '#0f172a',
                border: '1px solid #14F195',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              style: {
                background: '#0f172a',
                border: '1px solid #ef4444',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
