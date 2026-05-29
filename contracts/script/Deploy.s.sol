// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { AgentRegistry }          from "../src/AgentRegistry.sol";
import { KeyringAccessCondition } from "../src/KeyringAccessCondition.sol";

/// @notice Deploys AgentRegistry then KeyringAccessCondition (which depends on registry).
///
/// Usage:
///   forge script script/Deploy.s.sol \
///     --rpc-url https://aeneid.storyrpc.io/ \
///     --broadcast \
///     --private-key $PRIVATE_KEY
contract Deploy is Script {
    // Story Protocol Aeneid testnet
    address constant REGISTRATION_WORKFLOWS = 0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy AgentRegistry — creates the Keyring SPGNFT collection on Story Protocol
        AgentRegistry registry = new AgentRegistry(REGISTRATION_WORKFLOWS, deployer);
        console2.log("AgentRegistry deployed:          ", address(registry));
        console2.log("  SPGNFT collection:             ", registry.spgNft());

        // 2. Deploy KeyringAccessCondition — wired to the registry above
        KeyringAccessCondition condition = new KeyringAccessCondition(address(registry));
        console2.log("KeyringAccessCondition deployed: ", address(condition));

        vm.stopBroadcast();

        // Summary for .env
        console2.log("\n--- Copy to .env ---");
        console2.log("AGENT_REGISTRY_ADDRESS=",    address(registry));
        console2.log("CONDITION_ADDRESS=",         address(condition));
        console2.log("SPGNFT_ADDRESS=",            registry.spgNft());
        console2.log("REGISTRATION_WORKFLOWS=",    REGISTRATION_WORKFLOWS);
    }
}
