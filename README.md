# Building Your First Cross-Chain USDC Sending and Receiving Application

This tutorial contains a [solidity contract](https://github.com/wormhole-foundation/hello-usdc/blob/main/src/HelloUSDC.sol) that can be deployed onto any CCTP-supported chain to form a fully functioning cross-chain application with the ability for users to request, from one contract, that USDC is sent to an address on a different chain.

## Summary 

Included in this [repository](https://github.com/wormhole-foundation/hello-usdc/) is:

- Example Solidity Code
- Example Forge local testing setup
- Testnet Deploy Scripts
- Example Testnet testing setup

### Environment Setup

- Node 16.14.1 or later, npm 8.5.0 or later: [https://docs.npmjs.com/downloading-and-installing-node-js-and-npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- forge 0.2.0 or later: [https://book.getfoundry.sh/getting-started/installation](https://book.getfoundry.sh/getting-started/installation)

### Testing Locally

Clone down the repo, cd into it, then build and run unit tests:

```bash
git clone https://github.com/wormhole-foundation/hello-usdc.git
cd hello-usdc
npm run build
forge test --via-ir
```

Expected output is

```bash
Running 1 test for test/HelloUSDC.t.sol:HelloUSDCTest
[PASS] testCrossChainDeposit() (gas: 1338038)
Test result: ok. 1 passed; 0 failed; finished in 5.64s
```

### Deploying to Testnet

You will need a wallet with some testnet ETH and testnet USDC (eth). 

```bash
EVM_PRIVATE_KEY=your_wallet_private_key npm run deploy
```

### Testing on Testnet

You will need a wallet with testnet ETH.

You must have also deployed contracts onto testnet (as described in the above section).

To test sending and receiving a message on testnet, execute the test as such:

```bash
EVM_PRIVATE_KEY=your_wallet_private_key npm run test
```