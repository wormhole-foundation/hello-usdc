// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "wormhole-solidity-sdk/WormholeRelayerSDK.sol";
import "wormhole-solidity-sdk/interfaces/IERC20.sol";

contract HelloUSDC is CCTPSender, CCTPReceiver {
    uint256 constant GAS_LIMIT = 250_000;

    constructor(
        address _wormholeRelayer,
        address _tokenBridge,
        address _wormhole,
        address _circleMessageTransmitter,
        address _circleTokenMessenger,
        address _USDC
    )
        CCTPBase(_wormholeRelayer, _tokenBridge, _wormhole, _circleMessageTransmitter, _circleTokenMessenger, _USDC)
    {}

    function quoteCrossChainDeposit(uint16 targetChain) public view returns (uint256 cost) {
        // Cost of delivering token and payload to targetChain
        (cost,) = wormholeRelayer.quoteEVMDeliveryPrice(targetChain, 0, GAS_LIMIT);
    }

    function sendCrossChainDeposit(
        uint16 targetChain,
        address targetHelloUSDC,
        address recipient,
        uint256 amount
    ) public payable {
        uint256 cost = quoteCrossChainDeposit(targetChain);
        require(msg.value == cost, "msg.value must be quoteCrossChainDeposit(targetChain)");

        IERC20(USDC).transferFrom(msg.sender, address(this), amount);

        bytes memory payload = abi.encode(recipient);
        sendUSDCWithPayloadToEvm(
            targetChain, 
            targetHelloUSDC, // address (on targetChain) to send token and payload to
            payload, 
            0, // receiver value
            GAS_LIMIT, 
            amount
        );
    }

    function receivePayloadAndUSDC(
        bytes memory payload,
        uint256 amountUSDCReceived,
        bytes32, // sourceAddress
        uint16, // sourceChain
        bytes32 // deliveryHash
    ) internal override onlyWormholeRelayer {
        (address recipient) = abi.decode(payload, (address));

        IERC20(USDC).transfer(recipient, amountUSDCReceived);
    }
}
