"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface EmailFormProps {
  buttonText?: string;
  placeholder?: string;
  variant?: "hero" | "footer";
}

export default function EmailForm({
  buttonText = "Request API Keys",
  placeholder = "Enter your email",
  variant = "hero",
}: EmailFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'email',
          email,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("Email submitted:", email);
        setIsSubmitted(true);
        setEmail("");
        toast.success("Thanks for joining! We'll be in touch soon. 🎉", {
          duration: 4000,
        });
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setIsSubmitted(false);
        }, 3000);
      } else {
        console.error("Error submitting:", data.error);
        toast.error(data.error || "Failed to submit. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const containerClass = variant === "hero" 
    ? "flex flex-col sm:flex-row gap-3 w-full max-w-md"
    : "flex flex-col sm:flex-row gap-3 w-full max-w-lg";

  const wrapperClass = variant === "hero"
    ? "relative w-full"
    : "relative w-fit mx-auto";

  return (
    <div className={wrapperClass}>
      <form onSubmit={handleSubmit} className={containerClass}>
        <div className="relative flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            className="w-full h-12 px-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14F195]/50 focus:border-[#14F195]/50 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || isSubmitted}
          className="h-12 px-6 bg-gradient-to-r from-[#14F195] to-[#00d9a3] text-black font-medium rounded-lg hover:from-[#12d885] hover:to-[#00c895] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isLoading ? "Submitting..." : buttonText}
        </button>
      </form>
      
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-3 left-0 right-0 z-10"
          >
            <div className="bg-[#14F195]/10 border border-[#14F195]/30 rounded-lg px-4 py-2 text-sm text-[#14F195] backdrop-blur-sm text-center">
              Thanks for joining! 🎉
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

