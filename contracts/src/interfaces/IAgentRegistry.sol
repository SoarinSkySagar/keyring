// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Interface exposed by AgentRegistry for use by KeyringAccessCondition.
interface IAgentRegistry {
    /// @notice Returns the ipId bound to a wallet address (address(0) if not registered).
    function getIpId(address wallet) external view returns (address ipId);

    /// @notice Returns true if the IP Asset is registered and currently active.
    function isActiveAgent(address ipId) external view returns (bool);
}
