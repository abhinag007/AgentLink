import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AgentLinkProtocol } from "../target/types/agent_link_protocol";
import { assert } from "chai";

describe("agent-link-protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AgentLinkProtocol as Program<AgentLinkProtocol>;

  it("Registers a new Agent!", async () => {
    const user = provider.wallet;

    // We still calculate this MANUALLY just for the Verification step later
    const [agentAccountPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerAgent("TravelBot", "https://github.com/travelbot")
      .accounts({
        // agentAccount: agentAccountPda,  <-- DELETED THIS LINE (Anchor does it auto)
        user: user.publicKey,
        // systemProgram: ...             <-- Anchor usually infers this too, but we can keep or remove.
      })
      .rpc();

    // Verification
    const accountData = await program.account.agentAccount.fetch(agentAccountPda);
    
    console.log("Agent Name:", accountData.name);
    
    assert.equal(accountData.name, "TravelBot");
    assert.equal(accountData.isVerified, false);
  });
});