"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function NamespaceReservation() {
  const [agentName, setAgentName] = useState("");
  const [email, setEmail] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAgentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAgentName(value);
    
    // Mock availability check - always available if name is not empty
    if (value.trim().length > 0) {
      setIsAvailable(true);
      // Show email input after a short delay
      setTimeout(() => {
        setShowEmail(true);
      }, 300);
    } else {
      setIsAvailable(false);
      setShowEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName || !email || isLoading) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'namespace',
          email,
          agentName: agentName.endsWith('.sol') ? agentName : `${agentName}.sol`,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("Namespace reservation:", { agentName, email });
        setIsSubmitted(true);
        setAgentName("");
        setEmail("");
        setIsAvailable(false);
        setShowEmail(false);
        toast.success("Identity minted successfully! 🎉", {
          duration: 4000,
        });
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setIsSubmitted(false);
        }, 3000);
      } else {
        console.error("Error submitting:", data.error);
        toast.error(data.error || "Failed to reserve namespace. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to reserve namespace. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Agent Name Input */}
        <div className="relative">
          <div className="flex items-center gap-0 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#14F195]/50 focus-within:border-[#14F195]/50 transition-all">
            <input
              type="text"
              value={agentName}
              onChange={handleAgentNameChange}
              placeholder="agent-name.sol"
              required
              className="flex-1 h-12 px-4 bg-transparent text-white placeholder:text-slate-500 focus:outline-none font-mono text-sm"
              pattern="[a-z0-9-.]+"
              title="Only lowercase letters, numbers, hyphens, and dots allowed"
            />
            <AnimatePresence>
              {isAvailable && agentName && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-4 flex items-center gap-2 text-[#14F195]"
                >
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Available!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Email Input - Shows after agent name is entered */}
        <AnimatePresence>
          {showEmail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#9945FF]/50 focus-within:border-[#9945FF]/50 transition-all">
                <div className="px-4 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 h-12 px-4 bg-transparent text-white placeholder:text-slate-500 focus:outline-none text-sm"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button - Phantom Wallet Style */}
        <button
          type="submit"
          disabled={isLoading || isSubmitted || !agentName || !email}
          className="w-full h-12 px-6 bg-gradient-to-r from-[#9945FF] to-[#1a1a2e] text-white font-medium rounded-lg hover:from-[#8a3ee8] hover:to-[#252547] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#9945FF]/20"
        >
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      </form>

      {/* Micro-copy */}
      <p className="text-xs text-slate-500 text-center mt-3">
        Minting is currently live on Devnet.
      </p>

      {/* Success Message */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-3 left-0 right-0 z-10"
          >
            <div className="bg-[#14F195]/10 border border-[#14F195]/30 rounded-lg px-4 py-2 text-sm text-[#14F195] backdrop-blur-sm text-center">
              Identity minted! 🎉
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

