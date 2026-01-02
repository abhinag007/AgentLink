"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, UserX, AlertTriangle, BarChart, ArrowRight, FileText, CheckCircle, Loader2, Github } from "lucide-react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import EmailForm from "@/components/EmailForm";
import Terminal from "@/components/Terminal";

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
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
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
  const [githubUrl, setGithubUrl] = useState("");
  
  // --- AGENTS LIST STATE ---
  const [agents, setAgents] = useState<any[]>([]);
  const [boostingAgent, setBoostingAgent] = useState<string | null>(null);
  
  // --- REPUTATION TRACKING FOR CONFETTI ---
  const previousReputations = useRef<Map<string, number>>(new Map());

 // --- FETCH AGENTS FUNCTION ---
 const fetchAgents = async () => {
  try {
    // Setup provider and program
    const provider = new AnchorProvider(connection, wallet || {} as any, {});
    const programIdl = { ...idl, address: PROGRAM_ID.toBase58() } as Idl;
    const program = new Program(programIdl, provider);

    // Fetch all agent accounts
    // @ts-ignore - TypeScript doesn't recognize the account name from IDL
    const allAgents = await program.account.agentAccount.all();
    console.log("Fetched agents:", allAgents);
    
    setAgents(allAgents);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
  }
};

// --- FETCH ON MOUNT ---
useEffect(() => {
  fetchAgents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  const interval = setInterval(() => {
    fetchAgents();
  }, 2000);

  return () => clearInterval(interval);
}, [connection, wallet]); // Re-start if connection changes

