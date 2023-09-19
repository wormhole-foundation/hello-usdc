import { HelloUSDC__factory } from "./ethers-contracts"
import {
  getWallet,
  storeDeployedAddresses,
  getChain,
  loadDeployedAddresses,
} from "./utils"

export async function deploy() {

  const deployed = loadDeployedAddresses()
  // CCTP enabled chains are ethereum, avalanche, arbitrum, optimism
  for (const chainId of [2, 6, 23, 24]) {
    const chain = getChain(chainId)
    const signer = getWallet(chainId)

    const helloUSDC = await new HelloUSDC__factory(signer).deploy(
      chain.wormholeRelayer,
      chain.tokenBridge!,
      chain.wormhole,
      chain.cctpMessageTransmitter,
      chain.cctpTokenMessenger,
      chain.USDC
    )
    await helloUSDC.deployed()

    deployed.helloUSDC[chainId] = helloUSDC.address
    console.log(
      `HelloUSDC deployed to ${helloUSDC.address} on chain ${chainId}`
    )
  }

  storeDeployedAddresses(deployed)
}

