/**
 * Type definitions for AgentLink Oracle
 */

export interface GitHubWebhookPayload {
  action?: string;
  pull_request?: {
    merged?: boolean;
    user?: {
      login: string;
    };
  };
}

export interface OracleConfig {
  port: number;
  rpcUrl: string;
  walletPath: string;
  programId: string;
}

export interface TransactionResponse {
  success: boolean;
  tx?: string;
  error?: string;
}


