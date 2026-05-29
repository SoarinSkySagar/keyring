// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { AgentRegistry }  from "../src/AgentRegistry.sol";

/// @notice Fork tests against Aeneid testnet.
///         Run with: forge test --fork-url https://aeneid.storyrpc.io/ -v
contract AgentRegistryTest is Test {
    // Story Protocol Aeneid
    address constant REGISTRATION_WORKFLOWS = 0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424;

    AgentRegistry registry;

    address owner      = makeAddr("owner");
    address agentWallet = makeAddr("agentWallet");

    function setUp() public {
        vm.startPrank(owner);
        registry = new AgentRegistry(REGISTRATION_WORKFLOWS, owner);
        vm.stopPrank();
    }

    // ── createAgent ──────────────────────────────────────────────────────────

    function test_createAgent_registersIpAsset() public {
        vm.prank(owner);
        address ipId = registry.createAgent("TestAgent", agentWallet);

        assertTrue(ipId != address(0), "ipId should be non-zero");

        AgentRegistry.Agent memory agent = registry.getAgent(ipId);
        assertEq(agent.owner,  owner);
        assertEq(agent.wallet, agentWallet);
        assertEq(agent.name,   "TestAgent");
        assertTrue(agent.active);
        assertGt(agent.createdAt, 0);
    }

    function test_createAgent_setsWalletMapping() public {
        vm.prank(owner);
        address ipId = registry.createAgent("TestAgent", agentWallet);

        assertEq(registry.walletToIpId(agentWallet), ipId);
        assertEq(registry.getIpId(agentWallet), ipId);
    }

    function test_createAgent_addsToOwnerList() public {
        vm.prank(owner);
        address ipId = registry.createAgent("TestAgent", agentWallet);

        address[] memory list = registry.getOwnerAgents(owner);
        assertEq(list.length, 1);
        assertEq(list[0], ipId);
    }

    function test_createAgent_revertsOnDuplicateWallet() public {
        vm.startPrank(owner);
        registry.createAgent("Agent1", agentWallet);

        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.AgentAlreadyRegistered.selector, agentWallet));
        registry.createAgent("Agent2", agentWallet);
        vm.stopPrank();
    }

    function test_createAgent_revertsOnZeroWallet() public {
        vm.prank(owner);
        vm.expectRevert(AgentRegistry.ZeroAddress.selector);
        registry.createAgent("Agent", address(0));
    }

    // ── isActiveAgent ────────────────────────────────────────────────────────

    function test_isActiveAgent_trueAfterCreate() public {
        vm.prank(owner);
        address ipId = registry.createAgent("TestAgent", agentWallet);
        assertTrue(registry.isActiveAgent(ipId));
    }

    function test_isActiveAgent_falseForUnknown() public view {
        assertFalse(registry.isActiveAgent(address(0xdead)));
    }

    // ── deactivateAgent ──────────────────────────────────────────────────────

    function test_deactivateAgent_setsActiveFalse() public {
        vm.prank(owner);
        address ipId = registry.createAgent("TestAgent", agentWallet);

        vm.prank(owner);
        registry.deactivateAgent(ipId);

        assertFalse(registry.isActiveAgent(ipId));
    }

    function test_deactivateAgent_revertsIfNotOwner() public {
        vm.prank(owner);
        address ipId = registry.createAgent("TestAgent", agentWallet);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotAgentOwner.selector, ipId));
        registry.deactivateAgent(ipId);
    }

    // ── updateAgentWallet ────────────────────────────────────────────────────

    function test_updateAgentWallet_updatesMapping() public {
        vm.prank(owner);
        address ipId = registry.createAgent("TestAgent", agentWallet);

        address newWallet = makeAddr("newWallet");
        vm.prank(owner);
        registry.updateAgentWallet(ipId, newWallet);

        assertEq(registry.getIpId(agentWallet), address(0), "old wallet cleared");
        assertEq(registry.getIpId(newWallet), ipId, "new wallet set");
        assertEq(registry.getAgent(ipId).wallet, newWallet);
    }

    function test_updateAgentWallet_revertsIfNotOwner() public {
        vm.prank(owner);
        address ipId = registry.createAgent("TestAgent", agentWallet);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotAgentOwner.selector, ipId));
        registry.updateAgentWallet(ipId, makeAddr("newWallet"));
    }
}
