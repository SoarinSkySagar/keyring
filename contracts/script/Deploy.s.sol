// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { KeyringFactory }   from "../src/KeyringFactory.sol";

/// @notice Deploys KeyringFactory (once, by Keyring team).
///         Each user deploys their own AgentRegistry + KeyringAccessCondition
///         by calling KeyringFactory.deploy() from their smart wallet.
///
/// Usage:
///   forge script script/Deploy.s.sol \
///     --rpc-url https://aeneid.storyrpc.io/ \
///     --broadcast \
///     --private-key $PRIVATE_KEY
contract Deploy is Script {
    address constant REGISTRATION_WORKFLOWS = 0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        KeyringFactory factory = new KeyringFactory(REGISTRATION_WORKFLOWS);
        vm.stopBroadcast();

        console2.log("KeyringFactory deployed:", address(factory));
        console2.log("\n--- Copy to client/.env ---");
        console2.log("NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS=", address(factory));
    }
}
