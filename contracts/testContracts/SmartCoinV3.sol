// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.17;

import "../smartCoin/SmartCoin.sol";

contract SmartCoinV3 is SmartCoin {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address registrar,
        address operations,
        address technical
    ) SmartCoin(registrar, operations, technical) {}

    function version() external pure override returns (string memory) {
        return "V3";
    }
}
