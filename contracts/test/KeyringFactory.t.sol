// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test }             from "forge-std/Test.sol";
import { KeyringFactory }   from "../src/KeyringFactory.sol";
import { AgentRegistry }    from "../src/AgentRegistry.sol";
import { KeyringAccessCondition } from "../src/KeyringAccessCondition.sol";

/// @notice Fork test for KeyringFactory. Needs Aeneid RPC.
///         Run: forge test --fork-url https://aeneid.storyrpc.io/ --match-contract KeyringFactoryTest -v
contract KeyringFactoryTest is Test {
    address constant REGISTRATION_WORKFLOWS = 0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424;

    KeyringFactory factory;
    address user = makeAddr("user");

    function setUp() public {
        factory = new KeyringFactory(REGISTRATION_WORKFLOWS);
    }

    function test_deploy_returnsBothAddresses() public {
        vm.prank(user);
        (address registry, address condition) = factory.deploy();

        assertTrue(registry   != address(0), "registry should be non-zero");
        assertTrue(condition  != address(0), "condition should be non-zero");
        assertTrue(registry   != condition,  "addresses should differ");
    }

    function test_deploy_setsOwnership() public {
        vm.prank(user);
        (address registry, ) = factory.deploy();

        assertEq(AgentRegistry(registry).owner(), user, "registry owner should be user");
    }

    function test_deploy_wiresConditionToRegistry() public {
        vm.prank(user);
        (address registry, address condition) = factory.deploy();

        assertEq(
            address(KeyringAccessCondition(condition).REGISTRY()),
            registry,
            "condition registry should match deployed registry"
        );
    }

    function test_deploy_emitsRegistryDeployed() public {
        vm.prank(user);
        vm.expectEmit(true, false, false, false);
        emit KeyringFactory.RegistryDeployed(user, address(0), address(0));
        factory.deploy();
    }

    function test_deploy_differentUsersGetDifferentContracts() public {
        address user2 = makeAddr("user2");

        vm.prank(user);
        (address reg1, address cond1) = factory.deploy();

        vm.prank(user2);
        (address reg2, address cond2) = factory.deploy();

        assertTrue(reg1  != reg2,  "each user gets unique registry");
        assertTrue(cond1 != cond2, "each user gets unique condition");
    }
}
