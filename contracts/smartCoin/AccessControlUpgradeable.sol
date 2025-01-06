// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ISmartCoin.sol";
import "./IAccessControl.sol";
import "./AccessControlDataLayout.sol";

abstract contract AccessControlUpgradeable is
    AccessControlDataLayout,
    IAccessControl,
    Initializable
{
    /**
     * @dev Used when a method reserved to the registrar operator is called by some other address
     */
    error UnauthorizedRegistrar();
    /**
     * @dev Used when the registar operator's address is used as parameter where it's not allowed
     */
    error ForbiddenForRegistrar();
    /**
     * @dev Used when the registar operator's address is used as parameter where it's not allowed
     */
    error ForbiddenForOperations();
    /**
     * @dev Used when `addr` address is not authorized to perform an action
     */
    error Unauthorized(address addr);
    /**
     * @dev Used when the zero address is used as parameter where it's not allowed
     */
    error ZeroAddressCheck();
    /**
     * @dev Used when trying to freeze an address and the address is already in the frozen list
     */
    error AddressAlreadyFrozen(address addr);
    /**
     * @dev Used when a method reserved to the technical operator is called by some other address
     */
    error UnauthorizedTechnical();
    /**
     * @dev Used when a method reserved to the operations operator is called by some other address
     */
    error UnauthorizedOperations();
    /**
     * @dev Used when trying to unfreeze an address and the address is not frozen
     */
    error AddressNotFrozen(address addr);
    /**
     * @dev Used when trying to update to an unauthorized implementation
     */
    error UnauthorizedImplementation(address implementation);
    /**
     * @dev Used when contract already paused
     */
    error ContractPaused();
    /**
     * @dev Used when contract already not paused
     */
    error ContractNotPaused();

    /**
     * @dev Used when operators have same addresses
     */
    error InconsistentOperators();
    /**
     * @dev Current registrar operator's address
     */
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address public immutable registrar;
    /**
     * @dev Current operations operator's address
     */
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address public immutable operations;
    /**
     * @dev Current technical operator's address
     */
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address public immutable technical;

    /**
     * @dev Throws if called by any account that's frozen.
     */
    modifier onlyNotFrozen(address _addr) {
        if (isFrozen[_addr]) revert Unauthorized(_addr);
        _;
    }
    /**
     * @dev Throws if called by any account that's not frozen.
     */
    modifier onlyFrozen(address _addr) {
        if (!isFrozen[_addr]) revert AddressNotFrozen(_addr);
        _;
    }

    /**
     * @dev Throws if called by any account other than the registrar.
     */
    modifier onlyRegistrar() {
        if (msg.sender != registrar) revert UnauthorizedRegistrar();
        _;
    }

    /**
     * @dev Throws if called by any account other than the technical.
     */
    modifier onlyTechnical() {
        if (msg.sender != technical) revert UnauthorizedTechnical();
        _;
    }
    modifier OnlyWhenOperatorsHaveDifferentAddress(
        address _registrar,
        address _operations,
        address _technical
    ) {
        if (
            _registrar == _operations ||
            _operations == _technical ||
            _registrar == _technical
        ) revert InconsistentOperators();
        _;
    }
    /**
     * @dev Throws if addr is registrar
     */
    modifier forbiddenForRegistrar(address _addr) {
        if (_addr == registrar) revert ForbiddenForRegistrar();
        _;
    }

    /**
     * @dev Throws if addr is operations
     */
    modifier forbiddenForOperations(address _addr) {
        if (_addr == operations) revert ForbiddenForOperations();
        _;
    }

    /**
     * @dev Consumes the authorization to update to this `_newImplementation`, that was given by the current registrar
     * Throws if `_newImplementation` has not been previously authorized
     */
    modifier consumeAuthorizeImplementation(address _newImplementation) {
        if (newImplementation != _newImplementation)
            revert UnauthorizedImplementation(_newImplementation);
        _;
        newImplementation = address(0);
    }
    /**
     * @dev Throws if `_registrar`, `_operations` and `_technical` have not all accepted their respective future role
     * and (still) match the values for new contract
     */
    modifier onlyWhenOperatorsMatchAndAcceptedRole(ISmartCoin newSmartCoin) {
        (
            address _registar,
            address _operations,
            address _technical
        ) = newSmartCoin.getOperators();
        if (_registar != newRegistrar || !hasAcceptedRole[_registar])
            revert UnauthorizedRegistrar();
        if (_operations != newOperations || !hasAcceptedRole[_operations])
            revert UnauthorizedOperations();
        if (_technical != newTechnical || !hasAcceptedRole[_technical])
            revert UnauthorizedTechnical();
        _;
    }
    /**
     * @dev Throws if `addr` is the zero address
     */
    modifier onlyNotZeroAddress(address addr) {
        if (addr == address(0)) revert ZeroAddressCheck();
        _;
    }
    /**
     * @dev Throws if the contract is not paused.
     */
    modifier onlyWhenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    modifier onlyWhenPaused() {
        if (!paused) revert ContractNotPaused();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _registrar, address _operations, address _technical) {
        registrar = _registrar;
        operations = _operations;
        technical = _technical;
    }

    /**
     * @dev Freeze a list of  addresses
     * NB : only the registrar operator can call this method
     */
    function freeze(
        address[] calldata _addrs
    ) external onlyRegistrar returns (bool) {
        for (uint256 i = 0; i < _addrs.length; i++) {
            if (isFrozen[_addrs[i]]) revert AddressAlreadyFrozen(_addrs[i]);
            isFrozen[_addrs[i]] = true;
        }
        emit AddressesFrozen(_addrs);
        return true;
    }

    /**
     * @dev Unfreeze a list of  addresses
     * NB : only the registrar operator can call this method
     */
    function unfreeze(
        address[] calldata _addrs
    ) external onlyRegistrar returns (bool) {
        for (uint256 i = 0; i < _addrs.length; i++) {
            if (!isFrozen[_addrs[i]]) revert AddressNotFrozen(_addrs[i]);
            isFrozen[_addrs[i]] = false;
        }
        emit AddressesUnFrozen(_addrs);
        return true;
    }

    /**
     * @dev Name the operators for the next implementation
     * and emits a corresponding `NamedNewOperators` event
     * The operators will have to accept their future roles before the update to the new implementation can take place
     * NB : only the registrar operator can call this method
     */
    function nameNewOperators(
        address _registrar,
        address _operations,
        address _technical
    )
        external
        onlyRegistrar
        onlyNotZeroAddress(_registrar)
        onlyNotZeroAddress(_operations)
        onlyNotZeroAddress(_technical)
        OnlyWhenOperatorsHaveDifferentAddress(
            _registrar,
            _operations,
            _technical
        )
    {
        _resetNewOperators();
        newRegistrar = _registrar;
        newOperations = _operations;
        newTechnical = _technical;
        emit NamedNewOperators(_registrar, _operations, _technical);
    }

    /**
     * @dev Accepts the future registrar role
     * and emits a corresponding `AcceptedRegistrarRole` event
     * NB: only the future registrar operator can call this method
     */
    function acceptRegistrarRole() external {
        if (newRegistrar != msg.sender) revert UnauthorizedRegistrar();
        hasAcceptedRole[newRegistrar] = true;
        emit AcceptedRegistrarRole(newRegistrar);
    }

    /**
     * @dev Accepts the future operations role
     * and emits a corresponding `AcceptedOperationsRole` event
     * NB: only the future operations operator can call this method
     */
    function acceptOperationsRole() external {
        if (newOperations != msg.sender) revert UnauthorizedOperations();
        hasAcceptedRole[newOperations] = true;
        emit AcceptedOperationsRole(newOperations);
    }

    /**
     * @dev Accepts the future technical role
     * and emits a corresponding `AcceptedTechnicalRole` event
     * NB: only the future technical operator can call this method
     */
    function acceptTechnicalRole() external {
        if (newTechnical != msg.sender) revert UnauthorizedTechnical();
        hasAcceptedRole[newTechnical] = true;
        emit AcceptedTechnicalRole(newTechnical);
    }

    /**
     * @dev Authorizes the future new implementation contract
     * and emits a corresponding `ImplementationAuthorized` event
     * NB: only the (current) registrar operator can call this method
     * NB: fails if all future operators have not previously accepted their role using the acceptXXXRole() methods
     */
    function authorizeImplementation(
        address _implementation
    )
        external
        onlyRegistrar
        onlyNotZeroAddress(_implementation)
        onlyWhenOperatorsMatchAndAcceptedRole(ISmartCoin(_implementation))
    {
        newImplementation = _implementation;
        emit ImplementationAuthorized(newImplementation);
    }

    function __AccessControl_init() internal onlyInitializing {
        paused = false;
    }

    /**
     * @dev Internal method that resets new operators' acceptation statuses
     */
    function _resetNewOperators() internal {
        hasAcceptedRole[newRegistrar] = false;
        hasAcceptedRole[newOperations] = false;
        hasAcceptedRole[newTechnical] = false;
    }

    /**
     * @dev called by the owner to pause, triggers stopped state
     */
    function pause() external onlyRegistrar onlyWhenNotPaused {
        paused = true;
        emit Paused();
    }

    /**
     * @dev called by the owner to unpause, returns to normal state
     */
    function unpause() external onlyRegistrar onlyWhenPaused {
        paused = false;
        emit UnPaused();
    }

    /**
     * @dev find not frozen addresses
     */
    function findNotFrozen(
        address[] calldata addrs
    ) external view returns (address[] memory) {
        address[] memory notFrozenAddresses = new address[](getNumberOfNotFrozenAddresses(addrs));
        uint16 count = 0;
        for (uint i = 0; i < addrs.length; i++) {
            if (!isFrozen[addrs[i]]) {
                notFrozenAddresses[count] = addrs[i];
                count++;
            }
        }
        return notFrozenAddresses;
    }

    /**
     * @dev get number of not frozen addresses
     */
    function getNumberOfNotFrozenAddresses(
        address[] calldata addrs
    ) internal view returns (uint16) {
        uint16 count = 0;
        for (uint i = 0; i < addrs.length; i++) {
            if (!isFrozen[addrs[i]]) {
                count++;
            }
        }
        return count;
    }
}
