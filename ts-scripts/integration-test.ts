import { ethers } from 'ethers'
import {
  getChainConfig,
  createProvider,
  createWallet,
  deployHelloUSDC,
  getDeploymentInfo,
  saveDeploymentInfo,
  formatUSDC,
  parseUSDC
} from './utils'

// Test configuration
const SOURCE_CHAIN = "fuji";         // Avalanche Fuji
const TARGET_CHAIN = "base-sepolia"; // Base Sepolia
const TRANSFER_AMOUNT = "0.1";        // 10 USDC

async function main(): Promise<void> {
  console.log('Starting cross-chain USDC transfer integration test');
  console.log(`Source: ${SOURCE_CHAIN} -> Target: ${TARGET_CHAIN}`);
  console.log(`Amount: ${TRANSFER_AMOUNT} USDC\n`);

  try {
    // Setup chains
    const sourceConfig = getChainConfig(SOURCE_CHAIN);
    const targetConfig = getChainConfig(TARGET_CHAIN);
    
    const sourceProvider = createProvider(sourceConfig.rpc);
    const targetProvider = createProvider(targetConfig.rpc);
    
    const sourceWallet = createWallet(sourceProvider);
    const targetWallet = createWallet(targetProvider);

    // Deploy or get existing contracts
    let sourceContract = getDeploymentInfo(SOURCE_CHAIN);
    if (!sourceContract) {
      console.log(`Deploying HelloUSDC to ${SOURCE_CHAIN}...`);
      const address = await deployHelloUSDC(sourceWallet, sourceConfig);
      sourceContract = { HelloUSDC: address };
      saveDeploymentInfo(SOURCE_CHAIN, sourceContract);
    }

    let targetContract = getDeploymentInfo(TARGET_CHAIN);
    if (!targetContract) {
      console.log(`Deploying HelloUSDC to ${TARGET_CHAIN}...`);
      const address = await deployHelloUSDC(targetWallet, targetConfig);
      targetContract = { HelloUSDC: address };
      saveDeploymentInfo(TARGET_CHAIN, targetContract);
    }

    console.log(`Source contract (${SOURCE_CHAIN}): ${sourceContract.HelloUSDC}`);
    console.log(`Target contract (${TARGET_CHAIN}): ${targetContract.HelloUSDC}\n`);

    // Create contract instances
    const HelloUSDC_ABI = require('../out/HelloUSDC.sol/HelloUSDC.json').abi;
    const sourceHelloUSDC = new ethers.Contract(sourceContract.HelloUSDC, HelloUSDC_ABI, sourceWallet);

    // Get USDC contracts
    const USDC_ABI = [
      'function balanceOf(address) view returns (uint256)',
      'function approve(address,uint256) returns (bool)',
      'function allowance(address,address) view returns (uint256)'
    ];
    const sourceUSDC = new ethers.Contract(sourceConfig.USDC, USDC_ABI, sourceWallet);
    const targetUSDC = new ethers.Contract(targetConfig.USDC, USDC_ABI, targetWallet);

    // Check initial balances
    console.log('Checking initial balances...');
    const sourceBalanceBefore = await sourceUSDC.balanceOf(sourceWallet.address);
    const targetBalanceBefore = await targetUSDC.balanceOf(targetWallet.address);
    
    console.log(`Source USDC balance: ${formatUSDC(sourceBalanceBefore)}`);
    console.log(`Target USDC balance: ${formatUSDC(targetBalanceBefore)}`);

    const transferAmountWei = parseUSDC(TRANSFER_AMOUNT);
    if (sourceBalanceBefore < transferAmountWei) {
      throw new Error(`Insufficient USDC balance. Need ${TRANSFER_AMOUNT}, have ${formatUSDC(sourceBalanceBefore)}`);
    }

    // Get quote for cross-chain transfer
    console.log('\nGetting quote for cross-chain transfer...');
    const quote = await sourceHelloUSDC.quoteCrossChainDeposit(targetConfig.wormholeChainId);
    console.log(`Transfer cost: ${ethers.formatEther(quote)} ETH`);

    // Approve USDC spending
    console.log('\nApproving USDC transfer...');
    const currentAllowance = await sourceUSDC.allowance(sourceWallet.address, sourceContract.HelloUSDC);
    
    if (currentAllowance < transferAmountWei) {
      const approveTx = await sourceUSDC.approve(sourceContract.HelloUSDC, transferAmountWei);
      await approveTx.wait();
      console.log('   USDC transfer approved\n');
    } else {
      console.log('   USDC already approved\n');
    }

    // Execute cross-chain transfer
    console.log('Executing cross-chain transfer...');
    const tx = await sourceHelloUSDC.sendCrossChainDeposit(
      targetConfig.wormholeChainId,
      targetWallet.address,
      transferAmountWei,
      targetWallet.address,
      { value: quote }
    );

    console.log(`   Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`   Transaction confirmed in block ${receipt.blockNumber}\n`);

    // Wait for cross-chain completion
    console.log('Waiting for cross-chain transfer completion...');
    const startTime = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    let transferCompleted = false;
    while (Date.now() - startTime < timeout) {
      const currentBalance = await targetUSDC.balanceOf(targetWallet.address);
      if (currentBalance > targetBalanceBefore) {
        const receivedAmount = BigInt(currentBalance) - BigInt(targetBalanceBefore);
        console.log(`   Transfer completed! Received ${formatUSDC(receivedAmount)} USDC\n`);
        transferCompleted = true;
        break;
      }
      
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }

    if (!transferCompleted) {
      throw new Error('Transfer did not complete within timeout period');
    }

    // Verify final balances
    console.log('Verifying final balances...');
    const sourceBalanceAfter = await sourceUSDC.balanceOf(sourceWallet.address);
    const targetBalanceAfter = await targetUSDC.balanceOf(targetWallet.address);

    console.log(`Source balance: ${formatUSDC(sourceBalanceBefore)} -> ${formatUSDC(sourceBalanceAfter)}`);
    console.log(`Target balance: ${formatUSDC(targetBalanceBefore)} -> ${formatUSDC(targetBalanceAfter)}`);

    // Validate transfer
    const sourceDiff = BigInt(sourceBalanceBefore) - BigInt(sourceBalanceAfter);
    const targetDiff = BigInt(targetBalanceAfter) - BigInt(targetBalanceBefore);

    if (sourceDiff !== transferAmountWei) {
      throw new Error(`Source balance change mismatch. Expected: ${TRANSFER_AMOUNT}, Actual: ${formatUSDC(sourceDiff)}`);
    }
    console.log('Source balance correctly decreased');

    if (targetDiff <= BigInt(0)) {
      throw new Error('Target balance did not increase');
    }
    console.log('Target balance increased');
    console.log('Cross-chain transfer test PASSED\n');

  } catch (error) {
    console.error('Integration test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error) 