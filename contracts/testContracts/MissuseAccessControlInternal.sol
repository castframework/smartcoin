// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.17;

import "../smartCoin/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract MissuseAccessControlInternal is AccessControlUpgradeable, UUPSUpgradeable {
    constructor(
        address registrar,
        address operations,
        address technical
    ) AccessControlUpgradeable(registrar, operations, technical) {}

    function initialize() public initializer {
        __AccessControl_init();
    }

    function doubleInitAccessControl() public {
        __AccessControl_init();
    }

    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(address) internal override onlyRegistrar {}
}
