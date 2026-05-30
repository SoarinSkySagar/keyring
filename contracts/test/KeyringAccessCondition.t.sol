// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test }                    from "forge-std/Test.sol";
import { KeyringAccessCondition }  from "../src/KeyringAccessCondition.sol";
import { IAgentRegistry }          from "../src/interfaces/IAgentRegistry.sol";

/// @notice Unit tests for KeyringAccessCondition.
///         Uses a mock registry; no fork needed.
contract KeyringAccessConditionTest is Test {
    MockRegistry mockRegistry;
    KeyringAccessCondition condition;

    address vaultOwner  = makeAddr("vaultOwner");
    address agentWallet = makeAddr("agentWallet");
    address ipId        = makeAddr("ipId");

    // secretId is generated client-side before CDR allocation
    bytes32 constant SECRET_ID = keccak256("test-secret");
    bytes   conditionData;     // abi.encode(SECRET_ID) — passed by CDR precompile

    function setUp() public {
        mockRegistry = new MockRegistry();
        condition = new KeyringAccessCondition(address(mockRegistry));

        conditionData = abi.encode(SECRET_ID);

        // Register vault
        vm.prank(vaultOwner);
        condition.registerVault(SECRET_ID);

        // Wire up mock: agentWallet → ipId, ipId is active
        mockRegistry.setMapping(agentWallet, ipId);
        mockRegistry.setActive(ipId, true);
    }

    // ── checkReadCondition: passing case ──────────────────────────────────────

    function test_check_pass_whenAllConditionsMet() public {
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, 0); // permanent

        bool result = condition.checkReadCondition(0, "", conditionData, agentWallet);
        assertTrue(result);
    }

    // ── Condition 0: valid conditionData ─────────────────────────────────────

    function test_check_fail_emptyConditionData() public {
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, 0);

        bool result = condition.checkReadCondition(0, "", "", agentWallet);
        assertFalse(result);
    }

    // ── Condition 1: registered active agent ─────────────────────────────────

    function test_check_fail_walletNotRegistered() public {
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, 0);

        bool result = condition.checkReadCondition(0, "", conditionData, makeAddr("unknownWallet"));
        assertFalse(result);
    }

    function test_check_fail_agentDeactivated() public {
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, 0);

        mockRegistry.setActive(ipId, false);

        bool result = condition.checkReadCondition(0, "", conditionData, agentWallet);
        assertFalse(result);
    }

    // ── Condition 2: active grant ─────────────────────────────────────────────

    function test_check_fail_noGrant() public view {
        bool result = condition.checkReadCondition(0, "", conditionData, agentWallet);
        assertFalse(result);
    }

    function test_check_fail_grantRevoked() public {
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, 0);

        vm.prank(vaultOwner);
        condition.revokeAccess(SECRET_ID, ipId);

        bool result = condition.checkReadCondition(0, "", conditionData, agentWallet);
        assertFalse(result);
    }

    // ── Condition 3: expiry ───────────────────────────────────────────────────

    function test_check_pass_withinExpiry() public {
        uint256 future = block.timestamp + 1 days;
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, future);

        bool result = condition.checkReadCondition(0, "", conditionData, agentWallet);
        assertTrue(result);
    }

    function test_check_fail_expiredGrant() public {
        uint256 future = block.timestamp + 1 days;
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, future);

        vm.warp(block.timestamp + 2 days);

        bool result = condition.checkReadCondition(0, "", conditionData, agentWallet);
        assertFalse(result);
    }

    function test_check_pass_permanentGrant() public {
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, 0);

        vm.warp(block.timestamp + 365 days);

        bool result = condition.checkReadCondition(0, "", conditionData, agentWallet);
        assertTrue(result);
    }

    // ── grantAccess / revokeAccess ACL ────────────────────────────────────────

    function test_grantAccess_revertsIfNotVaultOwner() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(abi.encodeWithSelector(
            KeyringAccessCondition.NotVaultOwner.selector, SECRET_ID
        ));
        condition.grantAccess(SECRET_ID, ipId, 0);
    }

    function test_revokeAccess_revertsIfNotVaultOwner() public {
        vm.prank(vaultOwner);
        condition.grantAccess(SECRET_ID, ipId, 0);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(abi.encodeWithSelector(
            KeyringAccessCondition.NotVaultOwner.selector, SECRET_ID
        ));
        condition.revokeAccess(SECRET_ID, ipId);
    }

    function test_grantAccess_revertsIfVaultNotRegistered() public {
        bytes32 unregistered = keccak256("not-registered");
        vm.prank(vaultOwner);
        vm.expectRevert(abi.encodeWithSelector(
            KeyringAccessCondition.VaultNotRegistered.selector, unregistered
        ));
        condition.grantAccess(unregistered, ipId, 0);
    }

    // ── registerVault ─────────────────────────────────────────────────────────

    function test_registerVault_idempotentForSameOwner() public {
        vm.prank(vaultOwner);
        condition.registerVault(SECRET_ID); // second call, same owner — succeeds

        assertEq(condition.vaultOwner(SECRET_ID), vaultOwner);
    }

    function test_registerVault_revertsIfDifferentOwnerTriesToOverwrite() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(abi.encodeWithSelector(
            KeyringAccessCondition.NotVaultOwner.selector, SECRET_ID
        ));
        condition.registerVault(SECRET_ID);
    }
}

// ─────────────────────────────────────────────────────── Mock ──

contract MockRegistry is IAgentRegistry {
    mapping(address wallet => address) private _walletToIpId;
    mapping(address ipId   => bool)    private _active;

    function setMapping(address wallet, address _ipId) external {
        _walletToIpId[wallet] = _ipId;
    }

    function setActive(address _ipId, bool active) external {
        _active[_ipId] = active;
    }

    function getIpId(address wallet) external view override returns (address) {
        return _walletToIpId[wallet];
    }

    function isActiveAgent(address _ipId) external view override returns (bool) {
        return _active[_ipId];
    }
}
