// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { AgentRegistry }          from "./AgentRegistry.sol";
import { KeyringAccessCondition } from "./KeyringAccessCondition.sol";

/// @title  KeyringFactory
/// @notice Deployed once by Keyring. Any user smart wallet calls deploy() to get
///         their own AgentRegistry + KeyringAccessCondition in a single transaction.
///         The caller (msg.sender) becomes the owner of both contracts.
contract KeyringFactory {
    // ── constants ──────────────────────────────────────────────────────────────
    address public immutable REGISTRATION_WORKFLOWS;

    // ── events ─────────────────────────────────────────────────────────────────
    /// @notice Emitted when a user deploys their contract pair.
    /// @param  owner      The caller's address (user smart wallet).
    /// @param  registry   The deployed AgentRegistry address.
    /// @param  condition  The deployed KeyringAccessCondition address.
    event RegistryDeployed(
        address indexed owner,
        address indexed registry,
        address indexed condition
    );

    // ── errors ─────────────────────────────────────────────────────────────────
    error ZeroAddress();

    constructor(address registrationWorkflows) {
        if (registrationWorkflows == address(0)) revert ZeroAddress();
        REGISTRATION_WORKFLOWS = registrationWorkflows;
    }

    /// @notice Deploys AgentRegistry and KeyringAccessCondition for msg.sender.
    ///         The caller becomes the owner of both contracts.
    /// @return registry   Deployed AgentRegistry address.
    /// @return condition  Deployed KeyringAccessCondition address.
    function deploy() external returns (address registry, address condition) {
        registry  = address(new AgentRegistry(REGISTRATION_WORKFLOWS, msg.sender));
        condition = address(new KeyringAccessCondition(registry));
        emit RegistryDeployed(msg.sender, registry, condition);
    }
}
