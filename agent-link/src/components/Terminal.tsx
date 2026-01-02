"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const TERMINAL_LINES = [
  { text: "> initiating_handshake...", delay: 0 },
  { text: "> verifying_signature(0x7f...3a)... OK", delay: 800 },
  { text: "> checking_reputation(agent_id: \"travel_bot\")...", delay: 1600 },
  { text: "> SCORE: 98 (Trusted)", delay: 2400, highlight: true },
  { text: "> transaction_approved.", delay: 3200 },
];

export default function Terminal() {
  const [currentLine, setCurrentLine] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    TERMINAL_LINES.forEach((line, index) => {
      const timer = setTimeout(() => {
        setCurrentLine(index + 1);
      }, line.delay);
      timers.push(timer);
    });

    // Reset after all lines are shown
    const resetTimer = setTimeout(() => {
      setCurrentLine(0);
      setAnimationKey(prev => prev + 1); // Trigger re-run
    }, TERMINAL_LINES[TERMINAL_LINES.length - 1].delay + 2000);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      clearTimeout(resetTimer);
    };
  }, [animationKey]); // Re-run when animation resets

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#14F195]/20 via-[#AB9FF2]/20 to-[#14F195]/20 blur-3xl opacity-40 rounded-lg"></div>
      
      {/* Terminal container */}
      <div className="relative bg-[#0b0c15] border border-slate-800/50 rounded-lg p-6 overflow-hidden shadow-2xl">
        {/* Terminal header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          <span className="ml-3 text-xs text-slate-500 font-mono">solana_program.rs</span>
        </div>

        {/* Terminal content */}
        <div className="space-y-2 font-mono text-sm">
          {TERMINAL_LINES.map((line, index) => {
            const isVisible = index <= currentLine;
            const isHighlighted = line.highlight && isVisible;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: isVisible ? 1 : 0,
                  x: isVisible ? 0 : -10
                }}
                transition={{ duration: 0.3 }}
                className={`${
                  isHighlighted 
                    ? "text-[#14F195] font-semibold" 
                    : "text-slate-300"
                }`}
              >
                {line.text}
                {isVisible && index === currentLine && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ 
                      duration: 0.8, 
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="ml-1"
                  >
                    ▋
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
          style={{
            backgroundImage: `
              linear-gradient(rgba(20, 241, 149, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(20, 241, 149, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
      </div>
    </div>
  );
}

