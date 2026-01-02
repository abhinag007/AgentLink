# AgentLink Oracle

The AgentLink Oracle is a backend service that monitors GitHub events and automatically boosts agent reputation on the Solana blockchain when contributions are made.

## 📁 Project Structure

```
agent-link-oracle/
├── src/
│   ├── server/          # Express server and API endpoints
│   │   └── index.ts     # Main server file with webhook handlers
│   ├── scripts/         # Utility scripts
│   │   ├── register-bot.ts    # Register the oracle bot as an agent
│   │   └── manual-boost.ts    # Manually boost reputation for testing
│   ├── config/          # Configuration files
│   │   └── idl.json     # Solana program IDL (Interface Definition)
│   └── types/           # TypeScript type definitions (future)
├── .env                 # Environment variables (create from .env.example)
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Solana CLI tools
- A Solana wallet with devnet SOL

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=/path/to/your/wallet.json
PROGRAM_ID=your_program_id_here
```

3. Register the oracle bot (first time only):
```bash
npm run register
```

## 📜 Available Scripts

- `npm start` - Start the oracle server on port 4000
- `npm run dev` - Start the server in watch mode (auto-restart on changes)
- `npm run register` - Register the oracle bot as an agent on-chain
- `npm run manual-boost` - Manually boost reputation for testing

## 🔧 How It Works

### 1. Server (src/server/index.ts)
- Runs an Express server on port 4000
- Exposes a `/webhook/github` endpoint for GitHub webhooks
- Listens for pull request merge events
- Automatically calls the Solana program to boost agent reputation

### 2. Register Bot (src/scripts/register-bot.ts)
- One-time setup script
- Registers the oracle bot as an agent on the blockchain
- Creates the Program Derived Address (PDA) for the bot

### 3. Manual Boost (src/scripts/manual-boost.ts)
- Testing utility
- Manually boosts reputation without waiting for GitHub events
- Useful for development and debugging

## 🌐 API Endpoints

### GET /
Health check endpoint
```bash
curl http://localhost:4000/
```

### POST /webhook/github
GitHub webhook endpoint (called by GitHub)
```bash
curl -X POST http://localhost:4000/webhook/github
```

## 🔐 Security Notes

- Keep your `.env` file secure and never commit it
- The wallet specified in `ANCHOR_WALLET` should have sufficient SOL for transactions
- In production, add webhook signature verification for GitHub events

## 🛠️ Development

### Testing Locally

1. Start the server:
```bash
npm start
```

2. In another terminal, test the webhook:
```bash
curl -X POST http://localhost:4000/webhook/github
```

3. Check the Solana Explorer for transaction confirmation

### Debugging

- Check server logs for transaction details
- View transactions on [Solana Explorer](https://explorer.solana.com/?cluster=devnet)
- Use `npm run manual-boost` to test without GitHub events

## 📦 Dependencies

- `@coral-xyz/anchor` - Solana program framework
- `@solana/web3.js` - Solana JavaScript API
- `express` - Web server framework
- `dotenv` - Environment variable management
- `cors` - Cross-origin resource sharing
- `tsx` - TypeScript execution

## 🤝 Contributing

This is part of the AgentLink protocol. For contributions, please refer to the main repository.

## 📄 License

ISC


