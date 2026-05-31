// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script, console2 } from "forge-std/Script.sol";

/// @notice Minimal read condition — no storage, no external calls.
///         Used to diagnose whether the CDR precompile accepts ANY custom condition.
contract MinimalCondition {
    /// checkReadCondition(address,bytes,bytes) selector = 0x9b3e201d
    function checkReadCondition(
        address,
        bytes calldata,
        bytes calldata
    ) external pure returns (bool) {
        return false; // always deny — just testing CDR validation
    }

    /// ERC-165
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x9b3e201d // ICDRReadCondition
            || interfaceId == 0x01ffc9a7; // IERC165
    }
}

contract DeployMinimalCondition is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        MinimalCondition c = new MinimalCondition();
        vm.stopBroadcast();
        console2.log("MinimalCondition deployed:", address(c));
    }
}
