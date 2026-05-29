// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test }                    from "forge-std/Test.sol";
import { KeyringAccessCondition }  from "../src/KeyringAccessCondition.sol";
import { IAgentRegistry }          from "../src/interfaces/IAgentRegistry.sol";

/// @notice Unit tests for KeyringAccessCondition with a mock registry.
///         No fork needed — all dependencies are mocked.
contract KeyringAccessConditionTest is Test {
    // ── Mock registry ─────────────────────────────────────────────────────────

    /// Simple mock: caller can configure wallet→ipId and active state.
    MockRegistry mockRegistry;

    KeyringAccessCondition condition;

    address vaultOwner  = makeAddr("vaultOwner");
    address agentWallet = makeAddr("agentWallet");
    address ipId        = makeAddr("ipId");
    uint32  constant UUID = 42;

    function setUp() public {
        mockRegistry = new MockRegistry();
        condition = new KeyringAccessCondition(address(mockRegistry));

        // Register vault
        vm.prank(vaultOwner);
        condition.registerVault(UUID);

        // Wire up mock: agentWallet → ipId, ipId is active
        mockRegistry.setMapping(agentWallet, ipId);
        mockRegistry.setActive(ipId, true);
    }

    // ── checkReadCondition: passing case ─────────────────────────────────────

    function test_check_pass_whenAllConditionsMet() public {
        vm.prank(vaultOwner);
        condition.grantAccess(UUID, ipId, 0); // permanent grant

        bool result = condition.checkReadCondition(UUID, "", "", agentWallet);
        assertTrue(result);
    }

    // ── Condition 1: registered active agent ─────────────────────────────────

    function test_check_fail_walletNotRegistered() public {
        vm.prank(vaultOwner);
        condition.grantAccess(UUID, ipId, 0);

        // agentWallet returns address(0) for unknown wallet
        bool result = condition.checkReadCondition(UUID, "", "", makeAddr("unknownWallet"));
        assertFalse(result);
    }

    function test_check_fail_agentDeactivated() public {
        vm.prank(vaultOwner);
        condition.grantAccess(UUID, ipId, 0);

        mockRegistry.setActive(ipId, false);

        bool result = condition.checkReadCondition(UUID, "", "", agentWallet);
        assertFalse(result);
    }

    // ── Condition 2: active grant ─────────────────────────────────────────────

    function test_check_fail_noGrant() public view {
        // Grant not created — should fail
        bool result = condition.checkReadCondition(UUID, "", "", agentWallet);
        assertFalse(result);
    }

    function test_check_fail_grantRevoked() public {
        vm.prank(vaultOwner);
        condition.grantAccess(UUID, ipId, 0);

        vm.prank(vaultOwner);
        condition.revokeAccess(UUID, ipId);

        bool result = condition.checkReadCondition(UUID, "", "", agentWallet);
        assertFalse(result);
    }

    // ── Condition 3: expiry ──────────────────────────────────────────────────

    function test_check_pass_withinExpiry() public {
        uint256 future = block.timestamp + 1 days;
        vm.prank(vaultOwner);
        condition.grantAccess(UUID, ipId, future);

        bool result = condition.checkReadCondition(UUID, "", "", agentWallet);
        assertTrue(result);
    }

    function test_check_fail_expiredGrant() public {
        uint256 future = block.timestamp + 1 days;
        vm.prank(vaultOwner);
        condition.grantAccess(UUID, ipId, future);

        // Warp past expiry
        vm.warp(block.timestamp + 2 days);

        bool result = condition.checkReadCondition(UUID, "", "", agentWallet);
        assertFalse(result);
    }

    function test_check_pass_permanentGrant_noExpiry() public {
        vm.prank(vaultOwner);
        condition.grantAccess(UUID, ipId, 0); // 0 = permanent

        vm.warp(block.timestamp + 365 days);

        bool result = condition.checkReadCondition(UUID, "", "", agentWallet);
        assertTrue(result);
    }

    // ── grantAccess / revokeAccess ACL ───────────────────────────────────────

    function test_grantAccess_revertsIfNotVaultOwner() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(abi.encodeWithSelector(KeyringAccessCondition.NotVaultOwner.selector, UUID));
        condition.grantAccess(UUID, ipId, 0);
    }

    function test_revokeAccess_revertsIfNotVaultOwner() public {
        vm.prank(vaultOwner);
        condition.grantAccess(UUID, ipId, 0);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(abi.encodeWithSelector(KeyringAccessCondition.NotVaultOwner.selector, UUID));
        condition.revokeAccess(UUID, ipId);
    }

    function test_grantAccess_revertsIfVaultNotRegistered() public {
        uint32 unregistered = 999;
        vm.prank(vaultOwner);
        vm.expectRevert(abi.encodeWithSelector(KeyringAccessCondition.VaultNotRegistered.selector, unregistered));
        condition.grantAccess(unregistered, ipId, 0);
    }

    // ── registerVault ────────────────────────────────────────────────────────

    function test_registerVault_idempotentForSameOwner() public {
        vm.prank(vaultOwner);
        condition.registerVault(UUID); // second call, same owner — should succeed

        assertEq(condition.vaultOwner(UUID), vaultOwner);
    }

    function test_registerVault_revertsIfDifferentOwnerTriesToOverwrite() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(abi.encodeWithSelector(KeyringAccessCondition.NotVaultOwner.selector, UUID));
        condition.registerVault(UUID);
    }
}

// ─────────────────────────────────────────── Mock ──

contract MockRegistry is IAgentRegistry {
    mapping(address wallet => address) private _walletToIpId;
    mapping(address ipId   => bool)    private _active;

    function setMapping(address wallet, address ipId) external {
        _walletToIpId[wallet] = ipId;
    }

    function setActive(address ipId, bool active) external {
        _active[ipId] = active;
    }

    function getIpId(address wallet) external view override returns (address) {
        return _walletToIpId[wallet];
    }

    function isActiveAgent(address ipId) external view override returns (bool) {
        return _active[ipId];
    }
}
