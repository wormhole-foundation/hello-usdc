# Hello USDC

Cross-chain USDC transfer application using Wormhole's CCTP integration.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   forge install
   ```

2. **Set environment variable:**
   ```bash
   export PRIVATE_KEY="your_private_key_here"
   ```

3. **Get testnet USDC:**
   - Use [Circle's testnet faucet](https://faucet.circle.com/) for USDC on supported chains

4. **Deploy contracts first:**
   ```bash
   npm run deploy fuji     # Avalanche Fuji
   npm run deploy sepolia  # Ethereum Sepolia
   ```

5. **Run integration test:**
   ```bash
   npm run integration-test
   ```

**Note:** Contracts must be deployed before running the integration test. The test will verify cross-chain transfers between the deployed contracts.

## Manual Deployment

Deploy to specific chains:
```bash
npm run deploy fuji     # Avalanche Fuji
npm run deploy sepolia  # Ethereum Sepolia
```

## Project Structure

```
├── src/
│   └── HelloUSDC.sol              # Main contract with CCTP integration
├── test/
│   └── HelloUSDC.t.sol           # Solidity tests
├── ts-scripts/
│   ├── deploy.ts                 # Deployment script
│   ├── integration-test.ts       # End-to-end test
│   ├── utils.ts                  # Utility functions
│   └── deploy-config/
│       └── config.json           # Chain configurations
├── foundry.toml                  # Foundry configuration
├── package.json                  # Node.js dependencies
└── README.md
```

## Configuration

Add chains to `ts-scripts/deploy-config/config.json`:

```json
{
  "chainName": {
    "description": "Chain Name",
    "wormholeChainId": 123,
    "rpc": "https://rpc.example.com",
    "wormholeRelayer": "0x...",
    "cctpTokenMessenger": "0x...",
    "cctpMessageTransmitter": "0x...",
    "USDC": "0x..."
  }
}
```

**Contract Addresses:** Find official CCTP and Wormhole contract addresses in the [Wormhole SDK constants](https://github.com/wormhole-foundation/wormhole-sdk-ts/blob/main/core/base/src/constants/contracts/circle.ts).

## Environment Variables

- `PRIVATE_KEY` - Wallet private key (required)

## License

Apache 2.0