use anchor_lang::prelude::*;
use anchor_lang::system_program; // Import System Program for transfers

declare_id!("1upL7DFZsCER26XZj2BxRFG9bwESf5JWS5w9dC9vFk"); 

#[program]
pub mod agent_link_protocol {
    use super::*;

    // 1. Register New Agent (Costs 0.1 SOL)
    pub fn register_agent(ctx: Context<RegisterAgent>, name: String, github: String) -> Result<()> {
        let agent_account = &mut ctx.accounts.agent_account;
        
        agent_account.owner = ctx.accounts.user.key();
        agent_account.name = name;
        agent_account.github = github;
        agent_account.reputation_score = 0; 
        agent_account.is_verified = false;  

        // Transfer 0.1 SOL Stake
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: agent_account.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, 100_000_000)?; 

        msg!("Agent Registered! Reputation Initialized.");
        Ok(())
    }

    // 2. NEW: Update Reputation (Simulate completed task)
    pub fn add_reputation(ctx: Context<UpdateAgent>) -> Result<()> {
        let agent_account = &mut ctx.accounts.agent_account;
        
        // Logic: +10 points for every successful task
        agent_account.reputation_score += 10;
        
        msg!("Task Verified! New Reputation Score: {}", agent_account.reputation_score);
        Ok(())
    }
}

// --- DATA STRUCTURES ---

#[account]
pub struct AgentAccount {
    pub owner: Pubkey,
    pub name: String,
    pub github: String,
    pub reputation_score: u64,
    pub is_verified: bool,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init, 
        payer = user, 
        space = 8 + 32 + 50 + 50 + 8 + 1, 
        seeds = [b"agent", user.key().as_ref()], 
        bump
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Context for Updating Reputation
#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        // ✅ CRITICAL FIX: Use 'owner' key for seeds, NOT the signer's key
        // This allows the Oracle (signer) to update the User's (owner) account
        seeds = [b"agent", owner.key().as_ref()], 
        bump,
        // Optional sanity check: Ensure the account actually belongs to this owner
        constraint = agent_account.owner == owner.key()
    )]
    pub agent_account: Account<'info, AgentAccount>,

    /// CHECK: This is the User (GitHub Developer). They do NOT need to sign.
    /// We only pass this account to verify the correct PDA seeds.
    pub owner: UncheckedAccount<'info>, 

    #[account(mut)]
    pub oracle: Signer<'info>, // ✅ The Oracle (Your Node.js Backend) pays gas

    pub system_program: Program<'info, System>,
}