import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js"; // <--- DATABASE
import { PublicKey } from "@solana/web3.js";
import {
  initializeBlockchain,
  initializeProgram,
  deriveAgentPda,
  getProgramId,
} from "../config/blockchain.js";
import { DEFAULT_PORT } from "../config/constants.js";

dotenv.config();

// --- CONFIGURATION ---
const PORT = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;

// 1. Blockchain Setup
const { connection, wallet } = initializeBlockchain();
const program = initializeProgram(connection, wallet);
const PROGRAM_ID = getProgramId();

// 2. Database Setup (Supabase)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ FATAL: Supabase URL/Key missing in .env");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- ROUTES ---

app.get("/", (req, res) => res.send("🤖 AgentLink Oracle (Production Ready)"));

/**
 * 🆕 REGISTER ENDPOINT
 * Frontend calls this to link GitHub User <-> Solana Wallet
 */
app.post("/register", async (req, res) => {
  const { github_username, wallet_address } = req.body;

  if (!github_username || !wallet_address) {
    return res.status(400).json({ error: "Missing github_username or wallet_address" });
  }

  // TODO (Next Step): Verify wallet signature here to prevent spoofing!
  // For now, we store the mapping directly.
  
  try {
    const { data, error } = await supabase
      .from("user_mappings")
      .upsert([
        { github_username: github_username, wallet_address: wallet_address }
      ])
      .select();

    if (error) throw error;

    console.log(`📝 Registered: ${github_username} -> ${wallet_address}`);
    res.status(200).json({ success: true, message: "User linked successfully" });
  } catch (err: any) {
    console.error("Database Error:", err.message);
    res.status(500).json({ error: "Failed to save mapping" });
  }
});

/**
 * WEBHOOK ENDPOINT
 * Secure + Database Integrated
 */
app.post("/webhook/github", async (req, res) => {
  console.log("🔔 Webhook Received!");

  // --- 1. SECURITY: Verify Signature ---
  const signature = req.headers["x-hub-signature-256"];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret || !signature) return res.status(401).json({ error: "Auth missing" });

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");
  
  if (signature !== digest) {
    console.warn("🚨 Signature Mismatch!");
    return res.status(401).json({ error: "Invalid signature" });
  }

  // --- 2. LOGIC: Check for Merged PR ---
  const payload = req.body;
  if (payload.action !== "closed" || !payload.pull_request?.merged) {
    return res.json({ status: "ignored" });
  }

  const githubUser = payload.pull_request.user.login;
  console.log(`✅ PR Merged by GitHub User: ${githubUser}`);

  // --- 3. DATABASE: Find the Wallet for this User ---
  const { data: userRecord, error } = await supabase
    .from("user_mappings")
    .select("wallet_address")
    .eq("github_username", githubUser)
    .single();

  if (error || !userRecord) {
    console.warn(`⚠️ No wallet found for GitHub user: ${githubUser}`);
    return res.status(404).json({ error: "User not registered in AgentLink" });
  }

  // Convert string address to PublicKey
  const targetWallet = new PublicKey(userRecord.wallet_address);
  console.log(`🔗 Found Linked Wallet: ${targetWallet.toBase58()}`);

  // --- 4. BLOCKCHAIN: Execute the Transaction ---
  try {
    // A. Derive the Agent PDA using the USER'S wallet (not the Oracle's)
    const [agentPda] = deriveAgentPda(targetWallet, PROGRAM_ID);
    console.log(`🎯 Updating Agent Account: ${agentPda.toBase58()}`);

    // B. Send Transaction
    // CRITICAL FIX: We pass 'owner' (User) and 'oracle' (Signer) separately
    const tx = await (program.methods as any)
      .addReputation() // Ensure this matches your Rust function name
      .accounts({
        agentAccount: agentPda,       // The User's PDA
        owner: targetWallet,          // ✅ The User's Public Key (passed as 'owner')
        oracle: wallet.publicKey,     // ✅ The Oracle pays for gas (signer)
        systemProgram: PublicKey.default,
      })
      .rpc();

    console.log(`✅ Reputation Updated! Tx: ${tx}`);
    res.status(200).json({ success: true, tx, user: githubUser });

  } catch (err: any) {
    console.error("❌ Blockchain Transaction Failed:", err);
    // Log detailed anchor errors if available
    if (err.logs) console.error(err.logs);
    
    res.status(500).json({ error: "Transaction Failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 Production Server on ${PORT}`));