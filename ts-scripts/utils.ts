import * as fs from 'fs'
import * as path from 'path'
import { ethers } from 'ethers'

// Chain configuration type
export interface ChainConfig {
  name: string
  description: string
  wormholeChainId: number
  rpc: string
  wormholeRelayer: string
  cctpTokenMessenger: string
  cctpMessageTransmitter: string
  USDC: string
}

// Contract deployment info
export interface ContractInfo {
  HelloUSDC: string
}

// Load chain configuration
export function loadConfig(): { chains: ChainConfig[] } {
  const configPath = path.resolve(__dirname, './deploy-config/config.json')
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`)
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'))
}

// Get chain configuration by name
export function getChainConfig(chainName: string): ChainConfig {
  const config = loadConfig()
  const chain = config.chains.find(c => c.name === chainName)
  if (!chain) {
    const available = config.chains.map(c => c.name).join(', ')
    throw new Error(`Chain "${chainName}" not found in config. Available: ${available}`)
  }
  return chain
}

// Get deployment info for a chain
export function getDeploymentInfo(chainName: string): ContractInfo | null {
  console.log(`Loading deployment info for ${chainName}`)
  
  // Check if we have a saved deployment address
  const deploymentPath = path.resolve(__dirname, './deploy-config/deployments.json')
  if (fs.existsSync(deploymentPath)) {
    try {
      const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
      if (deployments[chainName] && deployments[chainName].HelloUSDC) {
        console.log(`Found existing deployment: ${deployments[chainName].HelloUSDC}`)
        return deployments[chainName]
      }
    } catch (e) {
      console.log(`Could not read deployment file: ${e}`)
    }
  }
  
  return null // No existing deployment found
}

// Save deployment info
export function saveDeploymentInfo(chainName: string, info: ContractInfo): void {
  const deploymentPath = path.resolve(__dirname, './deploy-config/deployments.json')
  
  let deployments: Record<string, ContractInfo> = {}
  
  // Load existing deployments if file exists
  if (fs.existsSync(deploymentPath)) {
    try {
      deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    } catch (e) {
      console.log(`Could not read existing deployments: ${e}`)
    }
  }
  
  // Update with new deployment
  deployments[chainName] = info
  
  // Save back to file
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2))
  console.log(`Deployment info for ${chainName} saved to ${deploymentPath}`)
}

// Create ethers provider
export function createProvider(rpc: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpc)
}

// Create wallet from private key
export function createWallet(provider: ethers.JsonRpcProvider): ethers.Wallet {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable not set')
  }
  return new ethers.Wallet(privateKey, provider)
}

// Deploy HelloUSDC contract
export async function deployHelloUSDC(
  wallet: ethers.Wallet,
  config: ChainConfig
): Promise<string> {
  console.log(`Deploying HelloUSDC to ${config.description}...`)

  // Deploy contract with constructor parameters
  const contractFactory = new ethers.ContractFactory(
    require('../out/HelloUSDC.sol/HelloUSDC.json').abi,
    require('../out/HelloUSDC.sol/HelloUSDC.json').bytecode.object,
    wallet
  )

  const contract = await contractFactory.deploy(
    config.wormholeRelayer,
    config.cctpMessageTransmitter,
    config.cctpTokenMessenger,
    config.USDC
  )

  await contract.waitForDeployment()
  const contractAddress = await contract.getAddress()

  console.log('HelloUSDC deployed to:', contractAddress)
  return contractAddress
}

// Format USDC amount (6 decimals)
export function formatUSDC(amount: bigint): string {
  return ethers.formatUnits(amount, 6)
}

// Parse USDC amount to wei
export function parseUSDC(amount: string): bigint {
  return ethers.parseUnits(amount, 6)
}
