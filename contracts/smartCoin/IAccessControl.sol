// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.17;

interface IAccessControl {
    /**
     * @dev Emitted when addresses is added to the frozen list
     */
    event AddressesFrozen(address[] addrs);
    /**
     * @dev Emitted when addresses is removed from the frozen list
     */
    event AddressesUnFrozen(address[] addrs);
    /**
     * @dev Emitted when new operators are named by the registrar operator
     */
    event NamedNewOperators(
        address registrar,
        address operations,
        address technical
    );
    /**
     * @dev Emitted when the future new registrar operator has accepted the role
     */
    event AcceptedRegistrarRole(address registrar);
    /**
     * @dev Emitted when the future new operations operator has accepted the role
     */
    event AcceptedOperationsRole(address operations);
    /**
     * @dev Emitted when the future new technical operator has accepted the role
     */
    event AcceptedTechnicalRole(address technical);
    /**
     * @dev Emitted when the future new implementation contract has been authorized by the registrar
     */
    event ImplementationAuthorized(address implementation);
    /**
     * @dev Emitted when the contract is  paused
     */
    event Paused();
    /**
     * @dev Emitted when the contract is unpaused
     */
    event UnPaused();

    /**
     * @dev Freeze a list of  addresses
     */
    function freeze(address[] calldata addrs) external returns (bool);

    /**
     * @dev Unfreeze a list of  addresses
     */
    function unfreeze(address[] calldata addrs) external returns (bool);

    /**
     * @dev Accepts the future registrar role
     * NB: only the future registrar operator can call this method
     */
    function acceptRegistrarRole() external;

    /**
     * @dev Accepts the future operations role
     * NB: only the future operations operator can call this method
     */
    function acceptOperationsRole() external;

    /**
     * @dev Accepts the future technical role
     * NB: only the future technical operator can call this method
     */
    function acceptTechnicalRole() external;

    /**
     * @dev Authorizes the future new implementation contract
     * NB: only the (current) registrar operator can call this method
     */
    function authorizeImplementation(address implementation) external;
    /**
     * @dev pause the contract except for regitrar actions mint and burn
     * NB: only the (current) registrar operator can call this method
     */
    function pause() external;
    /**
     * @dev unpause the contract
     * NB: only the (current) registrar operator can call this method
     */
    function unpause() external;
        /**
     * @dev find not frozen addresses
     */
    function findNotFrozen(
        address[] calldata addrs
    ) external view returns (address[] memory);
}
