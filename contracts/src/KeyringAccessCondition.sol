// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ICDRReadCondition } from "./interfaces/ICDRReadCondition.sol";
import { IAgentRegistry }    from "./interfaces/IAgentRegistry.sol";

/// @title  KeyringAccessCondition
/// @notice CDR read condition for Keyring. The CDR contract calls checkReadCondition()
///         before releasing partial decryption shares to the requester.
///
/// Unlock conditions (all three must pass):
///   1. caller's wallet maps to a registered, active IP Asset in AgentRegistry
///   2. that IP Asset has an active grant for this vault UUID
///   3. the grant hasn't expired (0 expiry = permanent)
///
/// @dev This contract is intentionally dependency-light — no OZ, no Story imports.
///      It only depends on IAgentRegistry (our own interface) and ICDRReadCondition.
contract KeyringAccessCondition is ICDRReadCondition {
    // ──────────────────────────────────────────────────────────── types ──

    struct Grant {
        bool    active;
        uint256 expiresAt; // unix timestamp; 0 = permanent
    }

    // ─────────────────────────────────────────────────────────────── state ──

    IAgentRegistry public immutable REGISTRY;

    /// uuid → vault owner (set when dashboard allocates the CDR vault)
    mapping(uint32 uuid => address) public vaultOwner;

    /// uuid → ipId → Grant
    mapping(uint32 uuid => mapping(address ipId => Grant)) public grants;

    // ──────────────────────────────────────────────────────────────── events ──

    event VaultRegistered(uint32 indexed uuid, address indexed owner);
    event AccessGranted(uint32 indexed uuid, address indexed ipId, uint256 expiresAt);
    event AccessRevoked(uint32 indexed uuid, address indexed ipId);

    // ──────────────────────────────────────────────────────────────── errors ──

    error NotVaultOwner(uint32 uuid);
    error VaultNotRegistered(uint32 uuid);
    error ZeroAddress();

    // ──────────────────────────────────────────────────── constructor ──

    constructor(address agentRegistry_) {
        if (agentRegistry_ == address(0)) revert ZeroAddress();
        REGISTRY = IAgentRegistry(agentRegistry_);
    }

    // ────────────────────────────────────────────────── external write ──

    /// @notice Called by the dashboard backend after allocating a CDR vault.
    ///         Records msg.sender as the vault owner so they can manage grants.
    function registerVault(uint32 uuid) external {
        // Allow re-registration only by the existing owner (idempotent).
        address existing = vaultOwner[uuid];
        if (existing != address(0) && existing != msg.sender) revert NotVaultOwner(uuid);
        vaultOwner[uuid] = msg.sender;
        emit VaultRegistered(uuid, msg.sender);
    }

    /// @notice Grants an IP Asset (agent) read access to a CDR vault.
    /// @param uuid      The vault UUID.
    /// @param ipId      The agent's Story Protocol ipId.
    /// @param expiresAt Unix timestamp after which access lapses (0 = permanent).
    function grantAccess(uint32 uuid, address ipId, uint256 expiresAt) external {
        _onlyVaultOwner(uuid);
        if (ipId == address(0)) revert ZeroAddress();
        grants[uuid][ipId] = Grant({ active: true, expiresAt: expiresAt });
        emit AccessGranted(uuid, ipId, expiresAt);
    }

    /// @notice Revokes an IP Asset's access to a vault immediately.
    function revokeAccess(uint32 uuid, address ipId) external {
        _onlyVaultOwner(uuid);
        grants[uuid][ipId].active = false;
        emit AccessRevoked(uuid, ipId);
    }

    // ──────────────────────────────── ICDRReadCondition ──

    /// @notice Called by the CDR contract before releasing partial decryptions.
    /// @param uuid    The vault UUID being read.
    /// @param caller  The wallet address that submitted the CDR read request.
    ///
    /// accessAuxData and conditionData are unused — all logic is self-contained.
    function checkReadCondition(
        uint32 uuid,
        bytes calldata, /* accessAuxData */
        bytes calldata, /* conditionData */
        address caller
    ) external view override returns (bool) {
        // Condition 1: caller maps to a registered, active IP Asset
        address ipId = REGISTRY.getIpId(caller);
        if (ipId == address(0))              return false;
        if (!REGISTRY.isActiveAgent(ipId))   return false;

        // Condition 2: IP Asset has an active grant for this vault
        Grant storage g = grants[uuid][ipId];
        if (!g.active) return false;

        // Condition 3: grant hasn't expired
        if (g.expiresAt != 0 && block.timestamp >= g.expiresAt) return false;

        return true;
    }

    // ──────────────────────────────────── internal ──

    function _onlyVaultOwner(uint32 uuid) internal view {
        if (vaultOwner[uuid] == address(0)) revert VaultNotRegistered(uuid);
        if (vaultOwner[uuid] != msg.sender) revert NotVaultOwner(uuid);
    }
}
