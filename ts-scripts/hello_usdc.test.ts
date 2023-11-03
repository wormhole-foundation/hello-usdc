import { describe, expect, test } from "@jest/globals";
import { ethers } from "ethers";
import {
  getHelloUSDC,
  loadDeployedAddresses as getDeployedAddresses,
  getWallet,
  getChain,
  wait,
} from "./utils";
import { IERC20__factory, ITokenBridge__factory } from "./ethers-contracts";
import {
  tryNativeToUint8Array,
  CHAIN_ID_TO_NAME,
} from "@certusone/wormhole-sdk";
import { waitForDelivery } from "./getStatus";

const sourceChain = 6;
const targetChain = 24;

describe("Hello USDC Integration Tests on Testnet", () => {
  test(
    "Tests the sending of USDC",
    async () => {
      const arbitraryTokenAmount = ethers.BigNumber.from(
        new Date().getTime() % 10 ** 5
      );

      const USDCSourceChain = IERC20__factory.connect(
        getChain(sourceChain).USDC,
        getWallet(sourceChain)
      );

      const USDCAddressOnTargetChain = getChain(targetChain).USDC;
      const USDCTargetChain = IERC20__factory.connect(
        USDCAddressOnTargetChain,
        getWallet(targetChain)
      );

      const walletTargetChainAddress = getWallet(targetChain).address;

      const sourceHelloUSDCContract = getHelloUSDC(sourceChain);
      const targetHelloUSDCContract = getHelloUSDC(targetChain);

      const walletOriginalBalanceOfUSDC = await USDCTargetChain.balanceOf(
        walletTargetChainAddress
      );

      const cost = await sourceHelloUSDCContract.quoteCrossChainDeposit(
        targetChain
      );
      console.log(
        `Cost of sending the tokens: ${ethers.utils.formatEther(
          cost
        )} testnet AVAX`
      );

      // Approve the HelloUSDC contract to use 'arbitraryTokenAmount' of our HT token
      const approveTx = await USDCSourceChain.approve(
        sourceHelloUSDCContract.address,
        arbitraryTokenAmount
      ).then(wait);
      console.log(
        `HelloUSDC contract approved to spend ${ethers.utils.formatEther(
          arbitraryTokenAmount
        )} of USDC`
      );

      console.log(
        `Sending ${ethers.utils.formatEther(arbitraryTokenAmount)} USDC`
      );

      const tx = await sourceHelloUSDCContract.sendCrossChainDeposit(
        targetChain,
        targetHelloUSDCContract.address,
        walletTargetChainAddress,
        arbitraryTokenAmount,
        { value: cost }
      );

      console.log(`Transaction hash: ${tx.hash}`);
      await tx.wait();
      console.log(
        `See transaction at: https://testnet.snowtrace.io/tx/${tx.hash}`
      );

      await waitForDelivery(CHAIN_ID_TO_NAME[sourceChain], tx.hash);

      console.log(`Seeing if USDC was sent`);
      const walletCurrentBalanceOfUSDC = await USDCTargetChain.balanceOf(
        walletTargetChainAddress
      );

      expect(
        walletCurrentBalanceOfUSDC.sub(walletOriginalBalanceOfUSDC).toString()
      ).toBe(arbitraryTokenAmount.toString());
    },
    60 * 1000 * 60
  ); // timeout
});
