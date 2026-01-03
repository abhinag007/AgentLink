# Development Guide

## Project Architecture

### Directory Structure

```
src/
├── config/          # Configuration and blockchain setup
│   ├── blockchain.ts    # Blockchain connection utilities
│   ├── constants.ts     # Application constants
│   └── idl.json        # Solana program IDL
├── scripts/         # CLI scripts
│   ├── register-bot.ts  # Register oracle bot
│   └── manual-boost.ts  # Manual reputation boost
├── server/          # Express server
│   └── index.ts        # Main server with API endpoints
└── types/           # TypeScript type definitions
    └── index.ts        # Shared types
```

### Key Components

#### 1. Blockchain Configuration (`src/config/blockchain.ts`)
Centralized blockchain setup utilities:
- `initializeBlockchain()` - Set up connection and wallet
- `loadIdl()` - Load program IDL
- `getProgramId()` - Get program ID from env
- `initializeProgram()` - Initialize Anchor program
- `deriveAgentPda()` - Derive agent PDA from owner

#### 2. Server (`src/server/index.ts`)
Express API server with endpoints:
- `GET /` - Health check
- `POST /webhook/github` - GitHub webhook handler
- `GET /status` - Oracle bot status

#### 3. Scripts
- **register-bot.ts**: One-time registration of oracle bot
- **manual-boost.ts**: Manual reputation boost for testing

## Development Workflow

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your values
nano .env
```

### 2. Register Oracle Bot (First Time)
```bash
npm run register
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test Locally
```bash
# In another terminal
curl -X POST http://localhost:4000/webhook/github

# Or test manual boost
npm run manual-boost
```

## Code Style Guidelines

### TypeScript
- Use explicit types for function parameters and returns
- Prefer interfaces over types for object shapes
- Use `const` for immutable values
- Use descriptive variable names

### Error Handling
- Always wrap blockchain calls in try-catch
- Log errors with descriptive messages
- Return appropriate HTTP status codes
- Provide helpful error messages

### Comments
- Use JSDoc comments for functions
- Explain "why" not "what" in inline comments
- Document complex blockchain operations

## Testing

### Manual Testing
1. Start the server: `npm start`
2. Test health check: `curl http://localhost:4000/`
3. Test webhook: `curl -X POST http://localhost:4000/webhook/github`
4. Check Solana Explorer for transactions

### Future: Automated Tests
- Unit tests for utility functions
- Integration tests for API endpoints
- Mock blockchain interactions for testing

## Common Issues

### "Account does not exist"
**Cause**: Agent not registered on-chain
**Solution**: Run `npm run register`

### "Wallet not found"
**Cause**: ANCHOR_WALLET path incorrect
**Solution**: Check .env file and wallet path

### "Program ID invalid"
**Cause**: Wrong PROGRAM_ID in .env
**Solution**: Update PROGRAM_ID with correct value

### Port already in use
**Cause**: Another process using port 4000
**Solution**: Change PORT in .env or kill existing process

## Deployment

### Prerequisites
- Server with Node.js installed
- Solana wallet with SOL for transactions
- Environment variables configured

### Steps
1. Clone repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Register bot: `npm run register`
5. Start server: `npm start`
6. Configure GitHub webhook to point to your server

### Production Considerations
- Use process manager (PM2, systemd)
- Set up HTTPS with reverse proxy (nginx)
- Implement webhook signature verification
- Add rate limiting
- Set up monitoring and logging
- Use production RPC endpoint

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| ANCHOR_PROVIDER_URL | Solana RPC endpoint | https://api.devnet.solana.com |
| ANCHOR_WALLET | Path to wallet JSON | /path/to/wallet.json |
| PROGRAM_ID | Solana program ID | 8xN... |
| PORT | Server port (optional) | 4000 |

## Contributing

1. Create a feature branch
2. Make changes following code style
3. Test thoroughly
4. Update documentation
5. Submit pull request

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Express.js Guide](https://expressjs.com/)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)