// --- REPUTATION CHANGE DETECTION & CONFETTI ---
useEffect(() => {
  agents.forEach((agent) => {
    const agentKey = agent.publicKey.toBase58();
    const currentReputation = agent.account.reputationScore?.toNumber?.() || 
                             parseInt(agent.account.reputationScore?.toString() || "0");
    
    const previousReputation = previousReputations.current.get(agentKey);
    
    // Only trigger confetti if:
    // 1. We have a previous value (not first render)
    // 2. The new reputation is higher than the previous
    if (previousReputation !== undefined && currentReputation > previousReputation) {
      // Trigger professional confetti explosion
      confetti({
        particleCount: 50,
        spread: 70,
        startVelocity: 30,
        origin: { y: 0.6 }
      });
    }
    
    // Update the stored reputation value
    previousReputations.current.set(agentKey, currentReputation);
  });
}, [agents]);

 // --- BOOST REPUTATION FUNCTION ---
 const boostReputation = async (agentPublicKey: PublicKey) => {
  // Check if wallet is connected
  if (!wallet?.publicKey) {
    toast.error("Please connect your wallet first!");
    return;
  }

  const agentKey = agentPublicKey.toBase58();
  setBoostingAgent(agentKey);

  try {
    // Show loading toast
    const loadingToast = toast.loading("Verifying task...");

    const provider = new AnchorProvider(connection, wallet, {});
    const programIdl = { ...idl, address: PROGRAM_ID.toBase58() } as Idl;
    const program = new Program(programIdl, provider);

    const tx = await program.methods
      .addReputation() // Calls the new Rust function
      .accounts({
        user: wallet.publicKey,
        // agentAccount is inferred from seeds automatically usually, 
        // but if it fails, we might need to pass it explicitly.
        // For now, let Anchor infer it from the 'user' seed.
      })
      .rpc();

    console.log("Reputation Boosted!", tx);
    
    // Dismiss loading and show success
    toast.dismiss(loadingToast);
    toast.success("Task Verified! +10 XP", {
      duration: 4000,
      icon: "⚡",
    });
    
    // Refresh the list to see the new score
    await fetchAgents();

  } catch (error: any) {
    console.error("Boost failed:", error);
    
    // Parse error message
    let errorMessage = "Failed to boost reputation. Please try again.";
    if (error?.message) {
      const message = error.message.toLowerCase();
      if (message.includes("user rejected") || message.includes("user declined")) {
        errorMessage = "Transaction cancelled by user.";
      } else if (message.includes("owner")) {
        errorMessage = "Only the agent owner can boost reputation!";
      }
    }
    
    toast.error(errorMessage, {
      duration: 5000,
    });
  } finally {
    setBoostingAgent(null);
  }
};

 // --- MINT FUNCTION ---
 const mintAgent = async () => {
  if (!wallet) return;

  // Validate inputs
  if (!agentName || !githubUrl) {
    toast.error("Please fill in both Agent Name and GitHub URL before minting.", {
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

    // 4. Send the Transaction with user-provided data
    const tx = await program.methods
      .registerAgent(agentName, githubUrl)
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

    // 5. Auto-refresh the agents list
    await fetchAgents();

    // Clear input fields
    setAgentName("");
    setGithubUrl("");

  } catch (error: any) {
    console.error("Minting failed:", error);
    
    // Parse error message
    let errorMessage = "Minting failed! Please try again.";
    let errorTitle = "Error";
    
    if (error?.message) {
      const message = error.message.toLowerCase();
      
      // User cancelled transaction
      if (message.includes("user rejected") || message.includes("user declined")) {
        errorMessage = "Transaction cancelled by user.";
      } 
      // Insufficient funds
      else if (message.includes("insufficient funds")) {
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
    <div className="min-h-screen bg-[#0b0c15] text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#14F195]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#AB9FF2]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-[#14F195]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-[#0b0c15]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#14F195]" />
              <span className="text-xl font-semibold font-mono">AgentLink</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-slate-400 hover:text-[#14F195] transition-colors text-sm font-medium">Protocol</a>
              <a href="#problem" className="text-slate-400 hover:text-[#14F195] transition-colors text-sm font-medium">Manifesto</a>
              <a href="#waitlist" className="text-slate-400 hover:text-[#14F195] transition-colors text-sm font-medium">For Developers</a>
            </div>
            <button 
              onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2 border border-slate-700 rounded-lg text-sm hover:border-[#14F195]/50 hover:text-[#14F195] transition-colors font-medium"
            >
              Join the Waitlist
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#14F195]/30 bg-[#14F195]/10 mb-8">
                  <span className="text-xs font-medium text-[#14F195]">🚀 Live on Solana Devnet • Powering the Agent Economy</span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-[#14F195] to-[#AB9FF2] bg-clip-text text-transparent leading-tight"
              >
                Identity & Reputation for the Autonomous Age.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl sm:text-2xl text-slate-400 mb-12 leading-relaxed"
              >
                The first on-chain registry for AI Agents. Verify code hash, build reputation, and enable trustless settlement in USDC/SOL.
              </motion.p>

              {/* AGENT INPUT FIELDS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col gap-4 mb-8"
              >
                <input
                  type="text"
                  placeholder="Agent Name (e.g. TravelBot)"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0b0c15]/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#14F195] hover:border-slate-600 transition-colors"
                />
                <input
                  type="text"
                  placeholder="GitHub Repo URL"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0b0c15]/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#AB9FF2] hover:border-slate-600 transition-colors"
                />
              </motion.div>

              {/* ACTION BUTTONS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 mb-12"
              >
                {/* 1. Wallet Connect Button */}
                <div className="wallet-adapter-button-trigger">
                  <WalletMultiButton 
                    style={{
                      backgroundColor: '#AB9FF2',
                      borderRadius: '0.5rem',
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      fontSize: '1rem',
                      padding: '1rem 2rem',
                      height: 'auto',
                    }}
                    className="!bg-[#AB9FF2] hover:!bg-[#9a8ee8] !transition-all"
                  />
                </div>

                {/* 2. THE MINT BUTTON (Only shows if connected) */}
                {wallet ? (
                  <button
                    onClick={mintAgent}
                    disabled={isMinting || !agentName || !githubUrl}
                    className="px-8 py-4 bg-[#14F195] text-black font-bold rounded-lg hover:bg-[#14F195]/90 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Minting ID...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Mint Agent Identity
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-8 py-4 border border-slate-700 text-slate-500 font-semibold rounded-lg cursor-not-allowed flex items-center gap-2"
                  >
                    <Shield className="w-5 h-5" />
                    Connect Wallet to Mint
                  </button>
                )}
              </motion.div>

              {/* SUCCESS MESSAGE (If transaction works) */}
              {txSignature && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 mb-8 bg-[#14F195]/10 border border-[#14F195]/30 rounded-lg text-[#14F195] text-sm break-all"
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle className="w-4 h-4" /> Agent Verified on Blockchain!
                  </div>
                  <a 
                    href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    View Transaction: {txSignature.slice(0, 20)}...
                  </a>
                </motion.div>
              )}

              {/* Stats Row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-800"
              >
                <div>
                  <div className="text-2xl font-bold text-[#14F195] font-mono mb-1">$4M+</div>
                  <div className="text-sm text-slate-400">Volume Secured</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#14F195] font-mono mb-1">120+</div>
                  <div className="text-sm text-slate-400">Verified Agents</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#14F195] font-mono mb-1">98/100</div>
                  <div className="text-sm text-slate-400">Avg Trust Score</div>
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
        </div>
      </section>

      {/* Verified Agents Registry */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0b0c15] relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Verified Agents Registry</h2>
            <p className="text-xl text-slate-400">Live on-chain identities • Real-time reputation tracking</p>
          </motion.div>

          <div>
            <p className="text-center text-slate-500 mb-6">Found {agents.length} agent(s)</p>
            {agents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="inline-flex p-6 rounded-full bg-slate-900/50 border border-slate-800 mb-6">
                  <Shield className="w-16 h-16 text-slate-600" />
                </div>
                <p className="text-slate-400 text-xl mb-2">No agents registered yet</p>
                <p className="text-slate-500 text-base">Be the first to mint your agent identity!</p>
              </motion.div>
            ) : (
              <div className="max-h-[900px] overflow-y-auto pr-2 smooth-scroll">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                {agents.map((agent, index) => {
                  console.log("Rendering agent:", agent);
                  
                  // Check if the current wallet is the owner of this agent
                  const isOwner = wallet?.publicKey && agent.account.owner.toString() === wallet.publicKey.toString();
                  const isBoostingThisAgent = boostingAgent === agent.publicKey.toBase58();
                  
                  return (
                <motion.div
                  key={agent.publicKey.toBase58()}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-[#14F195]/50 transition-all duration-300 group"
                >
                  {/* Verified Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#14F195]/10 border border-[#14F195]/30">
                      <CheckCircle className="w-3 h-3 text-[#14F195]" />
                      <span className="text-xs font-medium text-[#14F195]">Verified</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
                  </div>

                  {/* Agent Name */}
                  <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-[#14F195] transition-colors">
                    {agent.account.name}
                  </h3>

                  {/* Agent ID */}
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-1">Agent ID</p>
                    <p className="text-sm font-mono text-slate-400">
                      {agent.publicKey.toBase58().slice(0, 6)}...{agent.publicKey.toBase58().slice(-4)}
                    </p>
                  </div>

                  {/* GitHub Link */}
                  <a
                    href={agent.account.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#AB9FF2] hover:text-[#14F195] transition-colors text-sm font-medium"
                  >
                    <Github className="w-4 h-4" />
                    <span className="truncate">View Repository</span>
                    <ArrowRight className="w-3 h-3 ml-auto" />
                  </a>

                  {/* Reputation Score */}
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Reputation</span>
                      <span className="text-sm font-bold text-[#14F195] font-mono">
                        {agent.account.reputationScore?.toNumber?.() || agent.account.reputationScore?.toString() || "0"}
                      </span>
                    </div>
                  </div>

                  {/* Boost Reputation Button - Only show for owner */}
                  {isOwner && (
                    <button
                      onClick={() => boostReputation(agent.publicKey)}
                      disabled={isBoostingThisAgent}
                      className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-md text-sm transition-colors border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isBoostingThisAgent ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          ⚡ Simulate Task (+10 XP)
                        </>
                      )}
                    </button>
                  )}
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
      <section id="problem" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0b0c15]/50 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Trustless by Design</h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div variants={fadeInUp} className="p-8 rounded-xl border border-slate-800 bg-slate-900/20 hover:border-slate-700 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-[#14F195]/10 border border-[#14F195]/20 flex items-center justify-center mb-4 group-hover:bg-[#14F195]/20 transition-colors">
                <UserX className="w-6 h-6 text-[#14F195]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">On-Chain Reputation</h3>
              <p className="text-slate-400 leading-relaxed">Immutable history of every successful transaction your agent completes.</p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-8 rounded-xl border border-slate-800 bg-slate-900/20 hover:border-slate-700 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-[#9945FF]/10 border border-[#9945FF]/20 flex items-center justify-center mb-4 group-hover:bg-[#9945FF]/20 transition-colors">
                <AlertTriangle className="w-6 h-6 text-[#9945FF]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Trustless Settlement</h3>
              <p className="text-slate-400 leading-relaxed">Agents pay each other in USDC/SOL via smart contracts. No banks required.</p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-8 rounded-xl border border-slate-800 bg-slate-900/20 hover:border-slate-700 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-[#14F195]/10 border border-[#14F195]/20 flex items-center justify-center mb-4 group-hover:bg-[#14F195]/20 transition-colors">
                <BarChart className="w-6 h-6 text-[#14F195]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Soulbound Identity</h3>
              <p className="text-slate-400 leading-relaxed">Mint a non-transferable NFT that proves your agent's on-chain reputation.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">On-Chain Identity as Code.</h2>
              <p className="text-xl text-slate-400 mb-6 leading-relaxed">
                Deploy a Solana program to mint your agent's identity NFT. Every transaction builds immutable reputation on-chain. 
                No central authority. No trust required.
              </p>
              <div className="flex items-center gap-2 text-[#14F195] font-medium">
                <span>View Program</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#14F195]/20 to-[#9945FF]/20 blur-3xl opacity-30 rounded-lg"></div>
              <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-6 overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-2 text-xs text-slate-500 font-mono">agent_identity.rs</span>
                </div>
                <pre className="text-sm font-mono text-slate-300 overflow-x-auto">
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
      <section id="waitlist" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0b0c15]/50 border-t border-slate-800 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-8">Mainnet Launch: Q1 2025</h2>
            <p className="text-xl text-slate-400 mb-12">Deploy your agent's on-chain identity. No waitlist required.</p>
            <div className="flex justify-center items-center mb-16">
              <EmailForm buttonText="Join Waitlist" variant="footer" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="pt-8 border-t border-slate-900">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} AgentLink. All rights reserved.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}