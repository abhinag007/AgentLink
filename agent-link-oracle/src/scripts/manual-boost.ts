/**
 * Manual Boost Script
 * Manually boost reputation for testing purposes
 */
import {
  initializeBlockchain,
  initializeProgram,
  deriveAgentPda,
  getProgramId,
} from "../config/blockchain.js";

async function main() {
  console.log("🤖 Oracle Service - Manual Boost\n");

  const { connection, wallet } = initializeBlockchain();
  const program = initializeProgram(connection, wallet);
  const PROGRAM_ID = getProgramId();

  console.log(`🔑 Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`📡 Network: ${connection.rpcEndpoint}\n`);

  // Derive the Agent PDA
  const [agentPda] = deriveAgentPda(wallet.publicKey, PROGRAM_ID);

  console.log(`🎯 Target Agent: ${agentPda.toBase58()}`);

  try {
    console.log(`⚡ Boosting Reputation...`);

    const tx = await (program.methods as any)
      .addReputation()
      .accounts({
        agentAccount: agentPda,
        user: wallet.publicKey,
      })
      .rpc();

    console.log("✅ Transaction Success!");
    console.log(`🔗 https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
  } catch (err: any) {
    console.error("❌ Boost Failed:", err.message);
    
    if (err.message?.includes("Account does not exist")) {
      console.log("\n⚠️  NOTE: Agent not registered yet. Run 'npm run register' first.");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
