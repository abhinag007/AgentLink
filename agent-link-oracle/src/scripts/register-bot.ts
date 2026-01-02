/**
 * Register Bot Script
 * One-time setup to register the Oracle Bot as an agent on-chain
 */
import * as anchor from "@coral-xyz/anchor";
import {
  initializeBlockchain,
  initializeProgram,
  deriveAgentPda,
  getProgramId,
} from "../config/blockchain.js";

async function main() {
  console.log("🤖 Registering Oracle Bot...\n");

  const { wallet } = initializeBlockchain();
  const program = initializeProgram(
    initializeBlockchain().connection,
    wallet
  );
  const PROGRAM_ID = getProgramId();

  // Derive the Agent PDA
  const [agentPda] = deriveAgentPda(wallet.publicKey, PROGRAM_ID);

  console.log(`📍 Agent PDA: ${agentPda.toBase58()}`);
  console.log(`🔑 Wallet: ${wallet.publicKey.toBase58()}\n`);

  try {
    // Register the Oracle Bot
    const tx = await (program.methods as any)
      .registerAgent("Oracle_Auto_Bot", "https://github.com/agent-link/oracle")
      .accounts({
        agentAccount: agentPda,
        user: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Oracle Bot Registered Successfully!");
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("ℹ️  Oracle Bot is already registered!");
    } else {
      console.error("❌ Registration Failed:", err);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
