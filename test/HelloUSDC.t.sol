// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {HelloUSDC} from "../src/HelloUSDC.sol";

import "wormhole-solidity-sdk/testing/WormholeRelayerTest.sol";
import "wormhole-solidity-sdk/interfaces/IERC20.sol";

import "forge-std/Test.sol";
import "forge-std/console.sol";

contract HelloUSDCTest is WormholeRelayerBasicTest {
    HelloUSDC public helloSource;
    HelloUSDC public helloTarget;

    IERC20 public USDCSource;
    IERC20 public USDCTarget;

    constructor() {
        setTestnetForkChains(2, 6);
    }

    function setUpSource() public override {
        USDCSource = IERC20(address(sourceChainInfo.USDC));
        mintUSDC(sourceChain, address(this), 5000e18);
        helloSource = new HelloUSDC(
            address(relayerSource),
            address(wormholeSource),
            address(sourceChainInfo.circleMessageTransmitter),
            address(sourceChainInfo.circleTokenMessenger),
            address(USDCSource)
        );
    }

    function setUpTarget() public override {
        USDCTarget = IERC20(address(targetChainInfo.USDC));
        mintUSDC(sourceChain, address(this), 5000e18);
        helloTarget = new HelloUSDC(
            address(relayerTarget),
            address(wormholeTarget),
            address(targetChainInfo.circleMessageTransmitter),
            address(targetChainInfo.circleTokenMessenger),
            address(USDCTarget)
        );
    }

    function setUpGeneral() public override {
        vm.selectFork(sourceFork);
        helloSource.setRegisteredSender(
            targetChain,
            toWormholeFormat(address(helloTarget))
        );

        vm.selectFork(targetFork);
        helloTarget.setRegisteredSender(
            sourceChain,
            toWormholeFormat(address(helloSource))
        );
    }

    function testRemoteDeposit() public {
        uint256 amount = 100e6;
        USDCSource.approve(address(helloSource), amount);

        vm.selectFork(targetFork);
        address recipient = 0x1234567890123456789012345678901234567890;

        vm.selectFork(sourceFork);
        uint256 cost = helloSource.quoteCrossChainDeposit(targetChain);

        vm.recordLogs();
        helloSource.sendCrossChainDeposit{value: cost}(
            targetChain,
            address(helloTarget),
            recipient,
            amount
        );
        performDelivery();

        vm.selectFork(targetFork);
        assertEq(USDCTarget.balanceOf(recipient), amount);
    }
}
