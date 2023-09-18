import * as ethers from "ethers"
import {
  checkFlag,
  getHelloUSDC,
  wait,
  getArg,
} from "./utils"
import { deploy } from "./deploy"

async function main() {
  if (checkFlag("--sendRemoteDeposit")) {
    await sendRemoteDeposit()
    return
  }
  if (checkFlag("--deployHelloUSDC")) {
    await deploy()
    return
  }
}

async function sendRemoteDeposit() {
  const recipient = getArg(["--recipient", "-r"]) || "";

  const from = 6
  const to = 24
  const amount = 1e5

  const helloToken = getHelloUSDC(from)
  const cost = await helloToken.quoteCrossChainDeposit(to)
  console.log(`Sending 0.1 USDC. cost: ${ethers.utils.formatEther(cost)}`)

  const rx = await helloToken
    .sendCrossChainDeposit(
      to,
      getHelloUSDC(to).address,
      recipient,
      amount
    )
    .then(wait)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
