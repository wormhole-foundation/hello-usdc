// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "wormhole-sdk/interfaces/token/IERC20.sol";
import "wormhole-sdk/interfaces/cctp/ITokenMessenger.sol";
import "wormhole-sdk/interfaces/cctp/IMessageTransmitter.sol";
import "wormhole-sdk/WormholeRelayer/Sender.sol";

contract HelloUSDC {
    using WormholeRelayerSend for address;
    
    uint256 constant GAS_LIMIT = 250_000;

    address private immutable _wormholeRelayer;
    address private immutable _usdc;
    address private immutable _cctpTokenMessenger;
    uint32 private immutable _domain;

    mapping(uint16 => uint32) public chainIdToCctpDomain;

    constructor(
        address wormholeRelayer,
        address circleMessageTransmitter,
        address circleTokenMessenger,
        address USDC
    ) {
        _wormholeRelayer = wormholeRelayer;
        _usdc = USDC;
        _cctpTokenMessenger = circleTokenMessenger;
        _domain = IMessageTransmitter(circleMessageTransmitter).localDomain();

        // Approve CCTP token messenger to spend USDC
        IERC20(USDC).approve(circleTokenMessenger, type(uint256).max);

        // Set up CCTP domain mappings
        setCCTPDomain(2, 0);     // Ethereum Mainnet
        setCCTPDomain(10002, 0); // Ethereum Sepolia
        setCCTPDomain(6, 1);     // Avalanche
        setCCTPDomain(24, 2);    // Optimism 
        setCCTPDomain(23, 3);    // Arbitrum
        setCCTPDomain(30, 6);    // Base
        setCCTPDomain(10004, 6);    // Base Sepolia
    }

    function setCCTPDomain(uint16 chainId, uint32 domain) public {
        chainIdToCctpDomain[chainId] = domain;
    }

    function quoteCrossChainDeposit(
        uint16 targetChain
    ) public view returns (uint256 cost) {
        // Cost of delivering payload to targetChain
        (cost, ) = _wormholeRelayer.quoteDeliveryPrice(
            targetChain,
            0, // receiver value
            GAS_LIMIT
        );
    }

    function sendCrossChainDeposit(
        uint16 targetChain,
        address targetHelloUSDC,
        address recipient,
        uint256 amount
    ) public payable {
        uint256 cost = quoteCrossChainDeposit(targetChain);
        require(
            msg.value >= cost,
            "msg.value must be at least quoteCrossChainDeposit(targetChain)"
        );

        // Transfer USDC from sender to this contract
        IERC20(_usdc).transferFrom(msg.sender, address(this), amount);

        // Get CCTP domain for target chain
        uint32 targetDomain = chainIdToCctpDomain[targetChain];
        require(targetDomain != 0 || targetChain == 2, "Unsupported target chain");

        // Send USDC directly to recipient via CCTP (no caller restriction needed)
        ITokenMessenger(_cctpTokenMessenger).depositForBurn(
            amount,
            targetDomain,
            bytes32(uint256(uint160(recipient))), // Convert address to bytes32
            _usdc
        );

        // Optionally send a simple notification payload
        bytes memory payload = abi.encode(recipient, amount);
        _wormholeRelayer.send(
            cost,
            targetChain,
            targetHelloUSDC,
            payload,
            0, // receiver value
            GAS_LIMIT
        );
    }
}
