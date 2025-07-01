import { getChainConfig, createProvider, createWallet, deployHelloUSDC, saveDeploymentInfo } from './utils'

async function main() {
  const chainName = process.argv[2]
  if (!chainName) {
    console.log('Usage: npx tsx deploy.ts <chainName>')
    console.log('Example: npx tsx deploy.ts fuji')
    process.exit(1)
  }

  const config = getChainConfig(chainName)
  const provider = createProvider(config.rpc)
  const wallet = createWallet(provider)

  const contractAddress = await deployHelloUSDC(wallet, config)
  saveDeploymentInfo(chainName, { HelloUSDC: contractAddress })

  console.log('Deployment completed successfully')
}

main().catch(console.error)
