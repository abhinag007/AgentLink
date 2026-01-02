import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import {
  initializeBlockchain,
  initializeProgram,
  deriveAgentPda,
  getProgramId,
} from "../config/blockchain.js";
import { DEFAULT_PORT } from "../config/constants.js";
import type { TransactionResponse, GitHubWebhookPayload } from "../types/index.js";

dotenv.config();

// --- CONFIGURATION ---
const PORT = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;
const { connection, wallet } = initializeBlockchain();
const program = initializeProgram(connection, wallet);
const PROGRAM_ID = getProgramId();

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); // Handle default GitHub format just in case
app.use(bodyParser.json());

// --- ROUTES ---

/**
 * Health Check - Verify server is running
 */
app.get("/", (req, res) => {
  res.send("🤖 AgentLink Oracle is Running...");
});

/**
 * GitHub Webhook Endpoint
 * Triggered when GitHub events occur (e.g., PR merged)
 */
app.post("/webhook/github", async (req, res) => {
  console.log("🔔 Webhook Received!");

  // DEBUG: Check if body exists
  if (!req.body) {
    console.error("❌ Error: req.body is undefined. Check 'Content-Type' in GitHub Settings!");
    return res.status(400).json({ error: "Missing body" });
  }

  const payload = req.body;

  // DEBUG: Log the action
  console.log("👉 Payload Action:", payload.action || "No action found");

  // --- GATEKEEPER LOGIC ---
  const isClosed = payload.action === "closed";
  const isMerged = payload.pull_request?.merged === true;

  if (!isClosed || !isMerged) {
    console.log(`🚫 Event Ignored: Action '${payload.action}' (Merged: ${isMerged})`);
    return res.json({ status: "ignored" });
  }

  // --- IF WE ARE HERE, IT IS A REAL MERGE! 🚀 ---
  console.log(`✅ PR MERGED! User '${payload.pull_request?.user?.login}' contributed code.`);
  console.log("⚡ Starting Blockchain Transaction...");

  try {
    // 1. Derive Address
    const [agentPda] = deriveAgentPda(wallet.publicKey, PROGRAM_ID);
    console.log(`🎯 Agent Address: ${agentPda.toBase58()}`);

    // 2. Send Transaction
    const tx = await (program.methods as any)
      .addReputation()
      .accounts({
        agentAccount: agentPda,
        user: wallet.publicKey,
      })
      .rpc();

    console.log(`✅ Transaction Success! Signature: ${tx}`);
    
    res.status(200).json({
      success: true,
      tx: tx,
      message: "Reputation Boosted for Merged PR"
    });

  } catch (error) {
    console.error("❌ Blockchain Transaction Failed:", error);
    res.status(500).json({
      success: false,
      error: "Blockchain transaction failed",
    });
  }
});


/**
 * Get Oracle Bot Status
 */
app.get("/status", async (req, res) => {
  try {
    const [agentPda] = deriveAgentPda(wallet.publicKey, PROGRAM_ID);
    
    res.status(200).json({
      status: "online",
      walletAddress: wallet.publicKey.toBase58(),
      agentPda: agentPda.toBase58(),
      network: connection.rpcEndpoint,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: "Failed to fetch status",
    });
  }
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`\n🚀 Oracle Server listening on http://localhost:${PORT}`);
  console.log(`📡 Connected to: ${connection.rpcEndpoint}`);
  console.log(`🔑 Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`\nTest webhook: curl -X POST http://localhost:${PORT}/webhook/github`);
});
