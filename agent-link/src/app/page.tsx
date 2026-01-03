"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, UserX, AlertTriangle, BarChart, ArrowRight, FileText, CheckCircle, Loader2, Github } from "lucide-react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import EmailForm from "@/components/EmailForm";
import Terminal from "@/components/Terminal";
import WebhookInstruction from "@/components/WebhookInstruction";

// --- WEB3 IMPORTS ---
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "./utils/idl.json"; // Make sure this file exists!

// --- CONFIGURATION ---
// ⚠️ REPLACE THIS WITH YOUR REAL PROGRAM ID FROM TERMINAL
const PROGRAM_ID = new PublicKey("1upL7DFZsCER26XZj2BxRFG9bwESf5JWS5w9dC9vFk"); 

// Dynamically import WalletMultiButton
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  // --- WEB3 STATE ---
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [isMinting, setIsMinting] = useState(false);
  const [txSignature, setTxSignature] = useState("");
  
  // --- AGENT INPUT STATE ---
  const [agentName, setAgentName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  
  // --- AGENTS LIST STATE ---
  const [agents, setAgents] = useState<any[]>([]);
  
  // --- USER'S AGENT STATE ---
  const [userAgent, setUserAgent] = useState<any | null>(null);
  
  // --- REPUTATION TRACKING FOR CONFETTI ---
  const previousReputations = useRef<Map<string, number>>(new Map());

 // --- FETCH AGENTS FUNCTION ---
 const fetchAgents = async () => {
  try {
    // Setup provider and program
    const provider = new AnchorProvider(connection, wallet || {} as any, {
      commitment: 'confirmed', // Use 'confirmed' for faster responses
    });
    const programIdl = { ...idl, address: PROGRAM_ID.toBase58() } as Idl;
    const program = new Program(programIdl, provider);

    // Fetch all agent accounts
    // @ts-ignore - TypeScript doesn't recognize the account name from IDL
    const allAgents = await program.account.agentAccount.all();
    console.log("Fetched agents:", allAgents);
    
    // Update agents list
    setAgents(allAgents);
    
    // Find the current user's agent if wallet is connected
    if (wallet?.publicKey) {
      const myAgent = allAgents.find(
        (agent: any) => agent.account.owner.toString() === wallet.publicKey.toString()
      );
      console.log("User agent:", myAgent ? "Found" : "Not found");
      setUserAgent(myAgent || null);
    } else {
      setUserAgent(null);
    }
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    // Don't clear state on error to prevent flickering
  }
};

 // --- FETCH ON MOUNT AND WALLET CHANGE ---
useEffect(() => {
  // Immediately fetch when component mounts
  fetchAgents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  // Immediately fetch when wallet connects or changes
  if (wallet?.publicKey) {
    fetchAgents();
  } else {
    // Clear user agent when wallet disconnects
    setUserAgent(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [wallet?.publicKey]);

useEffect(() => {
  // Only poll if wallet is connected
  if (!wallet?.publicKey) return;
  
  // Poll every 5 seconds for balance between performance and responsiveness
  const interval = setInterval(() => {
    fetchAgents();
  }, 5000);

  return () => clearInterval(interval);
}, [connection, wallet]); // Re-start if connection changes

// --- REPUTATION CHANGE DETECTION & CONFETTI ---
useEffect(() => {
  if (!wallet?.publicKey) return; // Don't run if wallet not connected

  agents.forEach((agent) => {
    const agentKey = agent.publicKey.toBase58();
    const currentReputation = agent.account.reputationScore?.toNumber?.() || 
                             parseInt(agent.account.reputationScore?.toString() || "0");
    
    const previousReputation = previousReputations.current.get(agentKey);
    
    // Check if this specific agent belongs to the connected user
    const isMyAgent = agent.account.owner.toString() === wallet.publicKey.toString();

    // Only trigger confetti if:
    // 1. We have a previous value (not first render)
    // 2. The new reputation is higher than the previous
    // 3. AND it is the CURRENT USER'S agent (The Fix)
    if (previousReputation !== undefined && currentReputation > previousReputation) {
      
      // 🎯 THE FIX IS HERE: Only trigger if isMyAgent is true
      if (isMyAgent) {
        confetti({
          particleCount: 100, // Increased count for the owner
          spread: 70,
          startVelocity: 30,
          origin: { y: 0.6 }
        });
        
        // Optional: Add a specific toast for the user
        toast.success(`Reputation Upgraded to ${currentReputation}! 🚀`);
      }
    }
    
    // Update the stored reputation value (We still track everyone so the chart updates correctly)
    previousReputations.current.set(agentKey, currentReputation);
  });
}, [agents, wallet?.publicKey]); // Added wallet.publicKey to dependencies


 // --- MINT FUNCTION ---
 const mintAgent = async () => {
  if (!wallet) return;

  // Validate inputs
  if (!agentName || !githubUsername) {
    toast.error("Please fill in both Agent Name and GitHub Username before minting.", {
      icon: "⚠️",
    });
    return;
  }

  try {
    setIsMinting(true);
    setTxSignature(""); // Reset previous

    // Show loading toast
    const loadingToast = toast.loading("Minting Agent Identity on Solana...");

    // 1. Setup the Provider
    const provider = new AnchorProvider(connection, wallet, {});
    
    // 2. Setup the Program 
    // FIX: In Anchor v0.30, we must inject the address into the IDL object
    // We do not pass PROGRAM_ID as a 3rd argument anymore.
    const programIdl = { ...idl, address: PROGRAM_ID.toBase58() } as Idl;
    const program = new Program(programIdl, provider);

    // 3. Derive the PDA
    const [agentPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    );

    console.log("Minting Agent Identity to PDA:", agentPda.toBase58());

    // 4. Send the Transaction with user-provided data (using githubUsername as the github field)
    const tx = await program.methods
      .registerAgent(agentName, githubUsername)
      .accounts({
        user: wallet.publicKey,
        // systemProgram is inferred automatically
      })
      .rpc();

    console.log("Transaction Success:", tx);
    setTxSignature(tx); 

    // Dismiss loading and show success
    toast.dismiss(loadingToast);
    toast.success(`🎉 Agent "${agentName}" successfully registered on-chain!`, {
      duration: 5000,
    });

    // 5. Register with Oracle
    try {
      const oracleResponse = await fetch("https://agent-link-oracle.onrender.com/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          github_username: githubUsername,
          wallet_address: wallet.publicKey.toString(),
        }),
      });

      if (oracleResponse.ok) {
        console.log("Successfully registered with Oracle");
        toast.success("Oracle registration complete! 🎯", {
          duration: 3000,
        });
      } else {
        console.error("Oracle registration failed:", await oracleResponse.text());
        toast.error("Warning: Oracle registration failed. Please contact support.", {
          duration: 5000,
        });
      }
    } catch (oracleError) {
      console.error("Oracle API error:", oracleError);
      toast.error("Warning: Could not connect to Oracle. Your agent is registered on-chain.", {
        duration: 5000,
      });
    }

    // 6. Auto-refresh the agents list immediately
    await fetchAgents();
    
    // Force another quick refresh to ensure UI updates
    setTimeout(() => {
      fetchAgents();
    }, 1000);

    // Clear input fields
    setAgentName("");
    setGithubUsername("");

  } catch (error: any) {
    // Handle user cancellation and wallet disconnection errors gracefully
    const isUserCancelled = 
      error?.name === "WalletDisconnectedError" ||
      error?.message?.includes("User rejected") ||
      error?.message?.includes("User declined") ||
      error?.message?.toLowerCase().includes("user rejected") ||
      error?.message?.toLowerCase().includes("user declined");
    
    if (isUserCancelled) {
      // User cancelled - just log a warning and return early, no alert/toast
      console.warn("Transaction cancelled by user:", error);
      return;
    }
    
    // For all other errors, log the full error and show alert/toast
    console.error("Minting failed:", error);
    
    // Parse error message
    let errorMessage = "Minting failed! Please try again.";
    let errorTitle = "Error";
    
    if (error?.message) {
      const message = error.message.toLowerCase();
      
      // Insufficient funds
      if (message.includes("insufficient funds")) {
        errorMessage = "Insufficient SOL balance. You need at least 0.1 SOL for registration.";
      } 
      // Account already exists - most common error
      else if (message.includes("already in use") || message.includes("simulation failed")) {
        // Check logs for more details
        const logs = error?.logs || [];
        const hasAccountInUse = logs.some((log: string) => 
          log.includes("already in use") || log.includes("Allocate: account")
        );
        
        if (hasAccountInUse) {
          errorTitle = "Agent Already Registered";
          errorMessage = "This wallet has already registered an agent. Each wallet can only register one agent.";
        } else {
          errorMessage = "Transaction simulation failed. Please check your inputs and try again.";
        }
      }
      // Network or RPC errors
      else if (message.includes("failed to send") || message.includes("network")) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      // Generic error with message
      else if (error.message.length < 150) {
        errorMessage = error.message;
      }
    }
    
    // Show error with title if it's the duplicate agent error
    if (errorTitle === "Agent Already Registered") {
      toast.error(
        <div>
          <div className="font-semibold mb-1">{errorTitle}</div>
          <div className="text-sm">{errorMessage}</div>
        </div>,
        { duration: 7000 }
      );
    } else {
      toast.error(errorMessage, {
        duration: 6000,
      });
    }
  } finally {
    setIsMinting(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-950 text-white relative">
      {/* Background gradients - Optimized for scroll performance */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ willChange: 'auto', transform: 'translateZ(0)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" style={{ transform: 'translateZ(0)', willChange: 'auto' }}></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" style={{ transform: 'translateZ(0)', willChange: 'auto' }}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" style={{ transform: 'translateZ(0)', willChange: 'auto' }}></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/50 bg-gray-950/95" style={{ transform: 'translateZ(0)', willChange: 'auto' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-400" />
              <span className="text-xl font-semibold font-mono">AgentLink</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#registry" className="text-gray-400 hover:text-green-400 transition-colors text-sm font-mono">Registry</a>
              <a href="#problem" className="text-gray-400 hover:text-green-400 transition-colors text-sm font-mono">Protocol</a>
              <a href="#waitlist" className="text-gray-400 hover:text-green-400 transition-colors text-sm font-mono">Docs</a>
            </div>
            <div className="wallet-adapter-button-trigger flex items-center h-full">
              <WalletMultiButton 
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgb(75 85 99)',
                  borderRadius: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  height: '36px',
                  lineHeight: '1.9',
                }}
                className="!bg-transparent hover:!border-green-500 !transition-all"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Dynamic based on wallet state */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative z-10" style={{ transform: 'translateZ(0)' }}>
        <div className="max-w-7xl mx-auto">
          {/* STATE A: Wallet Not Connected */}
          {!wallet && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 mb-8">
                    <span className="text-xs font-medium text-green-400 font-mono">🚀 Live on Solana Devnet • Powering the Agent Economy</span>
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-green-400 to-purple-400 bg-clip-text text-transparent leading-tight"
                >
                  Identity & Reputation for the Autonomous Age.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-xl sm:text-2xl text-gray-400 mb-12 leading-relaxed"
                >
                  The first on-chain registry for AI Agents. Verify code hash, build reputation, and enable trustless settlement in USDC/SOL.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <WalletMultiButton 
                    style={{
                      backgroundColor: '#9333ea',
                      borderRadius: '0.5rem',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      fontSize: '1rem',
                      padding: '1rem 2rem',
                      height: 'auto',
                    }}
                    className="!bg-purple-600 hover:!bg-purple-700 !transition-all"
                  />
                </motion.div>

                {/* Stats Row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-gray-800"
                >
                  <div>
                    <div className="text-2xl font-bold text-green-400 font-mono mb-1">{agents.length}</div>
                    <div className="text-sm text-gray-500">Active Agents</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400 font-mono mb-1">24/7</div>
                    <div className="text-sm text-gray-500">Oracle Uptime</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400 font-mono mb-1">Devnet</div>
                    <div className="text-sm text-gray-500">Network</div>
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Terminal */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Terminal />
              </motion.div>
            </div>
          )}

          {/* STATE B: Connected but NO Agent (Onboarding Form) */}
          {wallet && !userAgent && (
            <div className="max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 mb-6">
                  <span className="text-xs font-medium text-green-400 font-mono">✓ Wallet Connected</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-3">Initialize Agent Identity</h2>
                <p className="text-gray-400">Register your AI agent on the Solana blockchain</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-gray-900/80 border border-gray-800 rounded-xl p-8"
              >
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TravelBot, CodeAssistant"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-green-500 hover:border-gray-600 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                      GitHub Username
                      <span className="ml-2 text-xs text-yellow-400 normal-case">⚡ Required for Oracle</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. octocat"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 hover:border-gray-600 transition-colors font-mono"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      This links your agent to GitHub events for automatic reputation tracking.
                    </p>
                  </div>

                  <button
                    onClick={mintAgent}
                    disabled={isMinting || !agentName || !githubUsername}
                    className="w-full px-6 py-4 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 font-mono uppercase tracking-wider"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Minting Identity...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Mint Identity
                      </>
                    )}
                  </button>

                  {txSignature && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm"
                    >
                      <div className="flex items-center gap-2 font-bold mb-2">
                        <CheckCircle className="w-4 h-4" /> Transaction Confirmed
                      </div>
                      <a 
                        href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-white font-mono text-xs break-all"
                      >
                        {txSignature}
                      </a>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* STATE C: Connected AND Has Agent (Command Center Dashboard) */}
          {wallet && userAgent && (
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 mb-4">
                  <span className="text-xs font-medium text-green-400 font-mono">⚡ Command Center</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">Agent Dashboard</h2>
              </motion.div>

              {/* Top Row - Agent Info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
              >
                {/* Agent Name Card */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Agent Name</div>
                  <div className="text-2xl font-bold text-white font-mono">{userAgent.account.name}</div>
                </div>

                {/* Agent ID Card */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Agent ID</div>
                  <div className="text-lg font-mono text-purple-400">
                    {userAgent.publicKey.toBase58().slice(0, 8)}...{userAgent.publicKey.toBase58().slice(-6)}
                  </div>
                </div>

                {/* Reputation Score Card */}
                <div className="bg-gradient-to-br from-green-500/10 to-purple-500/10 border border-green-500/30 rounded-xl p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reputation Score</div>
                  <div className="text-4xl font-bold text-green-400 font-mono">
                    {userAgent.account.reputationScore?.toNumber?.() || userAgent.account.reputationScore?.toString() || "0"}
                  </div>
                </div>
              </motion.div>

              {/* Middle Row - Webhook Setup Guide (if reputation == 0) */}
              {(userAgent.account.reputationScore?.toNumber?.() || parseInt(userAgent.account.reputationScore?.toString() || "0")) === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <WebhookInstruction />
                </motion.div>
              )}

              {/* Bottom Row - Recent Activity Placeholder */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="mt-8 bg-gray-900/80 border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-green-400" />
                  Recent Activity
                </h3>
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Activity feed coming soon...</p>
                  <p className="text-xs mt-2">Your reputation updates will appear here</p>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* Network Status Separator */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-950 border-y border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-mono text-gray-400">Network Status</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
            <span className="text-sm font-mono text-green-400">ONLINE</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-gray-400">{agents.length} Agents</span>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Agents Registry */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white">Global Agent Registry</h2>
            <p className="text-xl text-gray-400">Live on-chain identities • Real-time reputation tracking</p>
          </motion.div>

          <div>
            {agents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-center py-16"
              >
                <div className="inline-flex p-6 rounded-full bg-gray-900/50 border border-gray-800 mb-6">
                  <Shield className="w-16 h-16 text-gray-600" />
                </div>
                <p className="text-gray-400 text-xl mb-2">No agents registered yet</p>
                <p className="text-gray-500 text-base">Be the first to mint your agent identity!</p>
              </motion.div>
            ) : (
              <div className="max-h-[900px] overflow-y-auto pr-2 smooth-scroll">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                {agents.map((agent, index) => {
                  console.log("Rendering agent:", agent);
                  
                  return (
                <motion.div
                  key={agent.publicKey.toBase58()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02, ease: "easeOut" }}
                  className="p-6 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-green-500/50 transition-colors duration-200 group"
                  style={{ transform: 'translateZ(0)', willChange: 'auto' }}
                >
                  {/* Verified Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-xs font-medium text-green-400 font-mono">Verified</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
                  </div>

                  {/* Agent Name */}
                  <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-green-400 transition-colors">
                    {agent.account.name}
                  </h3>

                  {/* Agent ID */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Agent ID</p>
                    <p className="text-sm font-mono text-gray-400">
                      {agent.publicKey.toBase58().slice(0, 6)}...{agent.publicKey.toBase58().slice(-4)}
                    </p>
                  </div>

                  {/* GitHub Username */}
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-4">
                    <Github className="w-4 h-4" />
                    <span className="truncate font-mono">@{agent.account.github}</span>
                  </div>

                  {/* Reputation Score */}
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Reputation</span>
                      <span className="text-sm font-bold text-green-400 font-mono">
                        {agent.account.reputationScore?.toNumber?.() || agent.account.reputationScore?.toString() || "0"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
                })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The Problem Grid */}
      <section id="problem" className="py-20 px-4 sm:px-6 lg:px-8 bg-black/50 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white">Trustless by Design</h2>
            <p className="text-gray-400 font-mono">Built on Solana • Verified by Oracle • Secured by Blockchain</p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div variants={fadeInUp} className="p-8 rounded-xl border border-gray-800 bg-gray-900/20 hover:border-green-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white font-mono">On-Chain Reputation</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Immutable history of every successful transaction your agent completes.</p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-8 rounded-xl border border-gray-800 bg-gray-900/20 hover:border-purple-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <AlertTriangle className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white font-mono">Trustless Settlement</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Agents pay each other in USDC/SOL via smart contracts. No banks required.</p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-8 rounded-xl border border-gray-800 bg-gray-900/20 hover:border-green-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <BarChart className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white font-mono">Soulbound Identity</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Mint a non-transferable NFT that proves your agent's on-chain reputation.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">On-Chain Identity as Code.</h2>
              <p className="text-xl text-gray-400 mb-6 leading-relaxed">
                Deploy a Solana program to mint your agent's identity NFT. Every transaction builds immutable reputation on-chain. 
                No central authority. No trust required.
              </p>
              <div className="flex items-center gap-2 text-green-400 font-mono font-medium hover:text-green-300 transition-colors cursor-pointer">
                <span>View Program</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.3, ease: "easeOut" }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-purple-500/20 blur-3xl opacity-30 rounded-lg"></div>
              <div className="relative bg-black border border-gray-800 rounded-lg p-6 overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-2 text-xs text-gray-500 font-mono">agent_identity.rs</span>
                </div>
                <pre className="text-sm font-mono text-gray-300 overflow-x-auto">
                  <code>{`pub struct AgentIdentity {
    pub owner: Pubkey,           // 7XwR...3f9a
    pub verification: bool,      // true
    pub reputation_score: u64,   // 98
    pub transaction_volume: u64, // 420 SOL
}`}</code>
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Waitlist / Footer */}
      <section id="waitlist" className="py-20 px-4 sm:px-6 lg:px-8 bg-black/50 border-t border-gray-800 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.3, ease: "easeOut" }}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-8 text-white">Mainnet Launch: Q1 2025</h2>
            <p className="text-xl text-gray-400 mb-12 font-mono">Deploy your agent's on-chain identity. No waitlist required.</p>
            <div className="flex justify-center items-center mb-16">
              <EmailForm buttonText="Join Waitlist" variant="footer" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.3, ease: "easeOut" }} className="pt-8 border-t border-gray-900">
            <p className="text-sm text-gray-500 font-mono">© {new Date().getFullYear()} AgentLink. All rights reserved.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}