/**
 * Blockchain configuration and setup utilities
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { DEFAULT_RPC_URL, SEEDS } from "./constants.js";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Initialize blockchain connection and wallet
 */
export function initializeBlockchain() {
  const connection = new Connection(
    process.env.ANCHOR_PROVIDER_URL || DEFAULT_RPC_URL
  );
  
  const walletPath = process.env.ANCHOR_WALLET;
  if (!walletPath) {
    throw new Error("ANCHOR_WALLET environment variable not set");
  }

  const keypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  
  const wallet = new anchor.Wallet(keypair);

  return { connection, wallet, keypair };
}

/**
 * Load the program IDL
 */
export function loadIdl() {
  const idlPath = path.resolve(__dirname, "./idl.json");
  return JSON.parse(fs.readFileSync(idlPath, "utf-8"));
}

/**
 * Get the program ID from environment
 */
export function getProgramId(): PublicKey {
  const programId = process.env.PROGRAM_ID;
  if (!programId) {
    throw new Error("PROGRAM_ID environment variable not set");
  }
  return new PublicKey(programId);
}

/**
 * Initialize the Anchor program
 */
export function initializeProgram(connection: Connection, wallet: anchor.Wallet) {
  const idl = loadIdl();
  const programId = getProgramId();
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  return new Program(idl, provider);
}

/**
 * Derive agent PDA from owner public key
 */
export function deriveAgentPda(
  ownerPublicKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.AGENT), ownerPublicKey.toBuffer()],
    programId
  );
}

